import React from "react";
import { Connection } from "@nexis-ai/web3";
import { useCluster } from "providers/cluster";
import {
  DashboardInfo,
  DashboardInfoActionType,
  DashboardInfoAction,
  dashboardInfoReducer,
} from "./nexisDashboardInfo";
import {
  PerformanceInfo,
  PerformanceInfoActionType,
  PerformanceInfoAction,
  performanceInfoReducer,
} from "./nexisPerformanceInfo";

export const PERF_UPDATE_SEC = 5;
export const SAMPLE_HISTORY_HOURS = 6;
export const PERFORMANCE_SAMPLE_INTERVAL = 30000;
export const TRANSACTION_COUNT_INTERVAL = 10000;
export const EPOCH_INFO_INTERVAL = 5000;
export const BLOCK_TIME_INTERVAL = 5000;
export const LOADING_TIMEOUT = 10000;

export enum ClusterStatsStatus {
  Loading,
  Ready,
  Error,
}

const initialPerformanceInfo: PerformanceInfo = {
  status: ClusterStatsStatus.Loading,
  avgTps: 0,
  historyMaxTps: 0,
  perfHistory: {
    short: [],
    medium: [],
    long: [],
  },
  transactionCount: 0,
};

const initialDashboardInfo: DashboardInfo = {
  status: ClusterStatsStatus.Loading,
  avgSlotTime_1h: 0,
  avgSlotTime_1min: 0,
  epochInfo: {
    absoluteSlot: 0,
    blockHeight: 0,
    epoch: 0,
    slotIndex: 0,
    slotsInEpoch: 0,
  },
};

type SetActive = React.Dispatch<React.SetStateAction<boolean>>;
const StatsProviderContext = React.createContext<{
  setActive: SetActive;
  setTimedOut: Function;
  retry: Function;
  active: boolean;
} | undefined>(undefined);

type DashboardState = { info: DashboardInfo };
const DashboardContext = React.createContext<DashboardState | undefined>(undefined);

type PerformanceState = { info: PerformanceInfo };
const PerformanceContext = React.createContext<PerformanceState | undefined>(undefined);

type Props = { children: React.ReactNode };

