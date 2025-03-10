import crypto from "crypto";
// Utility functions for PKCE
export const generateRandomString = (length: number): string =>
  crypto.randomBytes(length).toString("hex").slice(0, length);

export const generateCodeVerifier = (): string => generateRandomString(64);

export const generateCodeChallenge = (verifier: string): string =>
  crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
