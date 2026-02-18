import { ethers } from "ethers";

// Hard-coded default Codex RPC URL for balance lookups.
// This avoids any dependency on process.env.CODEX_RPC_URL in packaged builds.
const DEFAULT_CODEX_RPC_URL = "https://node-mainnet.codexnetwork.org";

/**
 * Codex chain RPC provider for balance lookups.
 * Accepts rpcUrl in constructor for DI; defaults to DEFAULT_CODEX_RPC_URL.
 */
export class CodexRpcProvider {
  /**
   * @param {string} [rpcUrl] - Optional. Uses DEFAULT_CODEX_RPC_URL if omitted.
   */
  constructor(rpcUrl = DEFAULT_CODEX_RPC_URL) {
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


