# Final Product Requirements Document  
## FinPilot Bharat — Autonomous AI Fractional CFO & Reconciliation Agent for Indian SMEs

**Version:** 1.0  
**Status:** Final — Approved for Build  
**Document Type:** Product Requirements Document  
**Primary Audience:** Engineering, Design, Product, Evaluation, Security  
**Build Context:** Portfolio-grade production simulation using mocked external APIs  

---

## 1. Executive Summary

FinPilot Bharat is an autonomous, mobile-first AI financial operations agent for Indian startups and SMEs. It ingests messy financial data from payment gateways, bank/Open Banking sources, connected inboxes, and credit ledgers, then resolves transaction anomalies, reconciles UPI inflows, tracks customer credit (“udhaari”), and delivers actionable financial nudges through WhatsApp and a mobile-first responsive web app.

The product is designed as a **smart central reconciliation layer** for business owners who know their daily earnings but lack clarity on:

- which customer paid,
- what was sold,
- which payment cleared old credit,
- which transactions are missing receipts,
- which customers still owe money,
- and whether cash flow is trending toward a runway problem.

The system uses **bounded agentic AI** for semantic resolution, evidence gathering, classification proposals, and user-friendly summaries. All final financial writes, compliance checks, and sensitive actions are controlled by deterministic guardrails, policy engines, and audit logging.

For this portfolio build, all external integrations are simulated using **Mockoon**, while the architecture is designed to support production adapters later.

---

## 2. Problem Statement

### 2.1 Core Problem

Micro-SMBs and early-stage startups operate with minimal financial oversight. Bookkeeping is retrospective, fragmented, and manual. Financial records are spread across:

- bank statements,
- UPI transaction notifications,
- payment gateway settlements,
- WhatsApp messages,
- email invoices,
- paper registers,
- POS systems,
- credit ledgers such as Khatabook-like tools.

This causes:

- uncategorized transactions,
- unreconciled UPI payments,
- missed receipts,
- unclear customer credit balances,
- delayed cash-flow awareness,
- tax reporting gaps,
- and avoidable financial stress.

### 2.2 Indian SME Reality

Traditional accounting and POS tools are often not suited to ground-level Indian SME behavior.

Real-world issues include:

1. **Messy UPI descriptors**  
   Bank statements often show entries like:
   ```text
   UPI/CR/983472/RAHUL K/OKAXIS
   ```
   The business owner may know money came in, but not always which customer or invoice it belongs to.

2. **Daily earnings known, itemization unknown**  
   The shop owner may know “today ₹18,000 came in,” but not exactly:
   - which products were sold,
   - at what price,
   - to which customer,
   - whether the payment cleared old credit or was a new sale.

3. **Credit / Udhaari management is painful**  
   Lending and customer credit are central to Indian SME operations. The biggest operational issues are:
   - tracking who owes money,
   - matching partial payments,
   - sending reminders without damaging customer relationships,
   - maintaining an accurate credit ledger.

4. **Traditional POS is not user-friendly**  
   Many POS systems are desktop-first, form-heavy, and designed for accountants. Indian SME owners need a mobile-first, one-thumb, fast-entry experience.

5. **WhatsApp is the real workflow surface**  
   Most SME owners are comfortable with WhatsApp. Financial nudges, quick replies, and simple confirmations are more effective than forcing users into complex accounting dashboards.

---

## 3. Product Vision

Build an **autonomous AI fractional CFO agent** that becomes the smart central point for Indian SME financial clarity.

The product should:

- ingest messy financial data,
- resolve anomalies automatically where safe,
- reconcile UPI and credit payments,
- track customer udhaari,
- request missing evidence,
- send WhatsApp-based quick actions,
- provide a mobile-first control surface,
- and maintain a full audit trail.

### Vision Statement

> FinPilot Bharat transforms messy SME financial data into clear, actionable, conversational financial control — with AI doing the reconciliation and humans staying in control.

---

## 4. Target Users

## 4.1 Primary User: SME Owner / Operator

Examples:

- kirana store owner,
- local trader or distributor,
- D2C brand founder,
- service agency owner,
- small restaurant or cafe owner,
- freelancer or consultant.

Characteristics:

- mobile-first,
- WhatsApp-heavy,
- not accounting-expert,
- needs clarity fast,
- cares about daily cash flow and udhaari,
- does not want complex bookkeeping UI.

## 4.2 Secondary User: Accountant / Bookkeeper

Characteristics:

- needs clean ledger entries,
- needs audit trail,
- needs receipt evidence,
- needs category consistency,
- may review AI proposals.

## 4.3 Negative User

This product is not initially designed for:

- large enterprises,
- complex ERP environments,
- companies needing full payroll,
- companies needing statutory tax filing automation,
- high-frequency trading or treasury operations.

---

## 5. Product Principles

1. **Agent proposes, system validates**  
   The AI agent never has unchecked authority to write financial records.

2. **Evidence before action**  
   Classification and reconciliation must be grounded in transaction data, receipts, ledger context, or explicit user confirmation.

