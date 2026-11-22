import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CookingApi } from "./api.js";
import { registerReadTools } from "./tools/read.js";

export interface ServerDeps {
  api: CookingApi;
  /** For error messages that link to the /keys page. */
  authBaseUrl: string;
}

/** Builds the server with all tools registered. Transport-agnostic, so tests can connect in memory. */
export function createServer(deps: ServerDeps): McpServer {
  const server = new McpServer({ name: "cooking", version: "0.1.0" });
  registerReadTools(server, deps);
  return server;
}
