import { z } from "zod";
import type { GooodBillingApiClient } from "../client.js";
import { defineTool, type ToolDef } from "./types.js";

/**
 * テナント API 設定の自己診断 tool。
 *
 * 「送信機能 ON だっけ？」「BCC 自動付与どうなってる？」のような
 * 状態確認系のユーザー質問に Claude が自答できるようにする read-only ツール。
 * 設定変更は AI に許可しない (UI からのみ)。
 */
export function createSettingsTools(client: GooodBillingApiClient): ToolDef[] {
  return [
    defineTool({
      name: "get_tenant_settings",
      description: "テナント設定 (送信機能 ON/OFF) を取得。",
      inputSchema: {
        type: "object",
        properties: {},
      },
      schema: z.object({}),
      async execute() {
        return client.get("/api/v1/settings/tenant");
      },
    }),
  ];
}
