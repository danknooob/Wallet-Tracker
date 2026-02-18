/**
 * Base contract for a currency-specific wallet derivation strategy.
 * Subclasses implement getInputHandlers() to support MNEMONIC/XPUB without if/else (OCP),
 * and optionally inject an enricher for balance data (DI).
 */

export class IWalletStrategy {
  /**
   * Returns a map of inputType -> { deriveRoot(input), deriveChildren(root, count, startIndex) }.
   * Override in subclass to support MNEMONIC, XPUB, or future types without modifying existing code.
   * @returns {Record<string, { deriveRoot: (input: string) => any, deriveChildren: (root: any, count: number, startIndex: number) => Array<object> }>}
   */
  getInputHandlers() {
    throw new Error("getInputHandlers not implemented");
  }

  /**
   * Derives the root key/node from the given input. Dispatches to the handler for inputType (OCP).
   * @param {string} input - Mnemonic phrase or extended public key
   * @param {string} inputType - One of InputType.MNEMONIC, InputType.XPUB
   */
  async deriveRoot(input, inputType) {
    const handlers = this.getInputHandlers();
    const handler = handlers[inputType];
    if (!handler) {
      throw new Error(`Unsupported input type for this currency: ${inputType}`);
    }
    return handler.deriveRoot(input);
  }

  /**
   * Derives child addresses from the root. Dispatches to the handler for inputType (OCP).
   * @param {any} root - Result of deriveRoot()
   * @param {number} count - Number of children to derive
   * @param {number} startIndex - Starting index
   * @param {string} inputType - One of InputType.MNEMONIC, InputType.XPUB
   */
  deriveChildren(root, count, startIndex, inputType) {
    const handlers = this.getInputHandlers();
    const handler = handlers[inputType];
    if (!handler) {
      throw new Error(`Unsupported input type for this currency: ${inputType}`);
    }
    return handler.deriveChildren(root, count, startIndex);
  }

  /**
   * Optional enrichment (e.g. balances). Default is no-op. Override or inject enricher for ETH.
   * @param {Array<object>} children - Derived address entries
   * @returns {Promise<Array<object>>}
   */
  async enrich(children) {
    return children;
  }
}


