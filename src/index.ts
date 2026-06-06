#!/usr/bin/env node
/**
 * GooodBilling MCP Server エントリポイント。
 *
 * 使い方:
 *   GOOODBILLING_API_TOKEN=gb_live_xxx npx @gooodbilling/mcp-server
 *
 * Claude Desktop の場合は `~/Library/Application Support/Claude/claude_desktop_config.json`
 * の `mcpServers` セクションに以下を追加 (詳細は README 参照):
 *
 *   "gooodbilling": {
 *     "command": "npx",
 *     "args": ["-y", "@gooodbilling/mcp-server"],
 *     "env": { "GOOODBILLING_API_TOKEN": "gb_live_xxx" }
 *   }
 */

import { startMcpServer } from "./server.js";

startMcpServer().catch((e: unknown) => {
  process.stderr.write(
    `[gooodbilling-mcp] FATAL: ${e instanceof Error ? e.stack ?? e.message : String(e)}\n`,
  );
  process.exit(1);
});
