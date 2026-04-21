import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAccount, createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

function readEnvValue(name) {
  const envPath = resolve(process.cwd(), '.env');
  const content = readFileSync(envPath, 'utf8');
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : '';
}

const CONTRACT = readEnvValue('VITE_CONTRACT_ADDRESS');
if (!CONTRACT) throw new Error('Missing VITE_CONTRACT_ADDRESS in .env');

const PK = readEnvValue('BRADBURY_WRITE_PRIVATE_KEY');
if (!PK) {
  throw new Error('Missing BRADBURY_WRITE_PRIVATE_KEY in .env for write:bradbury-task');
}

const account = createAccount(PK);
const client = createClient({ chain: testnetBradbury, account });

// Read task count before
const taskCountBefore = await client.readContract({
  address: CONTRACT,
  functionName: 'get_task_count',
  args: [],
});
console.log('Task count before:', Number(taskCountBefore));

// Write: create_task
console.log('Sending create_task transaction…');
const hash = await client.writeContract({
  address: CONTRACT,
  functionName: 'create_task',
  args: ['Build a sentiment analysis pipeline', 'coding', 'any'],
});
console.log('Tx hash:', hash);

// Poll for receipt
console.log('Waiting for receipt…');
let receipt = null;
for (let i = 0; i < 30; i++) {
  try {
    receipt = await client.getTransactionReceipt({ hash });
    if (receipt) break;
  } catch {
    // not mined yet
  }
  await new Promise((r) => setTimeout(r, 4000));
}

if (!receipt) {
  console.log('Transaction still pending after 2 minutes. Check hash above on Bradbury explorer.');
  process.exit(0);
}

console.log('Receipt status:', receipt.status);

// Read task count after
const taskCountAfter = await client.readContract({
  address: CONTRACT,
  functionName: 'get_task_count',
  args: [],
});
console.log('Task count after:', Number(taskCountAfter));
