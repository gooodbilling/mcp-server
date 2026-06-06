import { z } from "zod";
import type { GooodBillingApiClient } from "../client.js";
import { defineTool, type ToolDef } from "./types.js";

export function createCustomerTools(client: GooodBillingApiClient): ToolDef[] {
  return [
    defineTool({
      name: "search_customers",
      description: "取引先を検索する。",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "顧客名・略称・メール・登録番号への部分一致検索キーワード",
          },
          contact_name: {
            type: "string",
            description: "担当者氏名で絞り込み (例: 「山田」「佐藤」)",
          },
          limit: {
            type: "integer",
            description: "取得件数 (既定: 20, 上限: 200)",
            minimum: 1,
            maximum: 200,
          },
        },
      },
      schema: z.object({
        query: z.string().optional(),
        contact_name: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
      async execute(input) {
        return client.get("/api/v1/customers", {
          query: input.query,
          contact_name: input.contact_name,
          limit: input.limit,
        });
      },
    }),
  ];
}