3. **Mobile-first by default**  
   The primary UI must work beautifully on a phone browser before desktop enhancement.

4. **WhatsApp for engagement, app for truth**  
   WhatsApp is used for nudges, quick replies, and alerts. The web app remains the authoritative source of record.

5. **Conservative automation**  
   The system should prefer asking the user over making risky assumptions.

6. **Privacy by design**  
   Mailbox access must be bounded. Personal conversations must not be scanned or stored.

7. **Auditability is mandatory**  
   Every AI proposal, guardrail decision, ledger update, and user response must be logged.

8. **Evaluation-driven development**  
   The system must be tested against adversarial golden datasets, not only happy-path demos.

---

## 6. Business Objectives

### 6.1 Primary Objective

Provide institutional-grade proactive financial oversight to startups and SMEs without requiring a human fractional CFO.

### 6.2 Secondary Objectives

- Reduce manual bookkeeping effort.
- Increase timely reconciliation of transactions.
- Improve visibility into customer credit.
- Improve cash-flow awareness.
- Increase owner engagement through WhatsApp.
- Reduce tax reporting gaps caused by uncategorized expenses.

---

## 7. Key Metrics for Success

## 7.1 Original PRD KPIs

| KPI              |  Target | Meaning                                                |
| ---------------- | ------: | ------------------------------------------------------ |
| Automation Rate  |   > 92% | Uncategorized transactions resolved without user input |
| Engagement Rate  |   > 75% | Weekly active response rate on WhatsApp notifications  |
| Runway Detection | 45 days | Detect runway shortfalls at least 45 days in advance   |

## 7.2 Additional Product Quality KPIs

| Metric                             |     Target | Meaning                                     |
| ---------------------------------- | ---------: | ------------------------------------------- |
| Classification Accuracy            |      > 90% | Correct category against golden dataset     |
| Evidence Match Precision           |      > 90% | Correct receipt/evidence matched            |
| False Auto-Post Rate               |       < 1% | Incorrect entries automatically written     |
| Guardrail Catch Rate               |       100% | Known adversarial violations blocked        |
| Hallucination Rate                 |       < 2% | Unsupported claims in AI proposals          |
| WhatsApp Response Completion       |      > 60% | Users complete requested action             |
| P95 Transaction Resolution Latency |      < 15s | Time from anomaly to proposal/action        |
| P95 Agent Run Cost                 | Controlled | Cost per resolved transaction within budget |

---

## 8. Product Scope

## 8.1 In Scope for MVP

The MVP will include:

1. Mocked multichannel financial data ingestion.
2. Canonical transaction normalization.
3. Anomaly detection.
4. Bounded inbox receipt search.
5. Agentic semantic resolution using Pydantic AI.
6. Deterministic guardrail engine.
7. Ledger classification proposals.
8. Auto-posting for high-confidence safe cases.
9. WhatsApp quick-reply loop.
10. Udhaari/customer credit ledger reconciliation.
11. Mobile-first responsive web UI.
12. Audit logging and explainability.
13. Evaluation harness with adversarial test cases.
14. Mockoon-based API sandbox for all external integrations.

## 8.2 Out of Scope for MVP

The following are explicitly out of scope for the current build:

1. Native React Native mobile app.
2. Full inventory management.
3. Full POS hardware integration.
4. Payroll processing.
5. Tax filing.
6. GST return submission.
7. Money movement or payout initiation.
8. Lending underwriting or credit scoring.
9. Multi-entity enterprise consolidation.
10. Real production banking credentials.

React Native may be considered later, but the current scope is responsive web first.

---

## 9. Core Use Cases

## 9.1 Use Case 1: Ambiguous Bank Transaction

A bank transaction appears as:

```text
UPI/DR/984372/ACME*SRV/PAYTM
```

The system:

1. Flags it as ambiguous.
2. Searches inbox for matching receipt using amount, date, and merchant keywords.
3. Uses AI to propose a category.
4. Applies guardrails.
5. Either auto-posts or asks the user via WhatsApp.

---

## 9.2 Use Case 2: UPI Payment Against Udhaari

A customer owes ₹1,200. They pay ₹500 via UPI.

The system:

1. Detects ₹500 UPI inflow.
2. Matches customer using name/VPA/contact context.
3. Identifies open udhaari balance.
4. Proposes partial credit clearance.
5. Updates customer ledger.
6. Sends confirmation to owner.
7. Optionally sends receipt/reminder to customer.

---

## 9.3 Use Case 3: Missing Receipt

A transaction of ₹899 occurs but no receipt is found.

The system:

1. Searches bounded inbox.
2. Fails to find matching evidence.
3. Sets low confidence.
4. Sends WhatsApp nudge:
   ```text
   ₹899 spent at POS-SWIGGY.
   Is this a business expense?
   
   [Business] [Personal] [Add receipt] [Ask later]
   ```

---

## 9.4 Use Case 4: High-Value Transaction

A transaction of ₹125,000 occurs.

