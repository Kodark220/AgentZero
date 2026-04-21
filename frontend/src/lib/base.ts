import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { AGENT_ZERO_BASE_ABI } from './abi';

const CONTRACT_ADDRESS = (import.meta.env.VITE_BASE_CONTRACT_ADDRESS ?? '') as `0x${string}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BasePublicClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BaseWalletClient = any;

export function getBasePublicClient(): BasePublicClient {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });
}

export function getBaseWalletClient(account: `0x${string}`): BaseWalletClient {
  const eth = (window as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  if (!eth) throw new Error('No wallet found');
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: custom(eth as Parameters<typeof custom>[0]),
  });
}

// ── Read operations ──

export async function getAllAgents(publicClient: BasePublicClient) {
  const count = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: AGENT_ZERO_BASE_ABI,
    functionName: 'getAgentCount',
  });
  const total = Number(count);
  const agents = [];
  for (let i = 1; i <= total; i++) {
    const agent = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: AGENT_ZERO_BASE_ABI,
      functionName: 'getAgent',
      args: [i],
    });
    agents.push({
      id: i,
      owner: agent.owner,
      name: agent.name,
      description: agent.description,
      endpoint: agent.endpoint,
      capabilities: agent.capabilities,
      provider_type: agent.providerType,
      trust_score: Number(agent.trustScore),
      total_tasks: Number(agent.totalTasks),
      successful_tasks: Number(agent.successfulTasks),
      active: agent.active,
    });
  }
  return agents;
}

export async function getAgent(publicClient: BasePublicClient, agentId: number) {
  const agent = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: AGENT_ZERO_BASE_ABI,
    functionName: 'getAgent',
    args: [agentId],
  });
  return {
    id: agentId,
    owner: agent.owner,
    name: agent.name,
    description: agent.description,
    endpoint: agent.endpoint,
    capabilities: agent.capabilities,
    provider_type: agent.providerType,
    trust_score: Number(agent.trustScore),
    total_tasks: Number(agent.totalTasks),
    successful_tasks: Number(agent.successfulTasks),
    active: agent.active,
  };
}

export async function getAllTasks(publicClient: BasePublicClient) {
  const count = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: AGENT_ZERO_BASE_ABI,
    functionName: 'getTaskCount',
  });
  const total = Number(count);
  const tasks = [];
  for (let i = 1; i <= total; i++) {
    const task = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: AGENT_ZERO_BASE_ABI,
      functionName: 'getTask',
      args: [i],
    });
    tasks.push({
      task_id: Number(task.taskId),
      requester: task.requester,
      description: task.description,
      required_capability: task.requiredCapability,
      assigned_agent_id: Number(task.assignedAgentId),
      status: task.status,
      result: task.result,
      creator_type: task.creatorType,
      preferred_provider: task.preferredProvider,
    });
  }
  return tasks;
}

export async function getTask(publicClient: BasePublicClient, taskId: number) {
  const task = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: AGENT_ZERO_BASE_ABI,
    functionName: 'getTask',
    args: [taskId],
  });
  return {
    task_id: Number(task.taskId),
    requester: task.requester,
    description: task.description,
    required_capability: task.requiredCapability,
    assigned_agent_id: Number(task.assignedAgentId),
    status: task.status,
    result: task.result,
    creator_type: task.creatorType,
    preferred_provider: task.preferredProvider,
  };
}

export async function getAgentCount(publicClient: BasePublicClient) {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: AGENT_ZERO_BASE_ABI,
    functionName: 'getAgentCount',
  });
}

export async function getTaskCount(publicClient: BasePublicClient) {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: AGENT_ZERO_BASE_ABI,
    functionName: 'getTaskCount',
  });
}

// ── Write operations ──

async function writeTx(
  walletClient: BaseWalletClient,
  publicClient: BasePublicClient,
  functionName: string,
  args: unknown[],
  value?: bigint,
) {
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: AGENT_ZERO_BASE_ABI,
    functionName,
    args,
    ...(value ? { value } : {}),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
}

export async function registerAgent(
  walletClient: BaseWalletClient,
  publicClient: BasePublicClient,
  name: string,
  description: string,
  endpoint: string,
  capabilities: string,
  providerType: string,
) {
  return writeTx(walletClient, publicClient, 'registerAgent', [name, description, endpoint, capabilities, providerType]);
}

export async function updateAgent(
  walletClient: BaseWalletClient,
  publicClient: BasePublicClient,
  name: string,
  description: string,
  endpoint: string,
  capabilities: string,
) {
  return writeTx(walletClient, publicClient, 'updateAgent', [name, description, endpoint, capabilities]);
}

export async function createTask(
  walletClient: BaseWalletClient,
  publicClient: BasePublicClient,
  description: string,
  requiredCapability: string,
  preferredProvider: string,
) {
  return writeTx(walletClient, publicClient, 'createTask', [description, requiredCapability, preferredProvider]);
}

export async function acceptTask(
  walletClient: BaseWalletClient,
  publicClient: BasePublicClient,
  taskId: number,
) {
  return writeTx(walletClient, publicClient, 'acceptTask', [taskId]);
}

export async function submitResult(
  walletClient: BaseWalletClient,
  publicClient: BasePublicClient,
  taskId: number,
  result: string,
) {
  return writeTx(walletClient, publicClient, 'submitResult', [taskId, result]);
}

export async function approveResult(
  walletClient: BaseWalletClient,
  publicClient: BasePublicClient,
  taskId: number,
) {
  return writeTx(walletClient, publicClient, 'approveResult', [taskId]);
}

export async function disputeResult(
  walletClient: BaseWalletClient,
  publicClient: BasePublicClient,
  taskId: number,
) {
  return writeTx(walletClient, publicClient, 'disputeResult', [taskId]);
}

// ── AI operations (bridged to GenLayer) ──

export async function requestMatch(
  walletClient: BaseWalletClient,
  publicClient: BasePublicClient,
  taskId: number,
) {
  return writeTx(walletClient, publicClient, 'requestMatch', [taskId, '0x'], BigInt(0));
}

export async function requestDisputeResolution(
  walletClient: BaseWalletClient,
  publicClient: BasePublicClient,
  taskId: number,
) {
  return writeTx(walletClient, publicClient, 'requestDisputeResolution', [taskId, '0x'], BigInt(0));
}

export async function requestAudit(
  walletClient: BaseWalletClient,
  publicClient: BasePublicClient,
  agentId: number,
) {
  return writeTx(walletClient, publicClient, 'requestAudit', [agentId, '0x'], BigInt(0));
}

export { CONTRACT_ADDRESS as BASE_CONTRACT_ADDRESS };
