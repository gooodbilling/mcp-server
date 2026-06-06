/**
 * GooodBilling REST API クライアント。
 *
 * - Bearer Token 自動付与
 * - 送信系には Idempotency-Key 自動生成 (UUID)
 * - エラーレスポンス (4xx/5xx) を ApiError として throw
 */

import { randomUUID } from "node:crypto";
import type { McpEnv } from "./env.js";

export interface ApiClientOptions {
  env: McpEnv;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /**
   * 送信系リクエストで指定。未指定なら UUID を自動生成する。
   * AI から同一意図の再呼出 (例: ユーザーが "送信" を 2 回連打) を防ぐ。
   */
  idempotencyKey?: string;
  /** GET 単一取得などで ETag を渡したい場合 */
  ifMatch?: string;
}

export class GooodBillingApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const { apiBaseUrl, apiToken } = this.options.env;
    const url = new URL(`${apiBaseUrl}${path}`);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const method = opts.method ?? "GET";
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiToken}`,
      Accept: "application/json",
      "User-Agent": "gooodbilling-mcp-server/0.1.0",
    };

    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    // 送信系は Idempotency-Key を必須化 — 未指定なら自動付与
    const isSendOperation = /\/(invoices|quotes)\/[^/]+\/send$/.test(path);
    if (isSendOperation) {
      headers["Idempotency-Key"] = opts.idempotencyKey ?? randomUUID();
    } else if (opts.idempotencyKey) {
      headers["Idempotency-Key"] = opts.idempotencyKey;
    }

    if (opts.ifMatch) {
      headers["If-Match"] = opts.ifMatch;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const requestId = response.headers.get("x-request-id") ?? undefined;

    if (!response.ok) {
      let code = `http_${response.status}`;
      let message = `Request failed with status ${response.status}`;
      let details: unknown;
      if (isJson) {
        try {
          const body = (await response.json()) as {
            error?: { code?: string; message?: string; details?: unknown };
          };
          if (body.error) {
            code = body.error.code ?? code;
            message = body.error.message ?? message;
            details = body.error.details;
          }
        } catch {
          // ignore parse failure
        }
      }
      throw new ApiError(response.status, code, message, requestId, details);
    }

    if (!isJson) {
      // PDF 等のバイナリレスポンスは MCP では取り扱わない (今のところ全 JSON)
      throw new ApiError(
        response.status,
        "unsupported_response",
        "Non-JSON response received from API",
        requestId,
      );
    }

    return (await response.json()) as T;
  }

  // 便宜メソッド (Task 10.3-10.5 の各ツールから呼ぶ)
  get<T>(path: string, query?: RequestOptions["query"]): Promise<T> {
    return this.request<T>(path, { method: "GET", query });
  }
  post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
    return this.request<T>(path, { method: "POST", body, idempotencyKey });
  }
  patch<T>(path: string, body: unknown, ifMatch?: string): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body, ifMatch });
  }
  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }
}