Even if AI confidence is high, the guardrail forces human review because the amount exceeds the safe auto-post threshold.

---

## 9.5 Use Case 5: Runway Alert

Deterministic forecasting detects that cash balance may fall below a threshold in 40 days.

The agent generates:

```text
Alert: Your runway may drop below 45 days by November 21.
Main drivers:
- Vendor payments up 18%
- Customer receivables delayed by 9 days

Review pending receivables?
[View Udhaari] [View Expenses]
```

---

# 10. Functional Requirements

## 10.1 Multichannel Data Ingestion

### FR-101: The system must ingest financial data from multiple mocked sources.

Sources include:

| Source Type         | Production Target               | Portfolio Mock |
| ------------------- | ------------------------------- | -------------- |
| Payment processor   | Stripe Testmode                 | Mockoon        |
| Open Banking India  | Setu Account Aggregator Sandbox | Mockoon        |
| Open Banking global | Plaid Sandbox                   | Mockoon        |
| Email receipts      | Gmail API / MS Graph            | Mockoon        |
| WhatsApp            | Twilio WhatsApp Sandbox         | Mockoon        |
| Accounting ledger   | QuickBooks / Xero / Zoho Books  | Mockoon        |
| SME credit ledger   | Khatabook-like ledger           | Mockoon        |
| UPI/payment gateway | Razorpay/Cashfree-like adapter  | Mockoon        |

### FR-102: The system must support webhook and polling ingestion patterns.

The architecture must handle:

- webhook events,
- scheduled sync jobs,
- manual refresh actions.

### FR-103: The system must normalize all external payloads into canonical internal models.

No downstream module should consume raw provider payloads directly.

### FR-104: The system must support idempotent ingestion.

Duplicate webhook events must not create duplicate transactions.

---

## 10.2 Transaction Normalization

### FR-201: The system must normalize all transactions into a canonical transaction schema.

Required fields:

- transaction ID,
- source,
- account ID,
- amount,
- currency,
- direction,
- posted timestamp,
- raw merchant descriptor,
- normalized merchant descriptor,
- status,
- metadata.

### FR-202: Monetary values must use decimal representation.

Floating-point arithmetic must not be used for money.

### FR-203: Timestamps must be normalized to UTC.

### FR-204: The system must include a UPI descriptor normalization module.

The module should extract where possible:

- UPI transaction reference,
- payer/payee name,
- VPA handle,
- bank/network hint,
- amount,
- direction.

Example:

```text
UPI/CR/984372/RAHUL K/OKAXIS
```

Should be normalized into structured fields before LLM processing.

---

## 10.3 Anomaly Detection

### FR-301: The system must detect transactions requiring resolution.

Anomaly types include:

- uncategorized transaction,
- missing receipt,
- ambiguous merchant descriptor,
- suspected duplicate,
- high-value transaction,
- refund/reversal,
- partial payment against open credit,
- amount mismatch with invoice,
- tax-sensitive category,
- unknown customer match.

### FR-302: Anomaly detection must be deterministic first.

Rules should identify anomalies before invoking the AI agent.

### FR-303: The system must assign anomaly severity.

Severity levels:

- low,
- medium,
- high,
- critical.

High-value and compliance-sensitive anomalies must be treated as high or critical.

---

## 10.4 Inbox Cross-Referencing and Evidence Retrieval

### FR-401: The system must support bounded inbox search only.

Search must be restricted to:

- exact transaction amount,
- date window,
- merchant keywords,
- invoice/receipt/payment keywords,
- currency or numerical identifiers.

### FR-402: Broad mailbox scanning is prohibited.

The system must not scan personal conversations or unrelated email content.

### FR-403: The system must extract structured evidence only.

Allowed extracted fields:

- receipt ID,
- sender domain,
- subject,
- extracted merchant,
- extracted amount,
- extracted date,
- extracted invoice number,
- attachment metadata,
- match score.

Raw email bodies must not be stored persistently unless explicitly required by a future production consent policy.

### FR-404: Evidence must be linked to the transaction and audit trail.

Every evidence item must have:

- evidence ID,
- source,
- retrieval timestamp,
- purpose ID,
- matched transaction ID,
- redacted summary,
- extraction metadata.

---

## 10.5 Agentic Semantic Resolution

### FR-501: The system must use an agentic workflow for ambiguous transaction resolution.

The agent may:

- inspect transaction metadata,
- request inbox evidence,
- check ledger categories,
- check customer credit ledger,
- compare duplicates,
- propose classification,
- recommend user confirmation.

### FR-502: The agent must return structured output only.

Required output fields:

- transaction ID,
- proposed merchant,
- proposed category,
- confidence score,
- rationale,
- evidence IDs,
- requires review flag,
- recommended action.

### FR-503: The agent must not directly write ledger entries.

The agent may only propose actions.

### FR-504: The agent must reduce confidence when evidence is insufficient.

If no receipt or ledger match is found, confidence must be lowered and the transaction routed for user confirmation.

