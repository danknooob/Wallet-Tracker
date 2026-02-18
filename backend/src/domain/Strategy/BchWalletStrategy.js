import { HDKey } from "@scure/bip32";
import * as bitcoin from "bitcoinjs-lib";
import * as cashaddr from "cashaddrjs";
import * as bip39 from "@scure/bip39";
import { normalizeExtendedPubKey } from "../../utils/normalisation.js";
import { InputType } from "../Types/InputType.js";
import { WalletStrategyRegistry } from "../Factory/WalletStrategyRegistry.js";
import { IWalletStrategy } from "./IWalletStrategy.js";

const BASE_PATH_MNEMONIC = "m/44'/145'/0'/0";

/**
 * Bitcoin Cash (P2PKH, CashAddr) wallet derivation strategy.
 * Supports MNEMONIC and XPUB via input handlers (OCP). No balance enrichment.
 */
export class BchWalletStrategy extends IWalletStrategy {
  /**
   * bitcoinjs-lib can be loaded in different ways (CJS vs ESM, bundler interop).
   * Normalise access to the `payments` namespace so we can always call `p2pkh`.
   */
  static getPayments() {
    // bitcoinjs-lib exports payments directly (works for both CJS and ESM)
    if (bitcoin && bitcoin.payments) {
      return bitcoin.payments;
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
          const payments = BchWalletStrategy.getPayments();
          return Array.from({ length: count }).map((_, i) => {
            const path = `m/0/${startIndex + i}`;
            const child = root.node.derive(path);
            const { hash } = payments.p2pkh({
              pubkey: Buffer.from(child.publicKey),
            });
            const address = cashaddr.encode("bitcoincash", "P2PKH", hash);
            return {
              srNo: startIndex + i + 1,
              path: `m/44'/145'/0'/0/${startIndex + i}`,
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
          const payments = BchWalletStrategy.getPayments();
          return Array.from({ length: count }).map((_, i) => {
            const path = `${root.basePath}/${startIndex + i}`;
            const child = root.node.derive(path);
            const { hash } = payments.p2pkh({
              pubkey: Buffer.from(child.publicKey),
            });
            const address = cashaddr.encode("bitcoincash", "P2PKH", hash);
            return { srNo: startIndex + i + 1, path, address };
          });
        },
      },
    };
  }
}

WalletStrategyRegistry.register("BCH", BchWalletStrategy);


