/**
 * Registry of wallet strategies per currency.
 * Supports both class registration (new Strategy()) and factory registration (Strategy())
 * so that strategies requiring DI (e.g. ETH with balance enricher) can be registered with a factory.
 */
const registry = {};

export const WalletStrategyRegistry = {
  /**
   * Register a strategy for a currency. Pass either a class (new will be used) or a factory function (called to get instance).
   * @param {string} currency - Currency code (e.g. "ETH", "BTC")
   * @param {Function} strategyClassOrFactory - Constructor (class) or () => strategyInstance (factory for DI)
   */
  register: (currency, strategyClassOrFactory) => {
    registry[currency.toUpperCase()] = strategyClassOrFactory;
  },

  /**
   * Get a strategy instance for the currency. Uses factory if registered value has no prototype (e.g. arrow), else constructs.
   * @param {string} currency - Currency code
   * @returns {import("../Strategy/IWalletStrategy.js").IWalletStrategy}
   */
  get: (currency) => {
    const Strategy = registry[currency.toUpperCase()];
    if (!Strategy) throw new Error(`Unsupported currency: ${currency}`);
    // Factory (e.g. arrow) has no prototype; class has prototype with methods
    return Strategy.prototype != null ? new Strategy() : Strategy();
  },
};
