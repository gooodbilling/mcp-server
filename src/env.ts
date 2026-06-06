/**
 * 環境変数の取扱。
 *
 * 受け入れる ENV:
 *   - GOOODBILLING_API_TOKEN: 必須。APIトークン (gb_live_...)
 *   - GOOODBILLING_API_BASE_URL: 任意。既定: https://gooodbilling.com
 *
 * 不正・欠落時は process.stderr へエラーを出し process.exit(1)。
 */

const DEFAULT_BASE_URL = "https://gooodbilling.com";

export interface McpEnv {
  apiToken: string;
  apiBaseUrl: string;
}

export function loadEnv(): McpEnv {
  const apiToken = process.env.GOOODBILLING_API_TOKEN;
  if (!apiToken || apiToken.trim().length === 0) {
    process.stderr.write(
      "[gooodbilling-mcp] FATAL: GOOODBILLING_API_TOKEN is not set.\n" +
        "Set it in your MCP client config (e.g. Claude Desktop mcpServers env).\n" +
        "Visit https://gooodbilling.com/settings/api-tokens to issue a token.\n",
    );
    process.exit(1);
  }

  const apiBaseUrl = (
    process.env.GOOODBILLING_API_BASE_URL ?? DEFAULT_BASE_URL
  ).replace(/\/$/, "");

  return { apiToken, apiBaseUrl };
}
