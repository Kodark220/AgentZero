import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

function readEnvValue(name) {
  const envPath = resolve(process.cwd(), '.env');
  const content = readFileSync(envPath, 'utf8');
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));

  return line ? line.slice(name.length + 1).trim() : '';
}

const contractAddress = readEnvValue('VITE_CONTRACT_ADDRESS');
const rpcUrl = 'https://rpc-bradbury.genlayer.com';

if (!contractAddress) {
  throw new Error('Missing VITE_CONTRACT_ADDRESS in frontend/.env');
}

const client = createClient({ chain: testnetBradbury });

const syncingBody = {
  jsonrpc: '2.0',
  method: 'gen_syncing',
  params: [],
  id: 1,
};

const response = await fetch(rpcUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(syncingBody),
});

if (!response.ok) {
  throw new Error(`Bradbury RPC request failed with ${response.status}`);
}

const syncing = await response.json();
const [agentCount, taskCount, agents] = await Promise.all([
  client.readContract({
    address: contractAddress,
    functionName: 'get_agent_count',
    args: [],
  }),
  client.readContract({
    address: contractAddress,
    functionName: 'get_task_count',
    args: [],
  }),
  client.readContract({
    address: contractAddress,
    functionName: 'get_all_agents',
    args: [],
  }),
]);

console.log(
  JSON.stringify(
    {
      network: 'testnet-bradbury',
      contractAddress,
      syncing: syncing.result,
      agentCount: Number(agentCount),
      taskCount: Number(taskCount),
      agents,
    },
    null,
    2,
  ),
);