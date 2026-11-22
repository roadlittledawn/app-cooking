import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CookingApi } from "./api.js";
import { registerReadTools } from "./tools/read.js";
import { registerWriteTools } from "./tools/write.js";
import { registerExtractTool } from "./tools/extract.js";

export interface ServerDeps {
  api: CookingApi;
  /** For error messages that link to the /keys page. */
  authBaseUrl: string;
  /** Fetches recipe pages for extract_recipe_from_url. Default: global fetch. */
  fetchPage?: typeof fetch;
}

/** Builds the server with all tools registered. Transport-agnostic, so tests can connect in memory. */
export function createServer(deps: ServerDeps): McpServer {
  const server = new McpServer({ name: "cooking", version: "0.1.0" });
  registerReadTools(server, deps);
  registerWriteTools(server, deps);
  registerExtractTool(server, deps);
  return server;
}
