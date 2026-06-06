import { z } from "zod";
import type { GooodBillingApiClient } from "../client.js";
import { defineTool, type ToolDef } from "./types.js";

const ItemSchemaJson = {
  type: "object",
  properties: {
    description: { type: "string" },
    quantity: { type: "number" },
    unit_price: { type: "number" },
    tax_rate_code: {
      type: "string",
      description:
        "省略推奨。サーバー側が「商品マスタ→取引先既定→テナント既定→標準10%」の順で自動補完する。指定する場合はテナントの税率マスタに登録された code (例: STD10, RED8)",
    },
    unit: { type: "string" },
  },
  required: ["description", "quantity", "unit_price"],
} as const;

const itemZod = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  tax_rate_code: z.string().optional(),
  unit: z.string().optional(),
});

export function createInvoiceTools(client: GooodBillingApiClient): ToolDef[] {
  return [
    defineTool({
      name: "list_invoices",
      description: "請求書の一覧。",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["draft", "issued", "sent", "paid", "overdue", "cancelled"],
          },
          customer_id: { type: "string", format: "uuid" },
          from: { type: "string", format: "date" },
          to: { type: "string", format: "date" },
          limit: { type: "integer", minimum: 1, maximum: 200 },
          cursor: { type: "string" },
        },
      },
      schema: z.object({
        status: z
          .enum(["draft", "issued", "sent", "paid", "overdue", "cancelled"])
          .optional(),
        customer_id: z.string().uuid().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        cursor: z.string().optional(),
      }),
      async execute(input) {
        return client.get("/api/v1/invoices", input);
      },
    }),

    defineTool({
      name: "list_unpaid_invoices",
      description: "未払い請求書の一覧。",
      inputSchema: {
        type: "object",
        properties: {
          overdue_only: {
            type: "boolean",
            description: "期日超過分のみ取得 (既定: false)",
          },
        },
      },
      schema: z.object({
        overdue_only: z.boolean().optional(),
      }),
      async execute(input) {
        return client.get("/api/v1/invoices/unpaid", {
          overdue_only: input.overdue_only ? "true" : undefined,
        });
      },
    }),

    defineTool({
      name: "get_invoice",
      description: "請求書の詳細。",
      inputSchema: {
        type: "object",
        properties: {
          invoice_id: { type: "string", format: "uuid" },
        },
        required: ["invoice_id"],
      },
      schema: z.object({ invoice_id: z.string().uuid() }),
      async execute(input) {
        return client.get(`/api/v1/invoices/${input.invoice_id}`);
      },
    }),

    defineTool({
      name: "create_invoice_draft",
      description: "請求書を新規作成 (status=draft)。",
      inputSchema: {
        type: "object",
        properties: {
          customer_id: { type: "string", format: "uuid" },
          case_id: {
            type: "string",
            format: "uuid",
            description: "任意。未指定時はサーバーが自動解決",
          },
          title: { type: "string" },
          issue_date: { type: "string", format: "date" },
          due_date: { type: "string", format: "date" },
          items: { type: "array", items: ItemSchemaJson, minItems: 1 },
          notes: { type: "string" },
        },
        required: ["customer_id", "title", "issue_date", "due_date", "items"],
      },
      schema: z.object({
        customer_id: z.string().uuid(),
        case_id: z.string().uuid().optional(),
        title: z.string().min(1),
        issue_date: z.string(),
        due_date: z.string(),
        items: z.array(itemZod).min(1),
        notes: z.string().optional(),
      }),
      async execute(input) {
        return client.post("/api/v1/invoices/drafts", input);
      },
    }),

    defineTool({
      name: "update_invoice_draft",
      description: "請求書ドラフトを更新。",
      inputSchema: {
        type: "object",
        properties: {
          invoice_id: { type: "string", format: "uuid" },
          customer_id: {
            type: "string",
            format: "uuid",
            description: "変更時は case_id が新顧客向けに再解決される",
          },
          case_id: { type: "string", format: "uuid" },
          title: { type: "string" },
          issue_date: { type: "string", format: "date" },
          due_date: { type: "string", format: "date" },
          items: { type: "array", items: ItemSchemaJson },
          notes: { type: "string" },
        },
        required: ["invoice_id"],
      },
      schema: z.object({
        invoice_id: z.string().uuid(),
        customer_id: z.string().uuid().optional(),
        case_id: z.string().uuid().optional(),
        title: z.string().optional(),
        issue_date: z.string().optional(),
        due_date: z.string().optional(),
        items: z.array(itemZod).optional(),
        notes: z.string().optional(),
      }),
      async execute(input) {
        const { invoice_id, ...patch } = input;
        return client.patch(`/api/v1/invoices/drafts/${invoice_id}`, patch);
      },
    }),

    defineTool({
      name: "discard_invoice_draft",
      description: "請求書ドラフトを破棄。",
      inputSchema: {
        type: "object",
        properties: {
          invoice_id: { type: "string", format: "uuid" },
        },
        required: ["invoice_id"],
      },
      schema: z.object({ invoice_id: z.string().uuid() }),
      async execute(input) {
        await client.delete(`/api/v1/invoices/drafts/${input.invoice_id}`);
        return { ok: true, message: "Draft discarded." };
      },
    }),

    defineTool({
      name: "send_invoice",
      description:
        "⚠️ 取引先に請求書メールを送付する (取り消し不可)。" +
        "送信前にユーザーへ宛先メールアドレス・請求書金額・添付 PDF の最終確認を取ること。" +
        "subject / body / to / cc / bcc は通常省略する (システムが自動で組み立てる)。ユーザーが明示的に上書き指定した場合のみ含め、その時だけ確認文に含めること。" +
        "失敗時: 403=テナント送信機能 OFF (get_tenant_settings で確認可) / 422=取引先メアド未登録 / 409=送信済。" +
        "冪等性キーは省略可 (自動生成、二重送信防止)。",
      inputSchema: {
        type: "object",
        properties: {
          invoice_id: { type: "string", format: "uuid" },
          idempotency_key: { type: "string" },
          to: { type: "array", items: { type: "string" } },
          cc: { type: "array", items: { type: "string" } },
          bcc: { type: "array", items: { type: "string" } },
          subject: { type: "string" },
          body: { type: "string" },
        },
        required: ["invoice_id"],
      },
      schema: z.object({
        invoice_id: z.string().uuid(),
        idempotency_key: z.string().optional(),
        to: z.array(z.string().email()).optional(),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
      }),
      async execute(input) {
        const { invoice_id, idempotency_key, ...body } = input;
        return client.post(
          `/api/v1/invoices/${invoice_id}/send`,
          body,
          idempotency_key,
        );
      },
    }),
  ];
}
