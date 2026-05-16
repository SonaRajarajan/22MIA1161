/**
 * @file utils/logger.ts
 * @description Frontend logger — wraps the logging middleware for frontend use.
 *              Since the middleware package is a sibling (not on npm), we call
 *              the backend proxy which forwards logs to the AffordMed server.
 *              This keeps the frontend's access_token server-side only.
 */

import axios from "axios";

type Stack = "frontend";
type Level = "debug" | "info" | "warn" | "error" | "fatal";
type Package = "component" | "hook" | "page" | "state" | "utils" | "auth" | "config" | "middleware";

/**
 * Send a structured frontend log via the backend proxy.
 * Mirrors the Log(stack, level, package, message) signature.
 */
export async function Log(
  stack: Stack,
  level: Level,
  pkg: Package,
  message: string
): Promise<void> {
  // Console echo in development
  const prefix = `[FE] [${level.toUpperCase()}] [${pkg}]`;
  if (level === "error" || level === "fatal") {
    console.error(prefix, message);
  } else if (level === "warn") {
    console.warn(prefix, message);
  } else {
    console.log(prefix, message);
  }

  try {
    // POST to backend proxy — backend forwards to AffordMed with its access_token
    await axios.post("/api/v1/logs", { stack, level, package: pkg, message });
  } catch {
    // Silently fail — never crash the UI due to a log failure
  }
}

export const logInfo = (pkg: Package, msg: string) => Log("frontend", "info", pkg, msg);
export const logWarn = (pkg: Package, msg: string) => Log("frontend", "warn", pkg, msg);
export const logError = (pkg: Package, msg: string) => Log("frontend", "error", pkg, msg);
export const logDebug = (pkg: Package, msg: string) => Log("frontend", "debug", pkg, msg);
