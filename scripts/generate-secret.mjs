#!/usr/bin/env node
// Prints fresh random values for AUTH_SECRET and TOKEN_ENCRYPTION_KEY.
import { randomBytes } from "node:crypto";

console.log(`AUTH_SECRET=${randomBytes(48).toString("base64url")}`);
console.log(`TOKEN_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`);
