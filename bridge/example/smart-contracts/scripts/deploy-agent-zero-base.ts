import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  const bridgeSender = process.env.BRIDGE_SENDER_ADDRESS;
  const bridgeReceiver = process.env.BRIDGE_RECEIVER_ADDRESS;
  const genLayerTarget = process.env.GENLAYER_BRAIN_ADDRESS || ethers.ZeroAddress;

  if (!bridgeSender || !bridgeReceiver) {
    console.error("Missing BRIDGE_SENDER_ADDRESS or BRIDGE_RECEIVER_ADDRESS in .env");
    process.exit(1);
  }

  console.log("Deploying AgentZeroBase...");
  console.log("  Bridge Sender:", bridgeSender);
  console.log("  Bridge Receiver:", bridgeReceiver);
  console.log("  GenLayer Target:", genLayerTarget);

  const AgentZeroBase = await ethers.getContractFactory("AgentZeroBase");
  const contract = await AgentZeroBase.deploy(bridgeSender, bridgeReceiver, genLayerTarget);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\nAgentZeroBase deployed to:", address);
  console.log("\nUpdate AGENT_ZERO_BASE_ADDRESS in .env with this address.");
  console.log("Then set this as the target_contract on AgentZeroBrain on GenLayer.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
