# DispatchHub REST API Reference

Enterprise multi-tenant email dispatching API documentation for DispatchHub. 

---

## 🌐 Base URLs

| Environment | Base URL |
| :--- | :--- |
| **Public Production API** | `http://api.postal.sudhi.online/api/v1` |
| **VPS Direct (Internal/Localhost)** | `http://127.0.0.1:4000/api/v1` |
| **Local Development** | `http://localhost:4000/api/v1` |

---

## 🔐 Authentication

DispatchHub supports two authentication methods for all API endpoints:

### 1. API Key (Recommended for Microservices, Workers & Cron Jobs)
Pass your API key in the `X-API-Key` request header:
```http
X-API-Key: dh_live_master_admin_key_9988
```

### 2. JWT Bearer Token (Web Client Sessions)
Pass your JWT bearer token in the `Authorization` request header:
```http
Authorization: Bearer <your_jwt_token>
```

---

## 📨 Endpoint: Send Single Message (Instant 1-to-1 Dispatch)

Dispatches a high-priority 1-to-1 email (e.g. transactional verification, receipts, alerts, custom domain test emails) through DispatchHub's sharded queue and Postal MTA.

- **Method**: `POST`
- **Path**: `/messages/send-single`
- **Full URL**: `http://api.postal.sudhi.online/api/v1/messages/send-single` (or `http://127.0.0.1:4000/api/v1/messages/send-single`)

---

## 📋 Payload Specification

| Field | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `sender` | String | **Yes** | Sender email address belonging to your active verified custom domain. | `"dispatch@mail1.postal.test.sudhi.online"` |
| `recipient` (or `to`) | String | **Yes** | Destination recipient email address. | `"sudhiselampa19@gmail.com"` |
| `subject` | String | **Yes** | Email subject line (supports `{{param}}` interpolation). | `"DispatchHub Verification Email"` |
| `htmlContent` (or `htmlBody`) | String | **Yes** | HTML formatted body of the email. | `"<h1>Success!</h1><p>Email content...</p>"` |
| `plainContent` (or `textBody`) | String | No | Plain-text fallback. If omitted, DispatchHub automatically strips HTML tags from `htmlContent`. | `"Success! Email content..."` |
| `replyTo` (or `reply_to`) | String | No | Custom `Reply-To` address where recipient replies will be directed. | `"support@sudhi.online"` |
| `cc` | Array \| String | No | Secondary recipient email addresses. Accepts an array of strings or comma-separated string. | `["manager@sudhi.online"]` |
| `bcc` | Array \| String | No | Hidden blind carbon copy recipients. Accepts an array of strings or comma-separated string. | `["compliance@sudhi.online"]` |
| `category` | String | No | Email category for analytics and rate billing. Allowed: `TRANSACTIONAL`, `MARKETING`, `NOTIFICATION`, `TEST`. Default: `TRANSACTIONAL`. | `"TRANSACTIONAL"` |
| `brandingMode` | String | No | Branding mode. Allowed: `WHITE_LABEL` ($0.05/email, 100% white-label) or `CO_BRANDED` ($0.025/email, 50% discount with footer badge). Default: `WHITE_LABEL`. | `"WHITE_LABEL"` |
| `attachments` | Array | No | Array of SSRF-protected remote attachment objects. | `[{"filename":"invoice.pdf","url":"https://example.com/invoice.pdf"}]` |
| `parameters` (or `variables`) | Object | No | Key-value pairs for template variable substitution (`{{first_name}}`, `{{code}}`). | `{"name":"Sudhi","token":"894211"}` |
| `templateId` | String | No | UUID of a pre-saved HTML template in DispatchHub. | `"6011cbf6-1686-4510-88b8-560ad20500b0"` |

---

## 💻 Practical cURL Examples

### 1. Minimal Custom Domain Send
Send a verified custom domain email in one command:

```bash
curl -s -X POST http://127.0.0.1:4000/api/v1/messages/send-single \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dh_live_master_admin_key_9988" \
  -d '{
    "sender": "dispatch@mail1.postal.test.sudhi.online",
    "recipient": "sudhiselampa19@gmail.com",
    "category": "TRANSACTIONAL",
    "subject": "DispatchHub Live Custom Domain Email",
    "htmlContent": "<h1>Success!</h1><p>Sent from custom domain <b>mail1.postal.test.sudhi.online</b> through DispatchHub.</p>"
  }'
```

---

### 2. Full Enterprise Send (with `replyTo`, `cc`, `bcc`, and `brandingMode`)
Send an email with secondary copies, hidden recipients, custom reply routing, and custom footer:

