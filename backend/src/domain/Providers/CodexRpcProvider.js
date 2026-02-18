import { ethers } from "ethers";

/**
 * Codex chain RPC provider for balance lookups.
 * Accepts rpcUrl in constructor for DI; falls back to CODEX_RPC_URL if not provided.
 */
export class CodexRpcProvider {
  /**
   * @param {string} [rpcUrl] - Optional. Uses process.env.CODEX_RPC_URL if omitted.
   */
  constructor(rpcUrl = process.env.CODEX_RPC_URL) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * @param {string} address - Address on Codex chain
   * @returns {Promise<bigint>} Balance in wei
   */
  async getBalance(address) {
    return this.provider.getBalance(address);
  }
}


