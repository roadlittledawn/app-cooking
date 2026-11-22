export interface Config {
  /** ca_key_… for the `cooking` app. Missing → tools explain how to get one. */
  apiKey: string | undefined;
  cookingBaseUrl: string;
  authBaseUrl: string;
}

/** Defaults are production; mcp-server/.env overrides them for local dev (R12). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const trim = (url: string) => url.replace(/\/+$/, "");
  return {
    apiKey: env.CLANG_AUTH_API_KEY?.trim() || undefined,
    cookingBaseUrl: trim(env.COOKING_BASE_URL?.trim() || "https://cooking.clintonlangosch.com"),
    authBaseUrl: trim(env.AUTH_BASE_URL?.trim() || "https://auth.clintonlangosch.com"),
  };
}
