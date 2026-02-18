import * as bip39 from "@scure/bip39";
import { HDKey } from "@scure/bip32";
import * as bitcoin from "bitcoinjs-lib";
import { InputType } from "../Types/InputType.js";
import { WalletStrategyRegistry } from "../Factory/WalletStrategyRegistry.js";
import { IWalletStrategy } from "./IWalletStrategy.js";
import { normalizeExtendedPubKey } from "../../utils/normalisation.js";

const BASE_PATH_MNEMONIC = "m/84'/2'/0'/0";

const litecoinNetwork = {
  messagePrefix: "\x19Litecoin Signed Message:\n",
  bech32: "ltc",
  bip32: { public: 0x019da462, private: 0x019d9cfe },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

/**
 * Litecoin (SegWit) wallet derivation strategy.
 * Supports MNEMONIC and XPUB via input handlers (OCP). No balance enrichment.
 */
export class LtcWalletStrategy extends IWalletStrategy {
  /**
   * bitcoinjs-lib can be loaded in different ways (CJS vs ESM, bundler interop).
   * Normalise access to the `payments` namespace so we can always call `p2wpkh`.
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
      [InputType.MNEMONIC]: {
        deriveRoot: (input) => {
          const seed = bip39.mnemonicToSeedSync(input);
          const node = HDKey.fromMasterSeed(seed);
          return { node, basePath: BASE_PATH_MNEMONIC };
        },
        deriveChildren: (root, count, startIndex) => {
          const payments = LtcWalletStrategy.getPayments();
          return Array.from({ length: count }).map((_, i) => {
            const path = `${root.basePath}/${startIndex + i}`;
            const child = root.node.derive(path);
            const { address } = payments.p2wpkh({
              pubkey: Buffer.from(child.publicKey),
              network: litecoinNetwork,
            });
            return { srNo: startIndex + i + 1, path, address };
          });
        },
      },
      [InputType.XPUB]: {
        deriveRoot: (input) => {
          const normalizedXpub = normalizeExtendedPubKey(input);
          const node = HDKey.fromExtendedKey(normalizedXpub);
          return { node };
        },
        deriveChildren: (root, count, startIndex) => {
          if (!root?.node) throw new Error("Invalid root for LTC");
          const payments = LtcWalletStrategy.getPayments();
          return Array.from({ length: count }).map((_, i) => {
            const index = startIndex + i;
            const path = `m/0/${index}`;
            const child = root.node.derive(path);
            const { address } = payments.p2wpkh({
              pubkey: Buffer.from(child.publicKey),
              network: litecoinNetwork,
            });
            return {
              srNo: index + 1,
              path: `m/84'/2'/0'/0/${index}`,
              address,
            };
          });
        },
      },
    };
  }
}

WalletStrategyRegistry.register("LTC", LtcWalletStrategy);


