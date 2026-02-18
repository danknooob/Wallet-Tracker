import { useState } from "react";
import "./AddressGeneratorPage.css";

/** Number of addresses to fetch per page (fits in view without scroll). */
const itemsPerPage = 10;
/** Total items available across all pages (drives pagination cap). */
const totalItemsToDisplay = 100;
/** Currencies that do not return ethBalance/codexBalance (hide those columns). */
const noBalanceCurrencyDisplay = ["BTC", "LTC", "BCH", "SOL"];
const totalPages = Math.ceil(totalItemsToDisplay / itemsPerPage);

type AddressResult = {
  srNo: number;
  address: string;
  path: string;
  ethBalance?: string;
  codexBalance?: string;
};

type WalletFetchResponse = {
  data?: AddressResult[];
  error?: string;
};

/** Backend API base URL (same port the desktop app's backend uses). */
const API_BASE = "http://127.0.0.1:55001";
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Turn fetch/network errors into user-friendly, descriptive messages.
 */
function getDescriptiveErrorMessage(e: unknown, context?: { status?: number; statusText?: string; bodyError?: string }): string {
  if (e instanceof TypeError) {
    const msg = (e as Error).message?.toLowerCase() ?? "";
    if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load")) {
      return "Backend is not running or not reachable. The app may still be starting—wait a few seconds and try again. If it keeps failing, close the app completely and reopen it, or check if another program is using port 55001.";
    }
    if (msg.includes("aborted")) {
      return "Request was cancelled or timed out. The backend may be slow or not responding. Try again in a moment.";
    }
  }

  if (e instanceof Error) {
    const msg = e.message.toLowerCase();
    if (msg.includes("connection refused") || msg.includes("econnrefused")) {
      return "Connection refused: the backend is not running. Restart the app and wait a few seconds before clicking Show Addresses. If the problem continues, port 55001 may be in use by another application.";
    }
    if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("etimedout")) {
      return "Request timed out. The backend did not respond in time—it may be busy, stuck, or not running. Try again or restart the app.";
    }
    if (msg.includes("address already in use") || msg.includes("eaddrinuse")) {
      return "Port 55001 is already in use by another application. Close the other app or restart your computer, then open Wallet Tracker again.";
    }
    if (msg.includes("invalid json") || msg.includes("unexpected token")) {
      return "Backend returned invalid data; it may have crashed or restarted. Try again or restart the app.";
    }
    // Server returned an error message we threw ourselves
    if (e.message && e.message.length < 200 && !e.message.includes("failed to fetch")) {
      return e.message;
    }
  }

  if (context?.status !== undefined) {
    if (context.status === 0) {
      return "No response from backend (connection failed or blocked). Ensure the app’s backend is running and nothing is blocking port 55001.";
    }
    if (context.status === 503) {
      return "Backend is temporarily unavailable (service overloaded or starting). Wait a moment and try again.";
    }
    if (context.status >= 500) {
      return `Backend error (${context.status}). The server encountered an internal error. Try again or restart the app.`;
    }
    if (context.bodyError) {
      return context.bodyError;
    }
    if (context.status === 400 || context.status === 422) {
      return context.bodyError || `Request was rejected by the backend (${context.status}). Check your input (mnemonic or xpub) and try again.`;
    }
    if (context.status >= 400) {
      return context.bodyError || `Request failed (${context.status} ${context.statusText || "error"}).`;
    }
  }

  return "Something went wrong. If the problem continues, try restarting the app or checking if port 55001 is free.";
}

/**
 * Address generator UI: mnemonic or xpub + currency, then fetches derived addresses from the API
 * and displays them in a table with pagination.
 */
