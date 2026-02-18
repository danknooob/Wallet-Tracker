// Simple JSON console logger with a pino-like API.
// Deliberately avoids pino in runtime code so pkg doesn't need to bundle pino
// or its transitive dependencies (like @pinojs/redact).

const formatLog = (level, ...args) => {
  const timestamp = new Date().toISOString();
  let logEntry = { timestamp, level };

  const serializeError = (err) => {
    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
        ...(err.errno !== undefined && { errno: err.errno }),
        ...(err.syscall && { syscall: err.syscall }),
        ...(err.address && { address: err.address }),
        ...(err.port !== undefined && { port: err.port }),
      };
    }
    return err;
  };

  // No args: just timestamp + level
  if (args.length === 0) {
    return JSON.stringify(logEntry, null, 2);
  }

  // pino-style: logger.info({ obj }, "message")
  if (
    args.length >= 2 &&
    typeof args[0] === "object" &&
    args[0] !== null &&
    typeof args[1] === "string"
  ) {
    const obj = args[0];
    const serializedObj = Object.keys(obj).reduce((acc, key) => {
      acc[key] = obj[key] instanceof Error ? serializeError(obj[key]) : obj[key];
      return acc;
    }, {});
    logEntry = { ...logEntry, ...serializedObj, message: args[1] };
  }
  // Object-only: logger.info({ obj })
  else if (typeof args[0] === "object" && args[0] !== null) {
    const obj = args[0];
    if (obj instanceof Error) {
      logEntry = { ...logEntry, ...serializeError(obj) };
    } else {
      const serializedObj = Object.keys(obj).reduce((acc, key) => {
        acc[key] = obj[key] instanceof Error ? serializeError(obj[key]) : obj[key];
        return acc;
      }, {});
      logEntry = { ...logEntry, ...serializedObj };
    }
  }
  // Primitive/string: logger.info("message", ...extra)
  else {
    logEntry.message = String(args[0]);
    if (args.length > 1) {
      logEntry.additional = args.slice(1).map((arg) =>
        arg instanceof Error ? serializeError(arg) : arg
      );
    }
  }

  return JSON.stringify(logEntry, null, 2);
};

const logger = {
  info: (...args) => console.log(formatLog("INFO", ...args)),
  error: (...args) => console.error(formatLog("ERROR", ...args)),
  warn: (...args) => console.warn(formatLog("WARN", ...args)),
  debug: (...args) => console.log(formatLog("DEBUG", ...args)),
};

export default logger;
