/**
 * Dummy balance provider that always returns 0. Used when an RPC URL is not configured
 * so the API still returns the balance field (e.g. codexBalance: "0.0") without failing.
 */
export class ZeroBalanceProvider {
  async getBalance() {
    return 0n;
  }
}


