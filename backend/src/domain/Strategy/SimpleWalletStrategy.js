import { IWalletStrategy } from "./IWalletStrategy.js";
import { InputType } from "../Types/InputType.js";

/**
 * Minimal strategy for testing or demo: returns placeholder addresses.
 * Not registered in the registry; use only in tests or as a template.
 */
export class SimpleWalletStrategy extends IWalletStrategy {
  constructor(currency, basePath) {
    super();
    this.currency = currency;
    this.basePath = basePath;
  }

  getInputHandlers() {
    const basePath = this.basePath;
    const currency = this.currency;
    return {
      [InputType.MNEMONIC]: {
        deriveRoot: () => ({
          rootKey: `${currency}-root-from-mnemonic`,
          basePath,
        }),
        deriveChildren: (root, count = 100) =>
          Array.from({ length: count }).map((_, i) => ({
            srNo: i + 1,
            path: `${root.basePath}/${i}`,
            address: `${currency}_${i}`,
            extendedKey: `xpub_${currency}_${i}`,
          })),
      },
      [InputType.XPUB]: {
        deriveRoot: (input) => ({ rootKey: input, basePath }),
        deriveChildren: (root, count = 100) =>
          Array.from({ length: count }).map((_, i) => ({
            srNo: i + 1,
            path: `${root.basePath}/${i}`,
            address: `${currency}_${i}`,
            extendedKey: `xpub_${currency}_${i}`,
          })),
      },
    };
  }
}