### FR-505: The agent must not provide binding tax or legal advice.

It may suggest possible categories but must not claim statutory compliance.

---

## 10.6 Autonomy Levels

### FR-601: The system must support three autonomy levels.

| Level                  | Behavior                                  | Use Case                                     |
| ---------------------- | ----------------------------------------- | -------------------------------------------- |
| Level 1: Suggest Only  | AI proposes, human must approve           | High-value, tax-sensitive, missing evidence  |
| Level 2: Quick Confirm | AI proposes, user confirms via WhatsApp   | Medium confidence, small amounts             |
| Level 3: Auto-Approve  | AI posts automatically if guardrails pass | Known vendors, exact receipt match, low risk |

### FR-602: Autonomy level must be determined by policy, not by the LLM.

The policy engine must decide whether a transaction can be auto-approved.

---

## 10.7 Guardrail and Policy Engine

### FR-701: The system must include a deterministic guardrail engine.

Guardrails must validate:

- schema validity,
- confidence threshold,
- category allowlist,
- amount consistency,
- currency consistency,
- duplicate risk,
- high-value threshold,
- tax sensitivity,
- consent validity,
- evidence availability,
- user approval status.

### FR-702: Guardrail verdicts must be stored.

Each verdict must include:

- verdict ID,
- transaction ID,
- proposal ID,
- allowed,
- safe to post,
- human review required,
- violations,
- timestamp.

### FR-703: Any guardrail failure must block automatic ledger write.

### FR-704: The system must support configurable thresholds.

Examples:

- minimum auto-post confidence,
- maximum auto-post amount,
- high-value review threshold,
- duplicate similarity threshold,
- WhatsApp retry limit.

---

## 10.8 Ledger and Accounting Actions

### FR-801: The system must maintain a chart of accounts.

The chart may be sourced from:

- QuickBooks mock,
- Xero mock,
- Zoho Books mock,
- or internal default SME chart.

### FR-802: AI-proposed categories must exist in the chart of accounts.

### FR-803: Ledger writes must be deterministic and idempotent.

### FR-804: Every ledger write must include provenance.

Provenance includes:

- source transaction,
- evidence ID,
- proposal ID,
- guardrail verdict ID,
- user approval ID,
- timestamp,
- actor type.

---

## 10.9 Udhaari / Customer Credit Ledger

### FR-901: The system must support a customer credit ledger.

Each customer ledger must include:

- customer ID,
- display name,
- phone number or WhatsApp identifier,
- outstanding balance,
- due date,
- ledger entries,
- payment history,
- reminder status.

### FR-902: The system must support partial payments.

If a customer owes ₹1,200 and pays ₹500, the system must update balance to ₹700.

### FR-903: The system must attempt automatic matching of UPI inflows to open credit.

Matching signals may include:

- customer name,
- VPA handle,
- phone number,
- amount,
- previous ledger history,
- user-confirmed mappings.

### FR-904: If matching is uncertain, the system must ask the owner.

Example:

```text
₹500 received from RAHUL K.
Rahul owes ₹1,200.
Is this partial udhaari payment?

[Yes] [New Sale] [Not Rahul] [Ask later]
```

### FR-905: The system must support WhatsApp reminders.

Reminder actions must be:

- owner-initiated,
- template-based,
- polite,
- rate-limited,
- auditable.

---

## 10.10 WhatsApp Interactive Loop

### FR-1001: The system must send WhatsApp notifications via mocked Twilio WhatsApp Business API.

### FR-1002: Messages must include quick-reply actions where appropriate.

Examples:

- Approve
- Change category
- Business expense
- Personal expense
- Yes, udhaari payment
- Not this customer
- Ask later

### FR-1003: Messages must be short and actionable.

### FR-1004: Messages must not contain sensitive data.

Prohibited:

- full bank account numbers,
- full card numbers,
- raw email content,
- full attachment text,
- excessive personal data.

### FR-1005: Messages must deep-link to the mobile web app where more context is needed.

### FR-1006: WhatsApp responses must update workflow state.

The system must handle:

- quick reply response,
- timeout,
- ambiguous response,
- negative response,
- repeated non-response.

---

## 10.11 Mobile-First Web Application

### FR-1101: The system must provide a mobile-first responsive web app.

The app must be usable on small screens as the primary experience.

### FR-1102: The app must be PWA-ready.

It should support:

- install prompt,
- app manifest,
- basic offline shell,
- fast load on mobile networks.

### FR-1103: The app must provide the following core screens:

1. Home dashboard  
2. Udhaari ledger  
3. Quick sale entry  
4. AI assistant / action center  
5. Transactions feed  
6. Transaction explainability drawer  
7. Settings and consent management  

### FR-1104: The UI must support one-thumb primary actions.

### FR-1105: The UI must show AI confidence and reasoning.

Users must be able to see:

- why a transaction was classified,
- what evidence was used,
- what guardrails passed or failed,
- whether human approval was required.

---

## 10.12 Quick Sale Entry

### FR-1201: The system must provide a calculator-style quick sale entry screen.

