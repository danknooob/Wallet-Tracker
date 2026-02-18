import * as bs58check from "bs58check";
import { Buffer } from "buffer";

/**
 * bs58check can be exported in different ways depending on CJS/ESM interop.
 * Normalise access so we always have { encode, decode } available.
 */
function getBs58check() {
  // 1) CommonJS style: module itself has encode/decode
  if (bs58check && typeof bs58check.decode === "function" && typeof bs58check.encode === "function") {
    return bs58check;
  }

  // 2) ESM default: { default: { encode, decode } }
  if (
    bs58check &&
    bs58check.default &&
    typeof bs58check.default.decode === "function" &&
    typeof bs58check.default.encode === "function"
  ) {
    return bs58check.default;
  }

  throw new Error("bs58check encode/decode API is not available – unsupported version/interop");
}

const bs = getBs58check();

/**
 * Normalize Bitcoin-family extended public keys (xpub/ypub/zpub/tpub/vpub) to a standard version
 * so that HDKey.fromExtendedKey can consume them regardless of wallet prefix.
 * @param {string} extPub - Base58check-encoded extended public key
 * @returns {string} Normalized base58check extended public key (xpub or tpub for testnet)
 */
export function normalizeExtendedPubKey(extPub) {
  const data = bs.decode(extPub);
  const version = Buffer.from(data.slice(0, 4)).toString("hex");

  const VERSIONS = {
    "0488b21e": "0488b21e", // xpub → xpub
    "049d7cb2": "0488b21e", // ypub → xpub
    "04b24746": "0488b21e", // zpub → xpub
    "043587cf": "043587cf", // tpub → tpub
    "045f1cf6": "043587cf", // vpub → tpub
  };

  const targetVersion = VERSIONS[version];
  if (!targetVersion) {
    throw new Error(`Unsupported extended public key version: ${version}`);
  }

  const converted = targetVersion + Buffer.from(data.slice(4)).toString("hex");
  return bs.encode(Buffer.from(converted, "hex"));
}


