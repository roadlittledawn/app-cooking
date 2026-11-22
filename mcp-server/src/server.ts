import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/** Builds the server with all tools registered. Transport-agnostic, so tests can connect in memory. */
export function createServer(): McpServer {
  const server = new McpServer({ name: "cooking", version: "0.1.0" });

  // Placeholder until the real tools land (plan task 4).
  server.registerTool(
    "ping",
    {
      description: "Check that the cooking MCP server is running. Returns 'pong'.",
      inputSchema: {},
    },
    async () => ({ content: [{ type: "text", text: "pong" }] })
  );

  return server;
}
