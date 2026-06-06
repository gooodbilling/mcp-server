import { z } from "zod";
import type { GooodBillingApiClient } from "../client.js";
import { defineTool, type ToolDef } from "./types.js";

export function createReportTools(client: GooodBillingApiClient): ToolDef[] {
  return [
    defineTool({
      name: "get_sales_summary",
      description: "売上集計 (期間指定)。",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string", format: "date", description: "集計開始日 (発行日基準)" },
          to: { type: "string", format: "date", description: "集計終了日 (発行日基準)" },
        },
        required: ["from", "to"],
      },
      schema: z.object({
        from: z.string(),
        to: z.string(),
      }),
      async execute(input) {
        return client.get("/api/v1/reports/sales-summary", input);
      },
    }),
  ];
}
