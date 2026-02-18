import { ethers } from "ethers";

/**
 * Ethereum RPC provider used to fetch balances.
 * Accepts rpcUrl in constructor for DI and testability; falls back to ETH_RPC_URL if not provided.
 */
export class EthRpcProvider {
  /**
   * @param {string} [rpcUrl] - Optional. Uses process.env.ETH_RPC_URL if omitted.
   */
  constructor(rpcUrl = process.env.ETH_RPC_URL) {
    if (!rpcUrl) {
      throw new Error("ETH_RPC_URL is not defined");
    }
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * @param {string} address - Ethereum address
   * @returns {Promise<bigint>} Balance in wei
   */
  async getBalance(address) {
    return this.provider.getBalance(address);
  }
}


