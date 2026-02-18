import { fetchWalletData } from "../services/walletService.js";
import { InputType } from "../domain/Types/InputType.js";
import logger from "../utils/logger.js";

/**
 * POST /api/wallet/fetch handler. Validates body, normalizes inputType, and returns derived addresses (and balances for ETH).
 */
export const fetchData = async (req, res) => {
  try {
    logger.info({ body: req.body }, "Request body:");
    const { inputType, currency, value, count, startIdx } = req.body;

    if (!inputType || !currency || !value) {
      return res.status(400).json({
        error: "inputType, currency, and value are required",
      });
    }

    const normalizedInputType = InputType[inputType.toUpperCase()];
    if (!normalizedInputType) {
      return res.status(400).json({
        error: `Unsupported inputType: ${inputType}. Use MNEMONIC or XPUB.`,
      });
    }

    const result = await fetchWalletData({
      inputType: normalizedInputType,
      currency: currency.toUpperCase(),
      value: value.trim(),
      count: count ?? 20,
      startIdx: startIdx ?? 0,
    });

    res.json(result);
  } catch (err) {
    // Log full error server-side for easier debugging while returning a clean message to clients.
    // This is safe for production as it only logs to backend logger.
    logger.error(err, "Error in /api/wallet/fetch:");
    res.status(400).json({ error: err.message });
  }
};


