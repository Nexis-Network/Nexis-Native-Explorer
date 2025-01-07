import { EpochInfo, PerfSample } from "@nexis-ai/web3";
import { ClusterStatsStatus } from "./nexisClusterStats";

export enum DashboardInfoActionType {
  Reset,
  SetError,
  SetEpochInfo,
  SetLastBlockTime,
  SetPerfSamples,
  SetSupplyInfo,
}

export interface SupplyInfo {
  totalSupply: number;
  circulatingSupply: number;
  nonCirculatingSupply: number;
}

export interface DashboardInfo {
  status: ClusterStatsStatus;
  avgSlotTime_1h: number;
  avgSlotTime_1min: number;
  epochInfo: EpochInfo;
  blockTime?: number;
  lastBlockTime?: BlockTimeInfo;
  supplyInfo?: SupplyInfo;
}

export type BlockTimeInfo = {
  blockTime: number;
  slot: number;
};

export type DashboardInfoActionSetPerfSamples = {
  type: DashboardInfoActionType.SetPerfSamples;
  data: PerfSample[];
};

export type DashboardInfoActionSetEpochInfo = {
  type: DashboardInfoActionType.SetEpochInfo;
  data: EpochInfo;
};

export type DashboardInfoActionReset = {
  type: DashboardInfoActionType.Reset;
  data: DashboardInfo;
};

export type DashboardInfoActionSetError = {
  type: DashboardInfoActionType.SetError;
  data: string;
};

export type DashboardInfoActionSetLastBlockTime = {
  type: DashboardInfoActionType.SetLastBlockTime;
  data: BlockTimeInfo;
};

export type DashboardInfoActionSetSupplyInfo = {
  type: DashboardInfoActionType.SetSupplyInfo;
  data: SupplyInfo;
};

export type DashboardInfoAction =
  | DashboardInfoActionSetPerfSamples
  | DashboardInfoActionSetEpochInfo
  | DashboardInfoActionReset
  | DashboardInfoActionSetError
  | DashboardInfoActionSetLastBlockTime
  | DashboardInfoActionSetSupplyInfo;

export function dashboardInfoReducer(
  state: DashboardInfo,
  action: DashboardInfoAction
) {
  switch (action.type) {
    case DashboardInfoActionType.SetLastBlockTime: {
      const blockTime = state.blockTime || action.data.blockTime;
      return {
        ...state,
        lastBlockTime: action.data,
        blockTime,
      };
    }

    case DashboardInfoActionType.SetPerfSamples: {
      if (action.data.length < 1) {
        return state;
      }

      const samples = action.data
        .filter((sample) => {
          return sample.numSlots !== 0;
        })
        .map((sample) => {
          return sample.samplePeriodSecs / sample.numSlots;
        })
        .slice(0, 60);

      const samplesInHour = samples.length < 60 ? samples.length : 60;
      const avgSlotTime_1h =
        samples.reduce((sum: number, cur: number) => {
          return sum + cur;
        }, 0) / samplesInHour;

      const status =
        state.epochInfo.absoluteSlot !== 0
          ? ClusterStatsStatus.Ready
          : ClusterStatsStatus.Loading;

      return {
        ...state,
        avgSlotTime_1h,
        avgSlotTime_1min: samples[0],
        status,
      };
    }

    case DashboardInfoActionType.SetEpochInfo: {
      const status =
        state.avgSlotTime_1h !== 0
          ? ClusterStatsStatus.Ready
          : ClusterStatsStatus.Loading;

      let blockTime = state.blockTime;

      // interpolate blocktime based on last known blocktime and average slot time
      if (
        state.lastBlockTime &&
        state.avgSlotTime_1h !== 0 &&
        action.data.absoluteSlot >= state.lastBlockTime.slot
      ) {
        blockTime =
          state.lastBlockTime.blockTime +
          (action.data.absoluteSlot - state.lastBlockTime.slot) *
            Math.floor(state.avgSlotTime_1h * 1000);
      }

      return {
        ...state,
        epochInfo: action.data,
        status,
        blockTime,
      };
    }

    case DashboardInfoActionType.SetError:
      return {
        ...state,
        status: ClusterStatsStatus.Error,
      };

    case DashboardInfoActionType.Reset:
      return {
        ...action.data,
      };

    case DashboardInfoActionType.SetSupplyInfo: {
      if (state.status === ClusterStatsStatus.Error) return state;
      const supplyInfo = action.data as SupplyInfo;
      return {
        ...state,
        status: ClusterStatsStatus.Ready,
        supplyInfo,
      };
    }

    default:
      return state;
  }
}
