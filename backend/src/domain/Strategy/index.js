/**
 * Side-effect import: loads all currency strategies so they self-register with WalletStrategyRegistry.
 * ETH can be re-registered in the app composition root with an injected balance enricher (DI).
 */
import "./EthWalletStrategy.js";
import "./BtcWalletStrategy.js";
import "./SolWalletStrategy.js";
import "./LtcWalletStrategy.js";
import "./BchWalletStrategy.js";
