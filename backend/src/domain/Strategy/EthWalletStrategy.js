import { ethers } from "ethers";
import * as bip39 from "@scure/bip39";
import { HDKey } from "@scure/bip32";
import { InputType } from "../Types/InputType.js";
import { WalletStrategyRegistry } from "../Factory/WalletStrategyRegistry.js";
import { IWalletStrategy } from "./IWalletStrategy.js";

const BASE_PATH = "m/44'/60'/0'/0";

/**
 * Ethereum wallet derivation strategy (BIP44 path m/44'/60'/0').
 * Supports MNEMONIC and XPUB. Enrichment (ETH/Codex balances) is delegated to an optional
 * IBalanceEnricher injected via constructor (DI).
 */
export class EthWalletStrategy extends IWalletStrategy {
  /**
   * @param {import("../Enrichers/IBalanceEnricher.js").IBalanceEnricher} [balanceEnricher] - Optional. If provided, enrich() delegates here (DI).
   */
  constructor(balanceEnricher = null) {
    super();
    this.balanceEnricher = balanceEnricher;
  }

  /** OCP: input-type-specific logic in handlers; no if/else in public API. */
  getInputHandlers() {
    return {
      [InputType.MNEMONIC]: {
        deriveRoot: (input) => {
          const seed = bip39.mnemonicToSeedSync(input);
          const node = HDKey.fromMasterSeed(seed);
          return { node, basePath: BASE_PATH };
        },
        deriveChildren: (root, count, startIndex) => {
          return Array.from({ length: count }).map((_, i) => {
            const path = `${root.basePath}/${startIndex + i}`;
            const child = root.node.derive(path);
            const wallet = new ethers.Wallet(ethers.hexlify(child.privateKey));
            return { srNo: startIndex + i + 1, path, address: wallet.address };
          });
        },
      },
      [InputType.XPUB]: {
        deriveRoot: (input) => {
          let node;
          try {
            node = ethers.HDNodeWallet.fromExtendedKey(input);
          } catch (err) {
            throw new Error("Invalid Ethereum XPUB");
          }
          return { node, basePath: BASE_PATH };
        },
        deriveChildren: (root, count, startIndex) => {
          return Array.from({ length: count }).map((_, i) => {
            const index = startIndex + i;
            const child = root.node.derivePath(`${index}`);
            return {
              srNo: index + 1,
              path: `${root.basePath}/${index}`,
              address: child.address,
            };
          });
        },
      },
    };
  }

  async enrich(children) {
    if (this.balanceEnricher) {
      return this.balanceEnricher.enrich(children);
    }
    return super.enrich(children);
  }
}

// Self-register for backward compat; app.js may overwrite with a factory that injects enricher
WalletStrategyRegistry.register("ETH", EthWalletStrategy);


