import { createContext, useContext } from 'react';

export type AppMode = 'genlayer' | 'base';

export interface MarketplaceAPI {
  mode: AppMode;
  ready: boolean;
  getAllAgents(): Promise<unknown>;
  getAgent(agentId: number): Promise<unknown>;
  getAllTasks(): Promise<unknown>;
  getTask(taskId: number): Promise<unknown>;
  getAgentCount(): Promise<unknown>;
  getTaskCount(): Promise<unknown>;
  registerAgent(name: string, description: string, endpoint: string, capabilities: string, providerType: string): Promise<unknown>;
  updateAgent(name: string, description: string, endpoint: string, capabilities: string): Promise<unknown>;
  createTask(description: string, requiredCapability: string, preferredProvider: string): Promise<unknown>;
  matchAgentToTask(taskId: number): Promise<unknown>;
  acceptTask(taskId: number): Promise<unknown>;
  submitResult(taskId: number, result: string): Promise<unknown>;
  approveResult(taskId: number): Promise<unknown>;
  disputeResult(taskId: number, reason: string): Promise<unknown>;
  resolveDispute(taskId: number): Promise<unknown>;
  auditAgent(agentId: number): Promise<unknown>;
}

interface ModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  api: MarketplaceAPI | null;
  walletAddress: string | null;
}

export const ModeContext = createContext<ModeContextValue>({
  mode: 'genlayer',
  setMode: () => {},
  api: null,
  walletAddress: null,
});

export function useMode() {
  return useContext(ModeContext);
}

export function useMarketplace() {
  const { api } = useContext(ModeContext);
  if (!api) throw new Error('MarketplaceAPI not initialized');
  return api;
}
