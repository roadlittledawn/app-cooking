#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main() {
  await createServer().connect(new StdioServerTransport());
}

main().catch((error) => {
  // stdout carries the MCP protocol, so diagnostics go to stderr.
  console.error("Fatal error starting cooking MCP server:", error);
  process.exit(1);
});