```bash
curl -s -X POST http://127.0.0.1:4000/api/v1/messages/send-single \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dh_live_master_admin_key_9988" \
  -d '{
    "sender": "dispatch@mail1.postal.test.sudhi.online",
    "recipient": "sudhiselampa19@gmail.com",
    "replyTo": "support@sudhi.online",
    "cc": ["team@sudhi.online"],
    "bcc": ["audit@sudhi.online"],
    "category": "TRANSACTIONAL",
    "brandingMode": "WHITE_LABEL",
    "subject": "Invoice #INV-2026-9921 Available",
    "htmlContent": "<div style=\"font-family:sans-serif;padding:20px;\"><h2>Invoice #INV-2026-9921</h2><p>Your payment of $49.00 has been received successfully.</p><p>Thank you for choosing DispatchHub.</p></div>",
    "plainContent": "Invoice #INV-2026-9921: Your payment of $49.00 has been received successfully."
  }'
```

---

### 3. Remote URL Attachment Send (SSRF Protected)
Attach PDFs or receipts securely via remote URL (DispatchHub streams attachments directly into the MTA payload while blocking private network subnets):

```bash
curl -s -X POST http://127.0.0.1:4000/api/v1/messages/send-single \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dh_live_master_admin_key_9988" \
  -d '{
    "sender": "dispatch@mail1.postal.test.sudhi.online",
    "recipient": "sudhiselampa19@gmail.com",
    "category": "TRANSACTIONAL",
    "subject": "Your Monthly Statement",
    "htmlContent": "<p>Please find your monthly statement attached.</p>",
    "attachments": [
      {
        "filename": "statement-oct-2026.pdf",
        "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        "contentType": "application/pdf"
      }
    ]
  }'
```

---

### 4. Dynamic Parameter Merging (Variables)
Use `parameters` to dynamically populate `{{key}}` tokens inside the subject and HTML body:

```bash
curl -s -X POST http://127.0.0.1:4000/api/v1/messages/send-single \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dh_live_master_admin_key_9988" \
  -d '{
    "sender": "dispatch@mail1.postal.test.sudhi.online",
    "recipient": "sudhiselampa19@gmail.com",
    "category": "TRANSACTIONAL",
    "subject": "Welcome {{userName}}! Your verification code is {{otpCode}}",
    "htmlContent": "<h1>Hello, {{userName}}!</h1><p>Your one-time login code is <b>{{otpCode}}</b>.</p><p>Expires in 10 minutes.</p>",
    "parameters": {
      "userName": "Sudhi",
      "otpCode": "739201"
    }
  }'
```

---

## 📤 Successful Response Format

On successful dispatch, the API returns HTTP status `200 OK` with full tracking metadata and the unique Postal Message ID:

```json
{
  "success": true,
  "data": {
    "id": "d59858be-3a31-4485-a086-a8560a9f8b39",
    "accountId": "8922c8f1-8c99-4595-9fc9-784dc369f9b7",
    "domainId": "6011cbf6-1686-4510-88b8-560ad20500b0",
    "campaignId": null,
    "templateId": null,
    "category": "TRANSACTIONAL",
    "brandingMode": "WHITE_LABEL",
    "brandType": "NONE",
    "footerHtml": null,
    "recipient": "sudhiselampa19@gmail.com",
    "sender": "dispatch@mail1.postal.test.sudhi.online",
    "subject": "DispatchHub Live Custom Domain Email",
    "htmlBody": "<h1>Success!</h1><p>Sent from custom domain <b>mail1.postal.test.sudhi.online</b> through DispatchHub.</p>",
    "plainBody": null,
    "parameters": null,
    "attachments": null,
    "cost": "0.05",
    "status": "SENT",
    "postalMessageId": "a0a88ae5-f710-4a96-946c-10260ba93ad9@rp.postal.sudhi.online",
    "errorMessage": null,
    "assignedShard": 3,
    "claimedAt": "2026-10-31T17:34:00.315Z",
    "sentAt": "2026-10-31T17:34:00.376Z",
    "deliveredAt": null,
    "schemaVersion": "1.0.0",
    "createdAt": "2026-10-31T17:34:00.316Z"
  }
}
```

---

## ⚠️ Error Handling & Automatic Refunds

DispatchHub follows a strict **"Deduct First, Auto-Refund on Failure"** transactional integrity model:

1. **Pre-flight Debit**: When a dispatch request is received, the message cost is immediately debited from the account wallet.
2. **Instant Dispatch**: The message is assigned to a high-speed worker and submitted to the MTA.
3. **Auto-Refund on Failure**: If the MTA rejects the message (e.g. invalid recipient syntax, destination server down, or missing DNS authorization), the exact debited amount is **instantly refunded** back to your wallet with an audit ledger entry.

### Example Error Response:
```json
{
  "message": "No verified sending domain configured. Please verify SPF, DKIM, and MX DNS records under /domains before dispatching emails.",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## 🛡️ Multi-Tenant Architecture: Zero-Postal Portal Philosophy

**Why customers never access the Postal web portal:**
- Customers and tenants manage domains purely inside the DispatchHub dashboard (`/domains`) or via the DispatchHub API.
- DispatchHub generates dedicated 2048-bit RSA DKIM keypairs per domain, validates global DNS records (SPF, DKIM, MX) in real-time using public authoritative resolvers, and routes messages through Postal's MTA envelope sender.
- The underlying Postal mail server is completely abstracted as a high-performance delivery engine.
