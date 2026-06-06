import type { GooodBillingApiClient } from "../client.js";
import { createCustomerTools } from "./customers.js";
import { createInvoiceTools } from "./invoices.js";
import { createQuoteTools } from "./quotes.js";
import { createReportTools } from "./reports.js";
import { createSettingsTools } from "./settings.js";
import type { ToolDef } from "./types.js";

/**
 * 全 MCP ツールを構築して返す (16 ツール)。
 *
 * - 取引先: search_customers
 * - 請求書: list / get / create_draft / update_draft / discard_draft / send (+ list_unpaid)
 * - 見積: list / get / create_draft / update_draft / discard_draft / send
 * - レポート: get_sales_summary
 * - 設定: get_tenant_settings
 */
export function createAllTools(client: GooodBillingApiClient): ToolDef[] {
  return [
    ...createCustomerTools(client),
    ...createInvoiceTools(client),
    ...createQuoteTools(client),
    ...createReportTools(client),
    ...createSettingsTools(client),
  ];
}

export type { ToolDef };