export default function AddressGenerator() {
  const [selectedType, setSelectedType] = useState<"mnemonic" | "xpub">("mnemonic");
  const [currencyType, setCurrencyType] = useState<"ETH" | "BTC" | "LTC" | "BCH" | "SOL">("ETH");
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<AddressResult[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deriveAddresses = async (pageNumber: number) => {
    setLoading(true);
    setResults([]);
    setError(null);
    setCurrentPage(pageNumber);

    const startIdx = (pageNumber - 1) * itemsPerPage;
    const cleanedValue = inputValue.trim();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE}/api/wallet/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputType: selectedType.toUpperCase(),
          currency: currencyType,
          value: cleanedValue,
          count: itemsPerPage,
          startIdx,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let json: WalletFetchResponse;
      try {
        json = await res.json();
      } catch (parseErr) {
        setError(
          getDescriptiveErrorMessage(parseErr, {
            status: res.status,
            statusText: res.statusText,
            bodyError: "Backend returned invalid JSON; it may have crashed. Try again or restart the app.",
          })
        );
        return;
      }

      if (!res.ok) {
        setError(
          getDescriptiveErrorMessage(new Error(json.error || res.statusText), {
            status: res.status,
            statusText: res.statusText,
            bodyError: json.error,
          })
        );
        return;
      }

      setResults(json.data || []);
    } catch (e: unknown) {
      clearTimeout(timeoutId);
      const isAbort = e instanceof Error && e.name === "AbortError";
      setError(
        getDescriptiveErrorMessage(isAbort ? new Error("Request timed out") : e, {
          status: isAbort ? undefined : (e as { status?: number }).status,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="generator-card">
        <header className="generator-header">
          <div>
            <h1 className="generator-title">Wallet Address Generator</h1>
            <p className="generator-subtitle">
              Derive addresses from a mnemonic or extended public key for ETH, BTC, LTC, BCH, and SOL.
            </p>
          </div>
        </header>

        <section className="generator-form">
          <div className="form-row">
            <div className="field-group">
              <span className="field-label">Input Type</span>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="keyType"
                    value="xpub"
                    disabled={loading}
                    checked={selectedType === "xpub"}
                    onChange={() => {
                      setSelectedType("xpub");
                      setResults([]);
                      setInputValue("");
                      setError(null);
                    }}
                  />
                  <span>Extended Public Key</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="keyType"
                    value="mnemonic"
                    disabled={loading}
                    checked={selectedType === "mnemonic"}
                    onChange={() => {
                      setSelectedType("mnemonic");
                      setResults([]);
                      setInputValue("");
                      setError(null);
                    }}
                  />
                  <span>Mnemonic</span>
                </label>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="currency-select">
                Currency
              </label>
              <select
                id="currency-select"
                className="select"
                value={currencyType}
                disabled={loading}
                onChange={(e) => {
                  setCurrencyType(
                    e.target.value as "ETH" | "BTC" | "LTC" | "BCH" | "SOL",
                  );
                  setResults([]);
                  setError(null);
                }}
              >
                <option value="ETH">ETH</option>
                <option value="BTC">BTC</option>
                <option value="LTC">LTC</option>
                <option value="BCH">BCH</option>
                <option value="SOL">SOL</option>
              </select>
            </div>
          </div>

          <div className="field-group field-group-with-action">
            <label className="field-label" htmlFor="input-value">
              {selectedType === "xpub" ? "Extended Public Key" : "Mnemonic"}
            </label>
            <textarea
              id="input-value"
              className="textarea"
              rows={2}
              placeholder={
                selectedType === "xpub"
                  ? "Enter xpub here"
                  : "Enter your 12/24-word mnemonic here"
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
            />
            <div className="actions-row">
              <button
                type="button"
                className="primary-button"
                onClick={() => deriveAddresses(1)}
                disabled={loading || !inputValue.trim()}
              >
                {loading ? "Loading..." : "Show Addresses"}
              </button>
              {error && <p className="error-text">{error}</p>}
            </div>

            {results.length > 0 && (
              <div className="results-inline">
                <div className="results-table-wrapper">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Address</th>
                        <th>Derivation Path</th>
                        {!noBalanceCurrencyDisplay.includes(currencyType) && (
                          <>
                            <th>ETH Balance</th>
                            <th>Codex Balance</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.srNo ?? r.address}>
                          <td>{r.srNo}</td>
                          <td className="mono-text">{r.address}</td>
                          <td className="mono-text">{r.path}</td>
                          {!noBalanceCurrencyDisplay.includes(currencyType) && (
                            <>
                              <td className="mono-text">{r.ethBalance}</td>
                              <td className="mono-text">{r.codexBalance}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={currentPage === 1 || loading}
                    onClick={() => deriveAddresses(Math.max(1, currentPage - 1))}
                  >
                    Prev
                  </button>
                  <span className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      currentPage * itemsPerPage >= totalItemsToDisplay || loading
                    }
                    onClick={() =>
                      deriveAddresses(Math.min(currentPage + 1, totalPages))
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