Inputs:

- amount,
- payment type: cash / UPI / udhaari,
- optional customer,
- optional note.

### FR-1202: If payment type is udhaari, the system must update the customer credit ledger.

### FR-1203: Quick sale entry must be optimized for speed.

The owner should be able to record a sale in under 5 seconds.

---

## 10.13 Cash-Flow Insights and Digests

### FR-1301: The system must generate daily and weekly financial digests.

Digest content may include:

- total inflows,
- total outflows,
- UPI vs cash vs credit,
- open udhaari,
- overdue customers,
- uncategorized transactions,
- missing receipts,
- runway estimate.

### FR-1302: Runway detection must be calculated deterministically.

The LLM may explain the forecast but must not invent the forecast math.

### FR-1303: The system must alert when projected runway shortfall is within 45 days.

---

## 10.14 Auditability and Explainability

### FR-1401: The system must maintain an immutable-style audit log.

Audit events include:

- data ingestion,
- anomaly detected,
- evidence retrieved,
- AI proposal generated,
- guardrail verdict,
- ledger write,
- WhatsApp sent,
- user response,
- consent granted,
- consent revoked,
- run completed,
- run failed.

### FR-1402: Every AI decision must be explainable.

The UI must display:

- confidence,
- rationale,
- evidence,
- policy result,
- final action.

---

# 11. Agent Design Requirements

## 11.1 Agent Role

The agent is a **bounded financial reconciliation assistant**.

It is responsible for:

- interpreting ambiguous transactions,
- requesting evidence,
- matching receipts,
- proposing categories,
- detecting likely udhaari clearance,
- drafting concise user prompts,
- summarizing cash-flow insights.

It is not responsible for:

- final ledger writes,
- compliance certification,
- money movement,
- tax filing,
- unrestricted inbox scanning,
- financial advice beyond operational categorization.

---

## 11.2 Agent Tools

The agent may use only approved tools.

| Tool                          | Purpose                                 | Constraints                 |
| ----------------------------- | --------------------------------------- | --------------------------- |
| `search_inbox_by_transaction` | Search receipts by amount/date/merchant | Bounded query only          |
| `get_chart_of_accounts`       | Fetch allowed categories                | Read-only                   |
| `get_customer_ledger`         | Fetch open udhaari balances             | Scoped to business          |
| `get_recent_transactions`     | Fetch similar transactions              | Limited window              |
| `check_duplicate_candidates`  | Detect duplicates                       | Deterministic service       |
| `draft_whatsapp_message`      | Draft user prompt                       | Template and policy checked |
| `get_cashflow_summary`        | Fetch deterministic forecast summary    | Read-only                   |

---

## 11.3 Agent Output Contract

The agent must return a typed result such as:

```json
{
  "transaction_id": "txn_101",
  "proposed_merchant": "Acme Cloud Services",
  "proposed_category": "Software Subscription",
  "confidence": 0.92,
  "rationale": "Receipt amount and merchant match the bank transaction.",
  "evidence_ids": ["evd_229"],
  "requires_review": false,
  "recommended_action": "auto_post"
}
```

The final action may be overridden by the policy engine.

---

## 11.4 Agent Constraints

The agent must:

- use only provided evidence,
- not invent missing data,
- lower confidence when uncertain,
- avoid tax/legal claims,
- avoid storing personal email content,
- avoid broad mailbox queries,
- respect user consent scope.

---

# 12. Technical Architecture Requirements

## 12.1 High-Level Architecture

The system must include:

1. FastAPI control plane
2. Connector/adaptor layer
3. normalization service
4. anomaly detection service
5. LangGraph orchestration engine
6. Pydantic AI agent layer
7. policy/guardrail engine
8. ledger service
9. WhatsApp notification service
10. audit service
11. evaluation harness
12. Mockoon API sandbox

---

## 12.2 Recommended Stack

| Layer           | Technology                               |
| --------------- | ---------------------------------------- |
| API layer       | FastAPI                                  |
| Agent framework | Pydantic AI                              |
| Orchestration   | LangGraph                                |
| Validation      | Pydantic v2                              |
| Frontend        | Next.js responsive web / PWA             |
| Styling         | Tailwind CSS + shadcn/ui                 |
| Database        | PostgreSQL, SQLite for local demo        |
| Mocking         | Mockoon                                  |
| Testing         | pytest                                   |
| Linting         | ruff, mypy                               |
| Observability   | OpenTelemetry-compatible logging/tracing |
| Background jobs | worker/queue abstraction                 |

---

## 12.3 Workflow Orchestration

LangGraph must manage the core resolution flow.

### Core Nodes

1. `fetch_financial_data`
2. `normalize_transactions`
3. `detect_anomalies`
4. `retrieve_evidence`
5. `generate_classification`
6. `run_guardrails`
7. `route_decision`
8. `post_ledger_update`
9. `send_whatsapp_nudge`
10. `write_audit_log`
11. `generate_digest`

### Decision Logic

