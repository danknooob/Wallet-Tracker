/**
 * Contract for enriching derived wallet children (e.g. with on-chain balances).
 * Keeps wallet strategies independent of RPC/balance logic (DIP + SRP).
 * Strategies that need enrichment receive an enricher via constructor (DI).
 */
export class IBalanceEnricher {
  /**
   * Enrich a list of derived children (e.g. add balances).
   * @param {Array<{ address: string, [key: string]: any }>} children - Derived address entries
   * @returns {Promise<Array<object>>} Same children with extra fields (e.g. ethBalance, codexBalance)
   */
  async enrich(children) {
    return children;
  }
}


