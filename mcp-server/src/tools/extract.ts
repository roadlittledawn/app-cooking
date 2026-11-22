import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServerDeps } from "../server.js";
import { extractRecipeFromUrl } from "../extract.js";
import { toolResult } from "./result.js";

export function registerExtractTool(server: McpServer, { authBaseUrl, fetchPage }: ServerDeps): void {
  server.registerTool(
    "extract_recipe_from_url",
    {
      description:
        "Read a recipe web page's structured schema.org Recipe data: name, description, yield, prep/cook/total time in minutes, ingredient lines exactly as written, and steps in order. Use it first for any recipe URL; it's exact and much smaller than the page. If it returns found: false, fall back to fetching the page another way, or ask the user to paste the recipe.",
      inputSchema: {
        url: z
          .string()
          .url()
          .refine((u) => /^https?:\/\//i.test(u), "Must be an http(s) URL")
          .describe("The recipe page, e.g. https://example.com/best-tomato-soup"),
      },
    },
    ({ url }) => toolResult(authBaseUrl, () => extractRecipeFromUrl(url, fetchPage))
  );
}