```text
if guardrail.safe_to_post and confidence >= auto_post_threshold:
    post_ledger_update()
elif confidence >= quick_confirm_threshold:
    send_whatsapp_nudge()
else:
    mark_manual_review()
```

---

## 12.4 State Requirements

The workflow state must include:

- run ID,
- tenant ID,
- transactions,
- anomalies,
- evidence,
- proposals,
- guardrail verdicts,
- WhatsApp messages,
- ledger updates,
- user responses,
- audit events,
- errors.

The state must be checkpointable and replayable.

---

# 13. Integration Matrix

| Layer / Module       | Production Target              | Portfolio Mock | Primary Protocol | Verification Target                              |
| -------------------- | ------------------------------ | -------------- | ---------------- | ------------------------------------------------ |
| Multi-bank ingestion | Setu AA / Plaid                | Mockoon        | REST / webhook   | Consent lifecycle, balance and statement pulling |
| Payment gateway      | Stripe / Razorpay-like         | Mockoon        | REST / webhook   | Gross volume, fees, settlements                  |
| Semantic parser      | Gmail / MS Graph               | Mockoon        | OAuth2 / REST    | Receipt metadata extraction                      |
| Client interface     | Twilio WhatsApp Sandbox        | Mockoon        | HTTP webhook     | Quick reply push and response                    |
| Accounting sync      | QuickBooks / Xero / Zoho Books | Mockoon        | REST             | Chart of accounts, ledger entries                |
| SME credit ledger    | Khatabook-like adapter         | Mockoon        | REST             | Customer credit balance and partial payments     |
| Evaluation sandbox   | Internal harness               | Golden dataset | JSON             | Accuracy and guardrail metrics                   |

---

# 14. Data Model Requirements

## 14.1 Core Entities

### Business / Tenant

- tenant ID,
- business name,
- currency,
- locale,
- timezone,
- onboarding status.

### User

- user ID,
- tenant ID,
- role,
- phone number,
- WhatsApp opt-in status.

### Consent Artifact

- consent ID,
- tenant ID,
- provider,
- purpose,
- scope,
- status,
- granted at,
- expires at,
- revoked at.

### Connection

- connection ID,
- tenant ID,
- provider,
- status,
- encrypted token reference,
- last sync at.

### Canonical Transaction

- transaction ID,
- tenant ID,
- source,
- account ID,
- amount,
- currency,
- direction,
- posted at,
- raw descriptor,
- normalized descriptor,
- status.

### Evidence

- evidence ID,
- transaction ID,
- source,
- purpose ID,
- extracted merchant,
- extracted amount,
- extracted date,
- match score,
- redacted summary.

### Classification Proposal

- proposal ID,
- transaction ID,
- merchant,
- category,
- confidence,
- rationale,
- evidence IDs,
- recommended action.

### Guardrail Verdict

- verdict ID,
- proposal ID,
- allowed,
- safe to post,
- human review required,
- violations.

### Ledger Entry

- ledger entry ID,
- transaction ID,
- account/category,
- amount,
- currency,
- posted at,
- provenance metadata.

### Customer Ledger / Udhaari

- customer ID,
- name,
- phone/WhatsApp ID,
- outstanding balance,
- due date,
- status.

### Credit Ledger Entry

- entry ID,
- customer ID,
- type: debit/credit/payment/adjustment,
- amount,
- reference transaction ID,
- created at.

### WhatsApp Message

- message ID,
- tenant ID,
- transaction ID,
- direction,
- template ID,
- quick replies,
- status,
- response.

### Audit Event

- event ID,
- tenant ID,
- entity type,
- entity ID,
- actor type,
- action,
- metadata,
- timestamp.

---

# 15. Security, Privacy, and Compliance Requirements

## 15.1 Mailbox Access Boundary

The system must comply with the original PRD requirement:

- no broad email scanning,
- only bounded financial queries,
- no personal conversations stored,
- no unnecessary metadata persisted.

## 15.2 Consent Lifecycle

The system must support:

- consent request,
- consent grant,
- consent scope,
- consent expiry,
- consent revocation,
- purpose-bound access.

This is especially important for Setu AA and DPDP-aligned behavior.

## 15.3 Token Encryption

All provider tokens and consent artifacts must be encrypted at rest.

Production target:

- AES-GCM-256,
- KMS-managed keys,
- rotation support.

Portfolio implementation:

- encryption abstraction,
- local mock KMS or environment-based key management,
- no plaintext secrets in code.

## 15.4 Regulatory Alignment

The architecture must align with:

- RBI Account Aggregator principles for Indian data flows,
- SOC2 Type II style audit logging,
- DPDP-style consent and data minimization.

## 15.5 Data Minimization

The system must store only what is necessary:

- structured receipt fields,
- normalized transaction fields,
- audit metadata,
- user responses.

Raw email bodies and broad personal metadata should not be stored.

---

# 16. Guardrails and Safety Requirements

## 16.1 Pre-Execution Guardrails

