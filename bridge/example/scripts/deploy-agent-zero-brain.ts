import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const {
  GENLAYER_RPC_URL = "https://studio.genlayer.com/api",
  PRIVATE_KEY,
  BRIDGE_RECEIVER_IC_ADDRESS,
  GL_BRIDGE_SENDER_ADDRESS,
  AGENT_ZERO_BASE_ADDRESS,
} = process.env;

// Base Sepolia LayerZero endpoint ID
const TARGET_CHAIN_EID = 40245;

async function main() {
  if (!PRIVATE_KEY || !BRIDGE_RECEIVER_IC_ADDRESS || !GL_BRIDGE_SENDER_ADDRESS || !AGENT_ZERO_BASE_ADDRESS) {
    console.error("Missing required env vars. Need: PRIVATE_KEY, BRIDGE_RECEIVER_IC_ADDRESS, GL_BRIDGE_SENDER_ADDRESS, AGENT_ZERO_BASE_ADDRESS");
    process.exit(1);
  }

  console.log("Deploying AgentZeroBrain to GenLayer Studio...");
  console.log("  Bridge Receiver IC:", BRIDGE_RECEIVER_IC_ADDRESS);
  console.log("  Bridge Sender IC:", GL_BRIDGE_SENDER_ADDRESS);
  console.log("  Target Chain EID:", TARGET_CHAIN_EID);
  console.log("  Target Contract (Base):", AGENT_ZERO_BASE_ADDRESS);

  // Read the contract source
  const fs = await import("fs");
  const path = await import("path");
  const contractPath = path.resolve(__dirname, "../../intelligent-contracts/AgentZeroBrain.py");
  const contractCode = fs.readFileSync(contractPath, "utf-8");

  // Deploy via GenLayer RPC
  const response = await fetch(`${GENLAYER_RPC_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_sendRawTransaction",
      params: [
        {
          type: "deploy",
          code: contractCode,
          args: [
            BRIDGE_RECEIVER_IC_ADDRESS,
            GL_BRIDGE_SENDER_ADDRESS,
            TARGET_CHAIN_EID,
            AGENT_ZERO_BASE_ADDRESS,
          ],
          from: PRIVATE_KEY,
        },
      ],
      id: 1,
    }),
  });

  const result = await response.json();
  console.log("\nDeploy result:", JSON.stringify(result, null, 2));
  console.log("\nNote: For Studio deployment, use the GenLayer CLI or Studio UI instead:");
  console.log("  npx genlayer deploy contracts/AgentZeroBrain.py \\");
  console.log(`    --args '["${BRIDGE_RECEIVER_IC_ADDRESS}", "${GL_BRIDGE_SENDER_ADDRESS}", ${TARGET_CHAIN_EID}, "${AGENT_ZERO_BASE_ADDRESS}"]'`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
