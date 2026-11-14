import { randomBytes } from "node:crypto";

// 12 URL-safe characters, for example "q3Zk-8wT_xLm"
export function generateTempPassword() {
  return randomBytes(9).toString("base64url");
}