- validate external payloads,
- verify consent,
- verify connector health,
- normalize schemas,
- deduplicate events.

## 16.2 Agent Guardrails

- enforce structured output,
- restrict tool access,
- limit mailbox queries,
- prohibit invented facts,
- require confidence scoring.

## 16.3 Post-Execution Guardrails

- validate category allowlist,
- validate amount consistency,
- validate evidence linkage,
- enforce high-value review,
- enforce duplicate checks.

## 16.4 Communication Guardrails

- WhatsApp template validation,
- rate limiting,
- no sensitive data,
- polite reminder language,
- quiet hours for customer reminders.

---

# 17. Evaluation and Harness Requirements

## 17.1 Golden Dataset

The system must include a golden dataset containing:

- clean transactions,
- ambiguous transactions,
- missing receipts,
- duplicates,
- refunds,
- reversals,
- partial udhaari payments,
- high-value transactions,
- conflicting evidence,
- malformed payloads.

At least 30% of cases should be adversarial or edge cases.

## 17.2 Evaluation Metrics

The harness must measure:

- automation rate,
- classification accuracy,
- evidence precision,
- false auto-post rate,
- guardrail catch rate,
- hallucination rate,
- latency,
- estimated cost per run.

## 17.3 Regression Gates

A build should fail if:

- false auto-post rate exceeds threshold,
- known adversarial cases are not blocked,
- structured output validation fails,
- audit trail is incomplete.

---

# 18. UI/UX Requirements

## 18.1 Design Philosophy

The UI must feel:

- simple,
- fast,
- mobile-first,
- trustworthy,
- non-intimidating,
- WhatsApp-friendly.

It must not feel like a traditional accounting spreadsheet.

## 18.2 Core Screens

### Home Dashboard

Must show:

- today’s earnings,
- UPI/cash/udhaari split,
- AI action items,
- overdue udhaari,
- runway alert if applicable.

### Udhaari Ledger

Must show:

- customer list,
- outstanding balances,
- due dates,
- one-tap remind,
- partial payment history.

### Quick Sale Entry

Must support:

- amount keypad,
- payment type,
- optional customer,
- fast save.

### AI Assistant / Action Center

Must show:

- pending AI questions,
- quick replies,
- recent resolutions,
- explainability links.

### Transactions Feed

Must show:

- transaction status,
- category,
- confidence,
- evidence,
- guardrail status.

### Transaction Explainability Drawer

Must show:

- AI proposal,
- evidence used,
- guardrail verdict,
- final action,
- audit trail.

### Settings and Consent

Must show:

- connected sources,
- consent status,
- notification preferences,
- revoke access actions.

## 18.3 Responsive Behavior

- Mobile first: 360px width and above.
- Tablet and desktop layouts may enhance the experience.
- Primary actions must remain accessible on small screens.

## 18.4 Localization

MVP language:

- English with Hinglish-friendly copy.

Future support:

- Hindi,
- other Indian languages.

---

# 19. Observability Requirements

The system must log:

- agent runs,
- node transitions,
- tool calls,
- LLM proposals,
- guardrail decisions,
- API failures,
- webhook events,
- WhatsApp delivery/response status.

Recommended observability layers:

- structured logs,
- traces,
- metrics,
- audit events,
- evaluation reports.

---

# 20. Non-Functional Requirements

## 20.1 Performance

- P95 anomaly resolution proposal: under 15 seconds in mocked environment.
- Dashboard load: under 3 seconds on standard mobile connection.
- Webhook processing: near real-time where possible.

## 20.2 Reliability

- Idempotent ingestion.
- Retry support for failed connectors.
- Dead-letter handling for failed events.
- Graceful degradation when LLM is unavailable.

## 20.3 Scalability

The MVP does not need large-scale distribution, but architecture must support:

- multi-tenant isolation,
- background workers,
- queue-based processing,
- state checkpointing.

## 20.4 Cost Control

The system should avoid LLM calls for:

- clean transactions,
- obvious rule-based categories,
- duplicate events,
- malformed payloads.

LLM usage should be reserved for ambiguous cases.

## 20.5 Accessibility

- large tap targets,
- readable font sizes,
- high contrast,
- simple language,
- clear error states.

---

# 21. Release Plan

## Phase 1: Foundation

- repository setup,
- Pydantic domain models,
- Mockoon sandbox,
- FastAPI skeleton,
- database schema.

## Phase 2: Ingestion and Normalization

- mocked Stripe/Setu/Gmail connectors,
- canonical transaction ingestion,
- idempotency,
- normalization tests.

## Phase 3: LangGraph Core

- workflow state,
- anomaly detection,
- evidence retrieval,
- routing logic,
- audit logging.

## Phase 4: Pydantic AI Agent

- structured classification proposal,
- bounded tools,
- confidence scoring,
- rationale generation.

## Phase 5: Guardrails and WhatsApp Loop

- policy engine,
- autonomy levels,
- WhatsApp mock send/receive,
- quick-reply handling.

## Phase 6: Mobile-First Web UI

