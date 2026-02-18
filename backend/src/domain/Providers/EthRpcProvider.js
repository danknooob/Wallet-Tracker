import { ethers } from "ethers";

// Hard-coded default Ethereum RPC URL for balance lookups.
// This avoids any dependency on process.env.ETH_RPC_URL in packaged builds.
const DEFAULT_ETH_RPC_URL = "https://eth.llamarpc.com";

/**
 * Ethereum RPC provider used to fetch balances.
 * Accepts rpcUrl in constructor for DI and testability; defaults to DEFAULT_ETH_RPC_URL.
 */
export class EthRpcProvider {
  /**
   * @param {string} [rpcUrl] - Optional. Uses DEFAULT_ETH_RPC_URL if omitted.
   */
  constructor(rpcUrl = DEFAULT_ETH_RPC_URL) {
    if (!rpcUrl) {
      throw new Error("ETH RPC URL is not defined");
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


