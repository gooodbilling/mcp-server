<!-- mcp-name: io.github.gooodbilling/mcp-server -->

# @gooodbilling/mcp-server

[![npm version](https://img.shields.io/npm/v/@gooodbilling/mcp-server.svg)](https://www.npmjs.com/package/@gooodbilling/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

GooodBilling 公式 MCP Server。Claude Desktop / Cursor 等の MCP 対応クライアントから、AI ファーストで請求書・見積書を操作できます。

「A 社向け Web 制作 30 万円で請求書作って」「保守費 10 万円も追加して」「これで送信して」— PC を開かず、チャットだけで業務を完結できます。

---

## 動作要件

- Node.js 18 以上
- GooodBilling アカウントと API トークン (発行手順は下記)

## API トークンの発行

1. GooodBilling にログイン
2. `設定 > AI 連携 > API トークン` を開く
3. 「新しいトークンを発行」をクリック
4. 用途別テンプレートから選択 (Claude Desktop 推奨スコープを選ぶと簡単)
5. 表示された平文トークン (`gb_live_...`) を **1 度だけ**コピー

> ⚠️ トークンは発行時に **1 度だけ**しか表示されません。必ずすぐに MCP クライアントの設定に登録してください。

## Claude Desktop での設定

### 1. 設定ファイルを開く

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 2. `mcpServers` セクションに以下を追加

```json
{
  "mcpServers": {
    "gooodbilling": {
      "command": "npx",
      "args": ["-y", "@gooodbilling/mcp-server"],
      "env": {
        "GOOODBILLING_API_TOKEN": "gb_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### 3. Claude Desktop を再起動

ツールアイコンに `gooodbilling` が表示されれば成功です。

---

## 💡 AI への話しかけ方 (重要)

Claude / ChatGPT 等の AI は、あなたのチャットを **複数の MCP** (Gmail / Calendar / Drive / Stripe など) や **Web 検索** から拾える状態で受け取ります。「カナリア出版の連絡先教えて」とだけ言われると、AI は GooodBilling の取引先なのか実在出版社なのか判断できず、確認質問されるか Web 検索に流れます。

これを避けるため、**セッション最初の 1 発目** だけ以下のヒント語を含めてください。2 発目以降は文脈が確立されるので省略 OK です。

### 単語の 3 段階

| 段階 | 例 | プレフィックス必要? |
|---|---|---|
| **Tier 1: GooodBilling 固有語** | 請求書 / 未払い / 未入金 / 売掛 / 見積 / 案件 / インボイス | ❌ 不要 (単独で OK) |
| **Tier 2: 他システムにもある語** | 連絡先 / 売上 / 送信 / 設定 / 取引履歴 | ✅ 必要 |
| **Tier 3: 固有名詞のみ** | 会社名だけ (カナリア出版 等) | ✅ 必要 |

### プレフィックス語の選択肢

どれか 1 つ含めれば OK:

- `GooodBillingで` / `GooodBillingの`
- `請求システムの` / `請求管理の`
- `取引先の` / `顧客の` / `売上先の`
- `AI 連携の` (送信機能・設定の文脈)

### 良い例 / 悪い例

| ❌ 曖昧 (Web 検索に流れる / 確認質問される) | ✅ 確実に呼ぶ |
|---|---|
| `カナリア出版の連絡先教えて` | `取引先のカナリア出版の連絡先教えて` |
| `今月の売上どんなもん？` | `請求システムの今月の売上は？` |
| `送信機能 ON だっけ？` | `AI 連携の送信機能 ON だっけ？` |
| `あの会社の電話番号` | `顧客の○○社の電話番号` |

`請求書` `未払い` `未回収` `売掛金` `見積` `案件` のような **Tier 1 語**を含む場合はそのまま使えます:

- ✅ `カナリア出版に 5 万円で請求書出して`  ← `請求書` で確定
- ✅ `未払いある？`  ← `未払い` で確定
- ✅ `未回収教えて`  ← `未回収` で確定
- ✅ `カナリアの見積一覧見せて`  ← `見積` で確定

---

## 🔀 Stripe / 決済プロバイダ系 MCP を併用している場合

AI クライアントに **Stripe など他の請求・決済 MCP** が同時接続されていると、Tier 1 単語であっても AI 側がそちらを優先することがあります (「未払い」「請求書」等は Stripe のドメインにも存在するため)。

その環境では **最初の 1 発目に `GooodBillingで`** を付けるのが最も確実:

| フレーズ | 起こりうる挙動 (Stripe 併用時) |
|---|---|
| `未払いある？` | Stripe を優先選択する可能性 |
| `売上どう？` | Stripe Payments の売上を見に行く |
| `請求書一覧` | Stripe Invoices を優先することがある |

**対策の優先順:**

1. **ブランド名プレフィックス** (最確実): `GooodBillingで未払いある？`
2. **GooodBilling 固有用語**: `売掛金の未回収どう？` / `請求書 (発行側) の未払い見せて`
3. **文脈確立**: 最初の 1 発に `適格請求書の発行状況` 等の業務特化語を使う → 2 発目以降は省略可

---

## 📱 AI クライアント別の挙動メモ

| クライアント | プレフィックス | 備考 |
|---|---|---|
| **Claude Desktop / Cursor** | (上記ルール) | ツール権限「常に許可」推奨 |
| **ChatGPT (Custom GPTs Actions)** | 不要 | OpenAPI で 1 API のみ呼ぶため曖昧性なし |
| **LINE / Slack Bot** | 不要 | Bot 実装が GooodBilling API のみ叩く設計 |
| **Zapier / Make / n8n** | 不要 | トリガー/アクションで API 明示。スコープ最小化推奨 |

---

## 提供ツール (16 個)

### 取引先

- **`search_customers`** — 取引先を検索 (名前・カナ・メール・登録番号)

### 請求書

- **`list_invoices`** — 請求書一覧 (status / customer / 期間フィルタ)
- **`list_unpaid_invoices`** — 未入金請求書一覧 (overdue 限定可)
- **`get_invoice`** — 請求書 1 件詳細
- **`create_invoice_draft`** — 請求書ドラフト作成 (必ず `draft` 状態)
- **`update_invoice_draft`** — ドラフト部分更新 (items 配列全置換)
- **`discard_invoice_draft`** — ドラフト破棄 (draft 状態のみ)
- **`send_invoice`** — 取引先へメール送付 (idempotency-key 自動付与)

### 見積

- **`list_quotes`** — 見積一覧
- **`get_quote`** — 見積 1 件詳細
- **`create_quote_draft`** — 見積ドラフト作成
- **`update_quote_draft`** — ドラフト部分更新
- **`discard_quote_draft`** — ドラフト破棄
- **`send_quote`** — 取引先へメール送付

### レポート

- **`get_sales_summary`** — 期間集計 (請求金額・入金額・未入金額)

### テナント設定

- **`get_tenant_settings`** — 送信機能 ON/OFF、BCC 自動付与、既定税率の確認 (read-only)

---

## 「作成 → 確認 → 送信」二段階フロー (サンプル会話)

```
👤 ユーザー
「A社向けに、Web制作費 30万円で請求書ドラフトを作って」

🤖 Claude
search_customers({query: "A社"}) → cus_xxx (株式会社サンプルA)
create_invoice_draft({customer_id: "cus_xxx", title: "Web 制作費", ...})
→ { id: "inv_yyy", status: "draft", total_amount: 330000, pdf_preview_url: "..." }

「下書きを作成しました。
 取引先: 株式会社サンプルA
 合計: ¥330,000 (税込)
 [PDF を確認する](pdf_preview_url)
 内容に問題なければ『送信して』とお伝えください。」

👤 ユーザー
「保守費 10万円も追加して」

🤖 Claude
get_invoice({invoice_id: "inv_yyy"}) → 現状取得
update_invoice_draft({invoice_id: "inv_yyy", items: [Web制作費, 保守費]})
→ total_amount: 440000

「修正しました。保守費 10万円を追加し、合計 ¥440,000 になりました。
 [更新後の PDF を確認](pdf_preview_url)」

👤 ユーザー
「OK、送信して」

🤖 Claude
send_invoice({invoice_id: "inv_yyy"}) → status: "sent"

「A社の担当者様 (billing@example.com) へ送付完了しました。
 控えがあなたのメールにも届きます。」
```

---

## AI エージェント実装者向けベストプラクティス

このセクションは MCP Server を組み込むアプリケーション (LINE Bot, Slack Bot, 音声アシスタント等) の実装者向けです。AI モデルがツール呼出を組み立てる際に守ってほしい原則です。

### 1. 取引先の確定: 架空 ID を捏造しない

`create_invoice_draft` / `create_quote_draft` に渡す `customer_id` は、**必ず `search_customers` で取得した実在 ID** を使ってください。AI が記憶や推測で UUID を組み立てると 422 invalid_request が返ります。

検索結果が 0 件の場合は、新規取引先を勝手に登録せず、ユーザーに正式名称の確認を促してください。

### 2. 税率: 指定しないことを推奨

`items[].tax_rate_code` は **省略を推奨**します。サーバー側が以下の優先順位で自動補完します:

1. 商品マスタの既定税率 (description が一致する場合)
2. 取引先マスタの既定税率
3. テナント既定税率
4. 標準 10% (STD10)

AI が幻覚で軽減税率を勝手に当てる事故を構造的に避けられます。指定する場合はテナントの税率マスタに登録されたコード (例: `STD10`, `RED8`) を渡してください。

### 3. 修正前の現状把握

`update_invoice_draft` / `update_quote_draft` を呼ぶ前に、**必ず `get_invoice` / `get_quote` で最新状態を取得**し、`items[]` をメモリ上で merge してから PATCH してください。

`items[]` を含む PATCH は配列全置換のため、merge を怠ると既存明細が失われます。

### 4. 送信前の必須レビュー

`send_invoice` / `send_quote` は **取引先へメール送付を実行し、取り消し不可**です。

呼出前に必ず `pdf_preview_url` をユーザーに提示し、明示同意 (「送信して」「OK」等) を取得してください。AI が単独判断で送信することは避けてください。

### 5. 冪等性キーの扱い

送信系ツールは `idempotency_key` を省略可能です。MCP Server が UUID を自動生成して付与します。

同一送信意図 (例: ユーザーが「送信」と 2 回連続で入力した場合) では、同じ `idempotency_key` を渡すと二重送信が構造的に防止されます。

### 6. 破棄のスコープ

`discard_invoice_draft` / `discard_quote_draft` は **draft 状態の書類のみ**を破棄できます。

確定済 (`issued` / `sent` / `paid`) 書類の取消は API では行わず、ユーザーに「Web 画面での赤伝処理が必要」と案内してください。

---

## 環境変数

| 変数 | 必須 | 既定値 | 説明 |
|------|------|-------|------|
| `GOOODBILLING_API_TOKEN` | ✅ | — | API トークン (`gb_live_...`) |
| `GOOODBILLING_API_BASE_URL` | ❌ | `https://gooodbilling.com` | API ベース URL (セルフホスト / staging 用) |

---

## トラブルシューティング

### `FATAL: GOOODBILLING_API_TOKEN is not set` で起動失敗

→ MCP クライアント設定の `env` セクションにトークンが正しく設定されているか確認してください。

### 401 `invalid_token` が返る

→ トークンが失効済 / 期限切れの可能性。管理画面で再発行してください。

### 403 `insufficient_scope` が返る

→ トークンに必要なスコープが付与されていません (例: `send_invoice` には `emails:send` + `invoices:write` が必要)。管理画面でスコープを確認し、不足があれば再発行してください。

### 403 `send_disabled_by_tenant` が返る

→ テナント管理者が「AI / API 経由送信」を一時停止しています。管理画面 `設定 > AI 連携 > API トークン > 送信設定` で有効化してください。

### 422 `customer_email_missing` が返る

→ 取引先の担当者にメールアドレスが登録されていません。Web 画面で取引先担当者のメールを設定するか、`send_invoice` の `to` パラメータで明示指定してください。

---

## ライセンス

MIT
