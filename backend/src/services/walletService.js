import { WalletStrategyRegistry } from "../domain/Factory/WalletStrategyRegistry.js";

/**
 * Orchestrates wallet derivation: resolves strategy by currency, derives root and children, then enriches (e.g. balances).
 * @param {object} params
 * @param {string} params.inputType - InputType.MNEMONIC or InputType.XPUB
 * @param {string} params.currency - ETH, BTC, LTC, BCH, SOL
 * @param {string} params.value - Mnemonic phrase or xpub
 * @param {number} [params.count] - Number of addresses to derive
 * @param {number} [params.startIdx] - Starting index (pagination)
 */
export const fetchWalletData = async ({
  inputType,
  currency,
  value,
  count = 20,
  startIdx = 0,
}) => {
  if (!inputType) {
    throw new Error("inputType missing in service");
  }

  const strategy = WalletStrategyRegistry.get(currency);
  const root = await strategy.deriveRoot(value, inputType);
  const children = strategy.deriveChildren(root, count, startIdx, inputType);
  const enriched = await strategy.enrich(children);

  return {
    currency,
    count,
    data: enriched,
  };
};


