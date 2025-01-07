import React from "react";
import { SolanaClusterStatsProvider } from "./nexisClusterStats";

type Props = { children: React.ReactNode };
export function StatsProvider({ children }: Props) {
  return <SolanaClusterStatsProvider>{children}</SolanaClusterStatsProvider>;
}
