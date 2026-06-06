import type { z } from "zod";

/**
 * MCP ツール定義の共通形 (内部使用)。
 * 配列に詰めるための共通型なので、input は unknown でキャストする。
 */
export interface ToolDef {
  name: string;
  description: string;
  inputSchema: object;
  schema: z.ZodTypeAny;
  execute(input: unknown): Promise<unknown>;
}

/**
 * Zod スキーマから input 型を推論する型安全ヘルパ。
 *
 * 使用例:
 *   defineTool({
 *     name: "search_customers",
 *     description: "...",
 *     inputSchema: { ... },
 *     schema: z.object({ query: z.string().optional() }),
 *     async execute(input) { input.query; },  // 型推論される
 *   })
 */
export function defineTool<S extends z.ZodTypeAny>(spec: {
  name: string;
  description: string;
  inputSchema: object;
  schema: S;
  execute(input: z.infer<S>): Promise<unknown>;
}): ToolDef {
  return spec as unknown as ToolDef;
}
