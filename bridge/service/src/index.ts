/**
 * Bridge Service - Entry Point
 *
 * Bidirectional relay between GenLayer and EVM chains via zkSync hub.
 */

import cron from "node-cron";
import http from "node:http";
import {
  getBridgeSyncInterval,
  getEvmToGlSyncInterval,
  isEvmToGlBridgingEnabled,
} from "./config.js";
import { GenLayerToEvmRelay } from "./relay/GenLayerToEvm.js";
import { EvmToGenLayerRelay } from "./relay/EvmToGenLayer.js";

async function main() {
  console.log("Starting Bridge Service");

  // Optional health endpoint for platforms that expect an HTTP listener (e.g., Render Web Service).
  const port = process.env.PORT;
  if (port) {
    const server = http.createServer((req, res) => {
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Bridge service is running");
    });

    server.listen(Number(port), () => {
      console.log(`Health server listening on :${port}`);
    });
  }

  // GenLayer -> EVM relay
  const glToEvm = new GenLayerToEvmRelay();
  const glToEvmInterval = getBridgeSyncInterval();

  console.log(`  GenLayer → EVM: ${glToEvmInterval}`);
  glToEvm.sync(); // Initial sync
  cron.schedule(glToEvmInterval, () => glToEvm.sync());

  // EVM -> GenLayer relay (if configured)
  if (isEvmToGlBridgingEnabled()) {
    const evmToGl = new EvmToGenLayerRelay();
    const evmToGlInterval = getEvmToGlSyncInterval();

    console.log(`  EVM → GenLayer: ${evmToGlInterval}`);
    evmToGl.sync(); // Initial sync
    cron.schedule(evmToGlInterval, () => evmToGl.sync());
  } else {
    console.log("  EVM → GenLayer: DISABLED (missing config)");
  }

  console.log("Bridge service running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Received SIGTERM. Shutting down...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Received SIGINT. Shutting down...");
  process.exit(0);
});
