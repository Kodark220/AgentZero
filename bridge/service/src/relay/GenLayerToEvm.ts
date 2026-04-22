/**
 * GenLayer -> EVM Relay
 *
 * Polls GenLayer BridgeSender for pending messages and relays them
 * via zkSync BridgeForwarder to destination EVM chains.
 */

import { ethers } from "ethers";
import { createAccount, createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import type { Address } from "genlayer-js/types";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import {
  getBridgeForwarderAddress,
  getBridgeSenderAddress,
  getForwarderNetworkRpcUrl,
  getGenlayerRpcUrl,
  getPrivateKey,
} from "../config.js";

interface BridgeMessage {
  targetChainId: number;
  targetContract: string;
  data: string;
}

type MessageRecord = {
  target_chain_id?: number | string;
  target_contract?: string;
  data?: string | Uint8Array | number[];
};

const BRIDGE_FORWARDER_ABI = [
  "function callRemoteArbitrary(bytes32 txHash, uint32 dstEid, bytes data, bytes options) external payable",
  "function quoteCallRemoteArbitrary(uint32 dstEid, bytes data, bytes options) external view returns (uint256 nativeFee, uint256 lzTokenFee)",
  "function isHashUsed(bytes32 txHash) external view returns (bool)",
];

export class GenLayerToEvmRelay {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private bridgeForwarder: ethers.Contract;
  private genLayerClient: any;
  private usedHashes: Set<string>;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(getForwarderNetworkRpcUrl());
    this.wallet = new ethers.Wallet(getPrivateKey(), this.provider);

    this.bridgeForwarder = new ethers.Contract(
      getBridgeForwarderAddress(),
      BRIDGE_FORWARDER_ABI,
      this.wallet
    );

    // Initialize GenLayer client
    const privateKey = getPrivateKey();
    const account = createAccount(`0x${privateKey.replace(/^0x/, "")}`);
    this.genLayerClient = createClient({
      chain: {
        ...testnetBradbury,
        rpcUrls: {
          default: { http: [getGenlayerRpcUrl()] },
        },
      },
      account,
    });

    this.usedHashes = new Set<string>();
  }

  private normalizeHash(hash: string): string {
    return String(hash).replace(/^0x/, "").toLowerCase();
  }

  private normalizeHexData(data: unknown): string {
    if (typeof data === "string") {
      if (data.startsWith("0x")) {
        return data;
      }
      return `0x${data}`;
    }

    if (data instanceof Uint8Array || Buffer.isBuffer(data)) {
      return `0x${Buffer.from(data).toString("hex")}`;
    }

    if (Array.isArray(data)) {
      return `0x${Buffer.from(data).toString("hex")}`;
    }

    throw new Error(`Unsupported message data type: ${typeof data}`);
  }

  private extractMessageRecord(value: unknown): MessageRecord {
    if (value && typeof value === "object") {
      if (typeof (value as Map<string, unknown>).get === "function") {
        const map = value as Map<string, unknown>;
        return {
          target_chain_id: map.get("target_chain_id") as number | string,
          target_contract: map.get("target_contract") as string,
          data: map.get("data") as string | Uint8Array | number[],
        };
      }

      return value as MessageRecord;
    }

    throw new Error("Unexpected get_message return type");
  }

  private async getPendingMessages(): Promise<string[]> {
    try {
      const response = await this.genLayerClient.readContract({
        address: getBridgeSenderAddress() as Address,
        functionName: "get_message_hashes",
        args: [],
        stateStatus: "accepted",
      });

      if (!Array.isArray(response)) {
        console.error("Unexpected response format:", response);
        return [];
      }

      return response
        .map((hash) => this.normalizeHash(String(hash)))
        .filter((hash) => !this.usedHashes.has(hash));
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
  }

  private async relayMessage(hash: string): Promise<void> {
    try {
      console.log(`[GL→EVM] Processing message ${hash}`);

      // Check if already relayed
      const hashHex = `0x${this.normalizeHash(hash)}`;
      const isUsed = await this.bridgeForwarder.isHashUsed(hashHex);
      if (isUsed) {
        console.log(`[GL→EVM] Message ${hash} already relayed, skipping`);
        return;
      }

      // Get message from GenLayer
      const messageResponse =
        await this.genLayerClient.readContract({
          address: getBridgeSenderAddress() as Address,
          functionName: "get_message",
          args: [this.normalizeHash(hash)],
          stateStatus: "accepted",
        });

      const record = this.extractMessageRecord(messageResponse);

      const message: BridgeMessage = {
        targetChainId: Number(record.target_chain_id),
        targetContract: String(record.target_contract),
        data: this.normalizeHexData(record.data),
      };

      console.log(
        `[GL→EVM] Relaying to chain ${message.targetChainId}/${message.targetContract}`
      );

      // Build LayerZero options
      const optionsHex = Options.newOptions()
        .addExecutorLzReceiveOption(1_000_000, 0)
        .toHex();

      // Get fee quote
      const dstEid = message.targetChainId; // Already LZ EID
      const [nativeFee] = await this.bridgeForwarder.quoteCallRemoteArbitrary(
        dstEid,
        message.data,
        optionsHex
      );

      console.log(
        `[GL→EVM] Fee: ${ethers.formatEther(nativeFee)} ETH`
      );

      // Send via LayerZero
      const tx = await this.bridgeForwarder.callRemoteArbitrary(
        hashHex,
        dstEid,
        message.data,
        optionsHex,
        { value: nativeFee }
      );

      console.log(`[GL→EVM] TX: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`[GL→EVM] Confirmed in block ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`[GL→EVM] Error relaying ${hash}:`, error);
    }
  }

  public async sync(): Promise<void> {
    try {
      console.log("[GL→EVM] Starting sync...");

      const hashes = await this.getPendingMessages();
      console.log(`[GL→EVM] Found ${hashes.length} messages`);

      for (const hash of hashes) {
        this.usedHashes.add(hash);
        await this.relayMessage(hash);
      }

      console.log("[GL→EVM] Sync complete");
    } catch (error) {
      console.error("[GL→EVM] Sync error:", error);
    }
  }
}
