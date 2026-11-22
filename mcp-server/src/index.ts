#!/usr/bin/env node
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { cookingApi, MissingApiKeyError } from "./api.js";
import { apiKeyClient } from "./auth.js";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";

// mcp-server/.env, whatever the cwd (Claude Code starts us from the repo root).
// `quiet`: dotenv otherwise logs to stdout, which carries the MCP protocol.
const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, "../.env"), quiet: true });

async function main() {
  const config = loadConfig();
  const authFetch = config.apiKey
    ? apiKeyClient({ authBaseUrl: config.authBaseUrl, apiKey: config.apiKey }).fetch
    : async (): Promise<Response> => {
        throw new MissingApiKeyError();
      };

  const server = createServer({
    api: cookingApi(config.cookingBaseUrl, authFetch),
    authBaseUrl: config.authBaseUrl,
  });
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  // stdout carries the MCP protocol, so diagnostics go to stderr.
  console.error("Fatal error starting cooking MCP server:", error);
  process.exit(1);
});
