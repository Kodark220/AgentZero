import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

// The SDK brands Address as `0x${string}` & { length: 42 }, so we force-cast once here.
const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ?? '') as unknown as `0x${string}` & { length: 42 };

const chain = testnetBradbury;

type Client = ReturnType<typeof createClient>;

export function getClient(account?: string) {
  return createClient({
    chain,
    ...(account ? { account: account as `0x${string}` } : {}),
  });
}

// ── Read operations ──

export async function getAllAgents(client: Client) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_all_agents',
    args: [],
  });
}

export async function getAgent(client: Client, agentId: number) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_agent',
    args: [agentId],
  });
}

export async function getAllTasks(client: Client) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_all_tasks',
    args: [],
  });
}

export async function getTask(client: Client, taskId: number) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_task',
    args: [taskId],
  });
}

export async function getAgentCount(client: Client) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_agent_count',
    args: [],
  });
}

export async function getTaskCount(client: Client) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_task_count',
    args: [],
  });
}

// ── Write operations ──

async function writeTx(
  client: Client,
  functionName: string,
  args: (string | number | bigint)[],
  value = BigInt(0),
) {
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
  });
  return receipt;
}

export async function registerAgent(
  client: Client,
  name: string,
  description: string,
  endpoint: string,
  capabilities: string,
  providerType: string,
) {
  return writeTx(client, 'register_agent', [name, description, endpoint, capabilities, providerType]);
}

export async function updateAgent(
  client: Client,
  name: string,
  description: string,
  endpoint: string,
  capabilities: string,
) {
  return writeTx(client, 'update_agent', [name, description, endpoint, capabilities]);
}

export async function createTask(
  client: Client,
  description: string,
  requiredCapability: string,
  preferredProvider: string,
) {
  return writeTx(client, 'create_task', [description, requiredCapability, preferredProvider]);
}

export async function matchAgentToTask(client: Client, taskId: number) {
  return writeTx(client, 'match_agent_to_task', [taskId]);
}

export async function acceptTask(client: Client, taskId: number) {
  return writeTx(client, 'accept_task', [taskId]);
}

export async function submitResult(client: Client, taskId: number, result: string) {
  return writeTx(client, 'submit_result', [taskId, result]);
}

export async function approveResult(client: Client, taskId: number) {
  return writeTx(client, 'approve_result', [taskId]);
}

export async function disputeResult(client: Client, taskId: number, reason: string) {
  return writeTx(client, 'dispute_result', [taskId, reason]);
}

export async function resolveDispute(client: Client, taskId: number) {
  return writeTx(client, 'resolve_dispute', [taskId]);
}

export async function auditAgent(client: Client, agentId: number) {
  return writeTx(client, 'audit_agent', [agentId]);
}

export { CONTRACT_ADDRESS };
