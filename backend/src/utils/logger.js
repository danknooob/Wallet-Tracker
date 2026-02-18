// Use a simple console logger for packaged builds to avoid pkg/pino issues
// pkg has trouble bundling pino's native dependencies
// Import pino - esbuild marks as external, becomes require() after bundling
// We copy node_modules/pino to temp directory so pkg can resolve require('pino')
import pino from "pino";
import pretty from "pino-pretty";

const isPkg = typeof process.pkg !== 'undefined';

let logger;

if (isPkg) {
  // Simple console logger for packaged builds with pretty JSON formatting
  // Supports pino-style calls: logger.info({obj}, "message") or logger.info("message")
  const formatLog = (level, ...args) => {
    const timestamp = new Date().toISOString();
    let logEntry = { timestamp, level };
    
    // Helper to serialize Error objects properly
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
          ...(err.port !== undefined && { port: err.port })
        };
      }
      return err;
    };
    
    // Handle different call patterns:
    // logger.info({obj}, "message") - pino style
    // logger.info("message") - simple string
    // logger.info({obj}) - object only
    if (args.length === 0) {
      return JSON.stringify(logEntry, null, 2);
    }
    
    // Check if first arg is an object and second is a string (pino style)
    if (args.length >= 2 && typeof args[0] === 'object' && args[0] !== null && typeof args[1] === 'string') {
      const obj = args[0];
      // Serialize any Error objects in the object
      const serializedObj = Object.keys(obj).reduce((acc, key) => {
        acc[key] = obj[key] instanceof Error ? serializeError(obj[key]) : obj[key];
        return acc;
      }, {});
      logEntry = { ...logEntry, ...serializedObj, message: args[1] };
    } 
    // Check if first arg is an object
    else if (typeof args[0] === 'object' && args[0] !== null) {
      const obj = args[0];
      if (obj instanceof Error) {
        logEntry = { ...logEntry, ...serializeError(obj) };
      } else {
        // Serialize any Error objects nested in the object
        const serializedObj = Object.keys(obj).reduce((acc, key) => {
          acc[key] = obj[key] instanceof Error ? serializeError(obj[key]) : obj[key];
          return acc;
        }, {});
        logEntry = { ...logEntry, ...serializedObj };
      }
    }
    // First arg is a string or other primitive
    else {
      logEntry.message = String(args[0]);
      // If there are more args, include them
      if (args.length > 1) {
        logEntry.additional = args.slice(1).map(arg => 
          arg instanceof Error ? serializeError(arg) : arg
        );
      }
    }
    
    // Format as pretty JSON with 2-space indentation
    return JSON.stringify(logEntry, null, 2);
  };
  
  logger = {
    info: (...args) => {
      console.log(formatLog('INFO', ...args));
    },
    error: (...args) => {
      console.error(formatLog('ERROR', ...args));
    },
    warn: (...args) => {
      console.warn(formatLog('WARN', ...args));
    },
    debug: (...args) => {
      console.log(formatLog('DEBUG', ...args));
    },
  };
} else {
  // Use pino for development
  // pino is imported at top level - esbuild marks as external, becomes require() after bundling
  // We copy node_modules/pino to temp directory so pkg can resolve require('pino')
  try {
    
    const isProd = process.env.NODE_ENV === "production";
    const level = process.env.LOG_LEVEL || "info";

    const stream = isProd
      ? process.stdout
      : pretty({
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        });

    logger = pino({ level }, stream);
  } catch (e) {
    // Fallback to console logger if pino fails to load
    console.warn("Failed to load pino, using console logger:", e.message);
    const formatLog = (level, ...args) => {
      const timestamp = new Date().toISOString();
      let logEntry = { timestamp, level };
      
      // Helper to serialize Error objects properly
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
            ...(err.port !== undefined && { port: err.port })
          };
        }
        return err;
      };
      
      // Handle different call patterns:
      // logger.info({obj}, "message") - pino style
      // logger.info("message") - simple string
      // logger.info({obj}) - object only
      if (args.length === 0) {
        return JSON.stringify(logEntry, null, 2);
      }
      
      // Check if first arg is an object and second is a string (pino style)
      if (args.length >= 2 && typeof args[0] === 'object' && args[0] !== null && typeof args[1] === 'string') {
        const obj = args[0];
        // Serialize any Error objects in the object
        const serializedObj = Object.keys(obj).reduce((acc, key) => {
          acc[key] = obj[key] instanceof Error ? serializeError(obj[key]) : obj[key];
          return acc;
        }, {});
        logEntry = { ...logEntry, ...serializedObj, message: args[1] };
      } 
      // Check if first arg is an object
      else if (typeof args[0] === 'object' && args[0] !== null) {
        const obj = args[0];
        if (obj instanceof Error) {
          logEntry = { ...logEntry, ...serializeError(obj) };
        } else {
          // Serialize any Error objects nested in the object
          const serializedObj = Object.keys(obj).reduce((acc, key) => {
            acc[key] = obj[key] instanceof Error ? serializeError(obj[key]) : obj[key];
            return acc;
          }, {});
          logEntry = { ...logEntry, ...serializedObj };
        }
      }
      // First arg is a string or other primitive
      else {
        logEntry.message = String(args[0]);
        // If there are more args, include them
        if (args.length > 1) {
          logEntry.additional = args.slice(1).map(arg => 
            arg instanceof Error ? serializeError(arg) : arg
          );
        }
      }
      
      // Format as pretty JSON with 2-space indentation
      return JSON.stringify(logEntry, null, 2);
    };
    logger = {
      info: (...args) => console.log(formatLog('INFO', ...args)),
      error: (...args) => console.error(formatLog('ERROR', ...args)),
      warn: (...args) => console.warn(formatLog('WARN', ...args)),
      debug: (...args) => console.log(formatLog('DEBUG', ...args)),
    };
  }
}

export default logger;
