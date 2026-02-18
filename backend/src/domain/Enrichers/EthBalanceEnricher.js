import { ethers } from "ethers";
import { IBalanceEnricher } from "./IBalanceEnricher.js";

/**
 * Enricher that adds ETH and Codex balances to derived address entries.
 * Depends on two balance providers (injected for testability and DIP).
 */
export class EthBalanceEnricher extends IBalanceEnricher {
  /**
   * @param {object} ethProvider - Provider with getBalance(address) returning balance in wei
   * @param {object} codexProvider - Provider with getBalance(address) returning balance in wei
   */
  constructor(ethProvider, codexProvider) {
    super();
    this.ethProvider = ethProvider;
    this.codexProvider = codexProvider;
  }

  /**
   * Fetches ETH and Codex balance for each child and adds ethBalance, codexBalance (in ETH units).
   */
  async enrich(children) {
    return Promise.all(
      children.map(async (c) => {
        const balanceWei = await this.ethProvider.getBalance(c.address);
        const codexBalanceWei = await this.codexProvider.getBalance(c.address);
        return {
          ...c,
          ethBalance: ethers.formatEther(balanceWei),
          codexBalance: ethers.formatEther(codexBalanceWei),
        };
      }),
    );
  }
}


