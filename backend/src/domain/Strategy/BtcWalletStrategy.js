import { HDKey } from "@scure/bip32";
import * as bitcoin from "bitcoinjs-lib";
import * as bip39 from "@scure/bip39";
import { normalizeExtendedPubKey } from "../../utils/normalisation.js";
import { WalletStrategyRegistry } from "../Factory/WalletStrategyRegistry.js";
import { IWalletStrategy } from "./IWalletStrategy.js";
import { InputType } from "../Types/InputType.js";

const BASE_PATH_MNEMONIC = "m/84'/0'/0'/0";

/**
 * Bitcoin (SegWit, BIP84) wallet derivation strategy.
 * Supports MNEMONIC and XPUB via input handlers (OCP). No balance enrichment.
 */
export class BtcWalletStrategy extends IWalletStrategy {
  /**
   * bitcoinjs-lib can be loaded in different ways (CJS vs ESM, bundler interop).
   * Normalise access to the `payments` namespace so we can always call `p2wpkh`.
   */
  static getPayments() {
    // CommonJS: require("bitcoinjs-lib") -> { payments, ... }
    if (bitcoin && bitcoin.payments) {
      return bitcoin.payments;
    }
    // ESM default: require("bitcoinjs-lib") -> { default: { payments, ... } }
    if (bitcoin && bitcoin.default && bitcoin.default.payments) {
      return bitcoin.default.payments;
    }
    throw new Error("bitcoinjs-lib payments API is not available");
  }

  getInputHandlers() {
    return {
      [InputType.XPUB]: {
        deriveRoot: (input) => {
          const normalizedXpub = normalizeExtendedPubKey(input);
          const node = HDKey.fromExtendedKey(normalizedXpub);
          return { node };
        },
        deriveChildren: (root, count, startIndex) => {
          const payments = BtcWalletStrategy.getPayments();
          return Array.from({ length: count }).map((_, i) => {
            const path = `m/0/${startIndex + i}`;
            const child = root.node.derive(path);
            const { address } = payments.p2wpkh({
              pubkey: Buffer.from(child.publicKey),
            });
            return {
              srNo: startIndex + i + 1,
              path: `m/84'/0'/0'/0/${startIndex + i}`,
              address,
            };
          });
        },
      },
      [InputType.MNEMONIC]: {
        deriveRoot: (input) => {
          const seed = bip39.mnemonicToSeedSync(input);
          const node = HDKey.fromMasterSeed(seed);
          return { node, basePath: BASE_PATH_MNEMONIC };
        },
        deriveChildren: (root, count, startIndex) => {
          if (!root.basePath) {
            throw new Error("Missing basePath for mnemonic-derived BTC root");
          }
          const payments = BtcWalletStrategy.getPayments();
          return Array.from({ length: count }).map((_, i) => {
            const index = startIndex + i;
            const path = `${root.basePath}/${index}`;
            const child = root.node.derive(path);
            const { address } = payments.p2wpkh({
              pubkey: Buffer.from(child.publicKey),
            });
            return { srNo: index + 1, path, address };
          });
        },
      },
    };
  }
}

WalletStrategyRegistry.register("BTC", BtcWalletStrategy);