export function SolanaClusterStatsProvider({ children }: Props) {
  const { cluster, url } = useCluster();
  const [active, setActive] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 2000;
  
  const [dashboardInfo, dispatchDashboardInfo] = React.useReducer<
    React.Reducer<DashboardInfo, DashboardInfoAction>
  >(dashboardInfoReducer, initialDashboardInfo);
  const [performanceInfo, dispatchPerformanceInfo] = React.useReducer<
    React.Reducer<PerformanceInfo, PerformanceInfoAction>
  >(performanceInfoReducer, initialPerformanceInfo);

  const resetData = React.useCallback(() => {
    dispatchDashboardInfo({
      type: DashboardInfoActionType.Reset,
      data: initialDashboardInfo,
    });
    dispatchPerformanceInfo({
      type: PerformanceInfoActionType.Reset,
      data: initialPerformanceInfo,
    });
  }, []);

  const setError = React.useCallback((error: string) => {
    dispatchDashboardInfo({
      type: DashboardInfoActionType.SetError,
      data: error,
    });
    dispatchPerformanceInfo({
      type: PerformanceInfoActionType.SetError,
      data: error,
    });
  }, []);

  const fetchInitialData = React.useCallback(async (connection: Connection) => {
    try {
      const commitment = 'confirmed' as const;
      const [epochInfo, transactionCount, supply] = await Promise.all([
        connection.getEpochInfo(commitment),
        connection.getTransactionCount(commitment),
        connection.getSupply(commitment),
      ]);

      // Update epoch info
      dispatchDashboardInfo({
        type: DashboardInfoActionType.SetEpochInfo,
        data: epochInfo,
      });

      // Update transaction count
      dispatchPerformanceInfo({
        type: PerformanceInfoActionType.SetTransactionCount,
        data: transactionCount,
      });

      // Update supply info
      if (supply && supply.value) {
        dispatchDashboardInfo({
          type: DashboardInfoActionType.SetSupplyInfo,
          data: {
            totalSupply: supply.value.total,
            circulatingSupply: supply.value.circulating,
            nonCirculatingSupply: supply.value.nonCirculating,
          },
        });
      }

      // Performance samples are not supported in this version
      dispatchPerformanceInfo({
        type: PerformanceInfoActionType.SetPerfSamples,
        data: [],
      });
      dispatchDashboardInfo({
        type: DashboardInfoActionType.SetPerfSamples,
        data: [],
      });
    } catch (error) {
      console.warn("Initial data fetch error:", error);
      throw error;
    }
  }, []);

  const startPolling = React.useCallback((connection: Connection) => {
    const commitment = 'confirmed' as const;

    const fetchTransactionCount = async () => {
      try {
        const count = await connection.getTransactionCount(commitment);
        dispatchPerformanceInfo({
          type: PerformanceInfoActionType.SetTransactionCount,
          data: count,
        });
      } catch (error) {
        console.warn("Transaction count fetch error:", error);
      }
    };

    const fetchEpochInfo = async () => {
      try {
        const info = await connection.getEpochInfo(commitment);
        dispatchDashboardInfo({
          type: DashboardInfoActionType.SetEpochInfo,
          data: info,
        });
      } catch (error) {
        console.warn("Epoch info fetch error:", error);
      }
    };

    const fetchBlockTime = async () => {
      try {
        const slot = (await connection.getEpochInfo(commitment)).absoluteSlot;
        const blockTime = await connection.getBlockTime(slot);
        if (blockTime === null) return;

        dispatchDashboardInfo({
          type: DashboardInfoActionType.SetLastBlockTime,
          data: {
            slot,
            blockTime: blockTime * 1000,
          },
        });
      } catch (error) {
        console.warn("Block time fetch error:", error);
      }
    };

    const intervals = [
      setInterval(fetchTransactionCount, TRANSACTION_COUNT_INTERVAL),
      setInterval(fetchEpochInfo, EPOCH_INFO_INTERVAL),
      setInterval(fetchBlockTime, BLOCK_TIME_INTERVAL),
    ];

    return () => intervals.forEach(clearInterval);
  }, []);

  React.useEffect(() => {
    if (!active || !url) return;

    let connection: Connection | undefined;
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout;
    let cleanupPolling: (() => void) | undefined;

    const initConnection = async () => {
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      try {
        let too_many_requests_retries = 5;
        let waitTime = 500;
        let testConnection: Connection | undefined;
        
        for (;;) {
          try {
            // Try HTTPS first, fallback to HTTP if needed
            const endpoint = url.startsWith('https') ? url : url.replace('http', 'https');
            const wsEndpoint = endpoint.replace('https', 'wss');
            
            testConnection = new Connection(endpoint, {
              commitment: 'confirmed',
              wsEndpoint,
              disableRetryOnRateLimit: false,
            });
            
            // Test connection with a simple call
            await testConnection.getEpochInfo('confirmed');
            break;
          } catch (e: any) {
            // Check if it's a rate limit error
            if (e.statusCode === 429) {
              too_many_requests_retries -= 1;
              if (too_many_requests_retries === 0) {
                throw new Error("Too many rate limit retries");
              }
              console.log(
                `Rate limit exceeded. Retrying after ${waitTime}ms delay...`,
              );
              await sleep(waitTime);
              waitTime *= 2;
              continue;
            }
            
            // If HTTPS fails, try HTTP
            if (url.startsWith('https')) {
              console.warn("HTTPS connection failed, trying HTTP...");
              const httpEndpoint = url.replace('https', 'http');
              const wsHttpEndpoint = httpEndpoint.replace('http', 'ws');
              
              testConnection = new Connection(httpEndpoint, {
                commitment: 'confirmed',
                wsEndpoint: wsHttpEndpoint,
                disableRetryOnRateLimit: false,
              });
              
              try {
                await testConnection.getEpochInfo('confirmed');
                break;
              } catch (httpError) {
                throw httpError;
              }
            } else {
              throw e;
            }
          }
        }
        
        if (!isMounted || !testConnection) return;
        connection = testConnection;
        setRetryCount(0);
        
        await fetchInitialData(connection);
        if (!isMounted) return;
        cleanupPolling = startPolling(connection);
      } catch (error) {
        console.warn("Connection initialization error:", error);
        if (!isMounted) return;

        if (retryCount < MAX_RETRIES) {
          retryTimeout = setTimeout(() => {
            if (isMounted) {
              setRetryCount(count => count + 1);
              setActive(true);
            }
          }, RETRY_DELAY * (retryCount + 1));
        } else {
          setError("Failed to connect to cluster. Please check your network connection and try again.");
          setActive(false);
        }
      }
    };

    initConnection();

    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (cleanupPolling) cleanupPolling();
    };
  }, [active, cluster, url, retryCount, setError, fetchInitialData, startPolling]);

  // Reset when cluster changes
  React.useEffect(() => {
    resetData();
  }, [url, resetData]);

  const setTimedOut = React.useCallback(() => {
    setError("Cluster stats timed out");
    setActive(false);
  }, [setError]);

  const retry = React.useCallback(() => {
    resetData();
    setRetryCount(0);
    setActive(true);
  }, [resetData]);

  return (
    <StatsProviderContext.Provider
      value={{ setActive, setTimedOut, retry, active }}
    >
      <DashboardContext.Provider value={{ info: dashboardInfo }}>
        <PerformanceContext.Provider value={{ info: performanceInfo }}>
          {children}
        </PerformanceContext.Provider>
      </DashboardContext.Provider>
    </StatsProviderContext.Provider>
  );
}

export function useStatsProvider() {
  const context = React.useContext(StatsProviderContext);
  if (!context) {
    throw new Error(`useContext must be used within a StatsProvider`);
  }
  return context;
}

export function useDashboardInfo() {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error(`useDashboardInfo must be used within a StatsProvider`);
  }
  return context.info;
}

export function usePerformanceInfo() {
  const context = React.useContext(PerformanceContext);
  if (!context) {
    throw new Error(`usePerformanceInfo must be used within a StatsProvider`);
  }
  return context.info;
}
