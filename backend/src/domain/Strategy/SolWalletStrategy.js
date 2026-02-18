import * as bip39 from "@scure/bip39";
import { derivePath } from "ed25519-hd-key";
import nacl from "tweetnacl";
import * as bs58 from "bs58";
import { WalletStrategyRegistry } from "../Factory/WalletStrategyRegistry.js";
import { IWalletStrategy } from "./IWalletStrategy.js";
import { InputType } from "../Types/InputType.js";

/**
 * Solana wallet derivation strategy (BIP44 path m/44'/501'/i'/0').
 * Only MNEMONIC is supported; XPUB handler throws (Solana uses Ed25519, different from BIP32 xpub).
 */
export class SolWalletStrategy extends IWalletStrategy {
  /**
   * bs58 recently changed packaging; depending on how the bundler/Node loads it,
   * `require("bs58")` can be either:
   *   - a function that encodes (old style), or
   *   - an object with an `.encode` method.
   * Normalise that here so the rest of the code can just call `encodeBase58`.
   */
  static encodeBase58(bytes) {
    // 1) CommonJS style: module itself is a function -> bs58(buffer)
    if (typeof bs58 === "function") {
      return bs58(bytes);
    }

    // 2) Object with .encode: bs58.encode(buffer)
    if (bs58 && typeof bs58.encode === "function") {
      return bs58.encode(bytes);
    }

    // 3) ESM-default interop: { default: fn } or { default: { encode: fn } }
    if (bs58 && typeof bs58.default === "function") {
      return bs58.default(bytes);
    }
    if (bs58 && bs58.default && typeof bs58.default.encode === "function") {
      return bs58.default.encode(bytes);
    }

    throw new Error("bs58.encode/encodeBase58 is not available – unsupported bs58 version/interop");
  }

  getInputHandlers() {
    return {
      [InputType.MNEMONIC]: {
        deriveRoot: (input) => {
          const seed = bip39.mnemonicToSeedSync(input);
          return { seed };
        },
        deriveChildren: (root, count, startIdx) =>
          Array.from({ length: count }).map((_, i) => {
            const path = `m/44'/501'/${startIdx + i}'/0'`;
            const { key } = derivePath(path, root.seed.toString("hex"));
            const kp = nacl.sign.keyPair.fromSeed(key);
            return {
              srNo: startIdx + i + 1,
              path,
              // Normalised helper handles both bs58() and bs58.encode()
              address: SolWalletStrategy.encodeBase58(kp.publicKey),
            };
          }),
      },
      [InputType.XPUB]: {
        deriveRoot: () => {
          throw new Error("Unsupported input type for SOL (use MNEMONIC)");
        },
        deriveChildren: () => {
          throw new Error("Unsupported input type for SOL (use MNEMONIC)");
        },
      },
    };
  }
}

WalletStrategyRegistry.register("SOL", SolWalletStrategy);


