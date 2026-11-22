import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toolErrorMessage } from "../errors.js";

/** Run a tool body: compact JSON on success, a readable `isError` result on failure. */
export async function toolResult(
  authBaseUrl: string,
  fn: () => Promise<unknown>
): Promise<CallToolResult> {
  try {
    return { content: [{ type: "text", text: JSON.stringify(await fn()) }] };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: toolErrorMessage(err, authBaseUrl) }] };
  }
}
