import { type createClient } from 'genlayer-js';
import * as gl from './genlayer';
import * as base from './base';
import type { MarketplaceAPI, AppMode } from '../context/ModeContext';

type GLClient = ReturnType<typeof createClient>;

export function createGenLayerAPI(client: GLClient): MarketplaceAPI {
  return {
    mode: 'genlayer' as AppMode,
    ready: true,
    getAllAgents: () => gl.getAllAgents(client),
    getAgent: (id) => gl.getAgent(client, id),
    getAllTasks: () => gl.getAllTasks(client),
    getTask: (id) => gl.getTask(client, id),
    getAgentCount: () => gl.getAgentCount(client),
    getTaskCount: () => gl.getTaskCount(client),
    registerAgent: (name, desc, endpoint, caps, type) => gl.registerAgent(client, name, desc, endpoint, caps, type),
    updateAgent: (name, desc, endpoint, caps) => gl.updateAgent(client, name, desc, endpoint, caps),
    createTask: (desc, cap, pref) => gl.createTask(client, desc, cap, pref),
    matchAgentToTask: (taskId) => gl.matchAgentToTask(client, taskId),
    acceptTask: (taskId) => gl.acceptTask(client, taskId),
    submitResult: (taskId, result) => gl.submitResult(client, taskId, result),
    approveResult: (taskId) => gl.approveResult(client, taskId),
    disputeResult: (taskId, reason) => gl.disputeResult(client, taskId, reason),
    resolveDispute: (taskId) => gl.resolveDispute(client, taskId),
    auditAgent: (agentId) => gl.auditAgent(client, agentId),
  };
}

export function createBaseAPI(
  walletClient: base.BaseWalletClient | null,
  publicClient: base.BasePublicClient,
): MarketplaceAPI {
  const requireWallet = () => {
    if (!walletClient) throw new Error('Wallet not connected');
    return walletClient;
  };

  return {
    mode: 'base' as AppMode,
    ready: true,
    getAllAgents: () => base.getAllAgents(publicClient),
    getAgent: (id) => base.getAgent(publicClient, id),
    getAllTasks: () => base.getAllTasks(publicClient),
    getTask: (id) => base.getTask(publicClient, id),
    getAgentCount: () => base.getAgentCount(publicClient),
    getTaskCount: () => base.getTaskCount(publicClient),
    registerAgent: (name, desc, endpoint, caps, type) => base.registerAgent(requireWallet(), publicClient, name, desc, endpoint, caps, type),
    updateAgent: (name, desc, endpoint, caps) => base.updateAgent(requireWallet(), publicClient, name, desc, endpoint, caps),
    createTask: (desc, cap, pref) => base.createTask(requireWallet(), publicClient, desc, cap, pref),
    matchAgentToTask: (taskId) => base.requestMatch(requireWallet(), publicClient, taskId),
    acceptTask: (taskId) => base.acceptTask(requireWallet(), publicClient, taskId),
    submitResult: (taskId, result) => base.submitResult(requireWallet(), publicClient, taskId, result),
    approveResult: (taskId) => base.approveResult(requireWallet(), publicClient, taskId),
    disputeResult: (taskId) => base.disputeResult(requireWallet(), publicClient, taskId),
    resolveDispute: (taskId) => base.requestDisputeResolution(requireWallet(), publicClient, taskId),
    auditAgent: (agentId) => base.requestAudit(requireWallet(), publicClient, agentId),
  };
}