- dashboard,
- udhaari ledger,
- quick sale entry,
- action center,
- transaction explainability.

## Phase 7: Evaluation Harness

- golden dataset,
- adversarial cases,
- metrics report,
- regression gates.

## Phase 8: Portfolio Polish

- README,
- architecture diagram,
- demo script,
- runbook,
- Loom/video walkthrough.

---

# 22. Definition of Done

The MVP is complete when the following are true:

1. The system can ingest mocked financial data from at least three sources.
2. Transactions are normalized into canonical models.
3. Ambiguous transactions are detected.
4. Bounded evidence retrieval works.
5. Pydantic AI returns structured classification proposals.
6. Guardrails block unsafe automatic writes.
7. High-confidence safe transactions can be auto-posted.
8. Low-confidence transactions trigger WhatsApp quick replies.
9. Udhaari partial payment reconciliation is demonstrated.
10. Mobile-first web UI shows dashboard, udhaari, and action center.
11. Every AI decision has an explainability view.
12. Audit logs capture the full lifecycle.
13. Evaluation harness reports key metrics.
14. All external integrations are mocked using Mockoon.
15. The demo can run locally with a single command or documented setup.

---

# 23. Example End-to-End Demo Script

A strong portfolio demo should include:

1. Start backend, frontend, and Mockoon.
2. Trigger a sync run.
3. Show mocked bank transactions entering the system.
4. Show one clean transaction auto-classified.
5. Show one ambiguous transaction flagged.
6. Show bounded inbox search retrieving a receipt.
7. Show AI proposal with confidence and rationale.
8. Show guardrail verdict.
9. Show ledger update posted.
10. Show one missing-receipt transaction triggering WhatsApp nudge.
11. Show user responding via quick reply.
12. Show transaction updated.
13. Show udhaari ledger updated after partial UPI payment.
14. Show audit trail and explainability drawer.
15. Show evaluation report.

---

# 24. Risks and Mitigations

| Risk                     | Impact                   | Mitigation                                                   |
| ------------------------ | ------------------------ | ------------------------------------------------------------ |
| LLM hallucination        | Incorrect ledger entries | Evidence grounding, structured outputs, guardrails           |
| Over-automation          | Loss of user trust       | Autonomy tiers, confidence thresholds, human review          |
| Privacy violation        | Legal/compliance risk    | Bounded mailbox search, consent lifecycle, data minimization |
| Messy UPI data           | Poor reconciliation      | Deterministic pre-parser, fuzzy matching, user confirmation  |
| WhatsApp fatigue         | Low engagement           | Smart batching, concise prompts, quick replies               |
| Mock-to-production gap   | Integration surprises    | Contract tests, adapter pattern, realistic Mockoon schemas   |
| Cost overrun             | Expensive LLM usage      | Rule-first processing, LLM only for ambiguous cases          |
| Duplicate ledger entries | Accounting errors        | Idempotency keys, duplicate detection                        |
| Regulatory ambiguity     | Compliance exposure      | No tax filing, no money movement, audit logs                 |

---

# 25. Open Questions for Future Productionization

These do not block the portfolio MVP but should be resolved before production:

1. Which Khatabook-like ledger API will be officially supported?
2. Will the product support voice-note-based inputs?
3. Which accounting system is primary: Zoho Books, QuickBooks, or Tally?
4. What is the official WhatsApp template approval flow?
5. What consent artifact lifecycle is required for Setu AA production use?
6. What is the data retention policy for evidence metadata?
7. Should customer-facing reminders be enabled by default?
8. What regional languages are required for MVP expansion?
9. What is the maximum auto-post amount by business segment?
10. Should the system support multiple business locations?

---

# 26. Final Product Positioning

FinPilot Bharat is not just an AI chatbot for finance.

It is a **production-grade, guardrailed, mobile-first AI financial operations system** that:

- reconciles messy UPI and bank transactions,
- resolves ambiguous ledger entries,
- tracks customer credit,
- retrieves bounded receipt evidence,
- asks the owner simple WhatsApp questions,
- explains every AI decision,
- and maintains an auditable financial trail.

This makes it a strong fit for Indian SMEs and a strong portfolio demonstration of agentic AI used responsibly in fintech.

---

# 27. Recommended Build Direction

For the portfolio implementation, the build should proceed in this order:

1. Finalize domain models and database schema.
2. Build Mockoon API contracts.
3. Build FastAPI ingestion layer.
4. Build LangGraph workflow.
5. Build Pydantic AI classification agent.
6. Build guardrail engine.
7. Build WhatsApp mock loop.
8. Build mobile-first Next.js UI.
9. Build evaluation harness.
10. Polish demo and documentation.

---

## Final Approval Statement

This PRD defines the final product direction for **FinPilot Bharat**:

> A bounded agentic AI CFO and reconciliation assistant for Indian SMEs, combining LangGraph orchestration, Pydantic AI structured reasoning, Mockoon-based integration simulation, WhatsApp engagement, and a mobile-first responsive web experience.