// FinPilot Bharat v1 — typed API client with graceful mock fallback.
// Base: NEXT_PUBLIC_API_URL (default http://localhost:8000).
// When backend is unreachable, every function returns inline fixtures
// matching the FIXED API CONTRACT so `pnpm build` + demo work standalone.

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit, fallback?: T): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    return data;
  } catch {
    if (fallback !== undefined) return fallback;
    throw new Error(`Backend unreachable at ${API_BASE}${path}`);
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Types (mirror backend contract) ----------

export type Direction = "credit" | "debit";
export type TxnStatus = "posted" | "pending_review" | "needs_info" | "auto_posted";
export type PaymentType = "cash" | "upi" | "udhaari";

export interface Transaction {
  id: string;
  amount: number;
  direction: Direction;
  merchant: string;
  raw_descriptor?: string;
  category: string;
  status: TxnStatus;
  confidence: number;
  posted_at?: string;
  evidence_count?: number;
  guardrail_pass?: boolean;
}

export interface Proposal {
  id: string;
  transaction_id: string;
  proposed_merchant: string;
  proposed_category: string;
  confidence: number;
  rationale: string;
  evidence_ids: string[];
  requires_review: boolean;
  recommended_action: string;
}

export interface Evidence {
  id: string;
  source: string;
  extracted_merchant: string;
  extracted_amount: number;
  match_score: number;
  redacted_summary: string;
}

export interface Guardrail {
  id: string;
  allowed: boolean;
  safe_to_post: boolean;
  human_review_required: boolean;
  violations: string[];
  timestamp: string;
}

export interface AuditEvent {
  id: string;
  entity_type: string;
  entity_id: string;
  actor_type: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

export interface TransactionDetail {
  transaction: Transaction;
  proposal: Proposal;
  evidence: Evidence[];
  guardrail: Guardrail;
  audit: AuditEvent[];
}

export interface SyncResult {
  run_id: string;
  ingested: number;
  auto_posted: number;
  nudges_sent: number;
  manual_review: number;
  message?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  outstanding: number;
  due_date: string;
  status: string;
  last_payment?: string;
}

export interface ActionItem {
  id: string;
  txn_id: string;
  message: string;
  quick_replies: string[];
  resolved?: boolean;
}

export interface DailyDigest {
  inflows: number;
  outflows: number;
  upi_vs_cash_vs_credit: { upi: number; cash: number; credit: number };
  open_udhaari: number;
  overdue: number;
  uncategorized: number;
  missing_receipts: number;
  runway_days: number;
  alert: string | null;
}

export interface OutboxMessage {
  id: string;
  to: string;
  template: string;
  body: string;
  status: string;
}

// ---------- Mock fixtures (contract-shaped) ----------

export const mockDigest: DailyDigest = {
  inflows: 18450,
  outflows: 6230,
  upi_vs_cash_vs_credit: { upi: 11200, cash: 5250, credit: 2000 },
  open_udhaari: 8750,
  overdue: 2,
  uncategorized: 3,
  missing_receipts: 2,
  runway_days: 38,
  alert: "Runway 38 din — 45 din se kam! Udhaari vasooli tez karo.",
};

export const mockTransactions: Transaction[] = [
  {
    id: "txn_101",
    amount: 500,
    direction: "credit",
    merchant: "Rahul K",
    raw_descriptor: "UPI/CR/983472/RAHUL K/OKAXIS",
    category: "Udhaari repayment",
    status: "auto_posted",
    confidence: 0.93,
    posted_at: "2026-09-30T08:12:00Z",
    evidence_count: 1,
    guardrail_pass: true,
  },
  {
    id: "txn_102",
    amount: 899,
    direction: "debit",
    merchant: "POS-SWIGGY",
    raw_descriptor: "UPI/DR/984372/POS-SWIGGY/PAYTM",
    category: "Uncategorized",
    status: "needs_info",
    confidence: 0.41,
    posted_at: "2026-09-30T07:40:00Z",
    evidence_count: 0,
    guardrail_pass: false,
  },
  {
    id: "txn_103",
    amount: 125000,
    direction: "debit",
    merchant: "ACME*SRV",
    raw_descriptor: "UPI/DR/984372/ACME*SRV/PAYTM",
    category: "Vendor — IT services",
    status: "pending_review",
    confidence: 0.88,
    posted_at: "2026-09-29T16:02:00Z",
    evidence_count: 1,
    guardrail_pass: false,
  },
  {
    id: "txn_104",
    amount: 1200,
    direction: "credit",
    merchant: "Kirana sale",
    raw_descriptor: "CASH/SALE/COUNTER",
    category: "Sales",
    status: "posted",
    confidence: 0.97,
    posted_at: "2026-09-29T12:30:00Z",
    evidence_count: 1,
    guardrail_pass: true,
  },
];

export const mockDetails: Record<string, TransactionDetail> = {
  txn_101: {
    transaction: mockTransactions[0],
    proposal: {
      id: "prop_101",
      transaction_id: "txn_101",
      proposed_merchant: "Rahul K",
      proposed_category: "Udhaari repayment",
      confidence: 0.93,
      rationale:
        "UPI remitter name matches customer Rahul K; open udhaari ₹1,200 tha. Partial payment ₹500 consistent hai.",
      evidence_ids: ["evd_229"],
      requires_review: false,
      recommended_action: "auto_post",
    },
    evidence: [
      {
        id: "evd_229",
        source: "bank",
        extracted_merchant: "RAHUL K",
        extracted_amount: 500,
        match_score: 0.95,
        redacted_summary: "UPI CR ••••8472 · 30 Sep · amount match",
      },
    ],
    guardrail: {
      id: "grd_101",
      allowed: true,
      safe_to_post: true,
      human_review_required: false,
      violations: [],
      timestamp: "2026-09-30T08:12:31Z",
    },
    audit: [
      { id: "a1", entity_type: "transaction", entity_id: "txn_101", actor_type: "system", action: "ingested", timestamp: "2026-09-30T08:11:00Z" },
      { id: "a2", entity_type: "proposal", entity_id: "prop_101", actor_type: "agent", action: "classification proposed (0.93)", timestamp: "2026-09-30T08:12:10Z" },
      { id: "a3", entity_type: "guardrail", entity_id: "grd_101", actor_type: "policy", action: "verdict: allow auto-post", timestamp: "2026-09-30T08:12:31Z" },
      { id: "a4", entity_type: "ledger", entity_id: "txn_101", actor_type: "system", action: "ledger updated · udhaari ₹1,200 → ₹700", timestamp: "2026-09-30T08:12:32Z" },
    ],
  },
  txn_102: {
    transaction: mockTransactions[1],
    proposal: {
      id: "prop_102",
      transaction_id: "txn_102",
      proposed_merchant: "POS-SWIGGY",
      proposed_category: "Uncategorized",
      confidence: 0.41,
      rationale: "Koi receipt nahi mili. Amount/date par inbox match fail. Business vs personal unclear.",
      evidence_ids: [],
      requires_review: true,
      recommended_action: "quick_confirm",
    },
    evidence: [],
    guardrail: {
      id: "grd_102",
      allowed: false,
      safe_to_post: false,
      human_review_required: true,
      violations: ["evidence_missing", "confidence_below_threshold"],
      timestamp: "2026-09-30T07:41:00Z",
    },
    audit: [
      { id: "b1", entity_type: "transaction", entity_id: "txn_102", actor_type: "system", action: "ingested", timestamp: "2026-09-30T07:39:00Z" },
      { id: "b2", entity_type: "evidence", entity_id: "txn_102", actor_type: "system", action: "inbox search: 0 hits (bounded)", timestamp: "2026-09-30T07:40:20Z" },
      { id: "b3", entity_type: "proposal", entity_id: "prop_102", actor_type: "agent", action: "classification proposed (0.41)", timestamp: "2026-09-30T07:40:44Z" },
      { id: "b4", entity_type: "whatsapp", entity_id: "txn_102", actor_type: "system", action: "nudge sent: Business ya Personal?", timestamp: "2026-09-30T07:41:05Z" },
    ],
  },
  txn_103: {
    transaction: mockTransactions[2],
    proposal: {
      id: "prop_103",
      transaction_id: "txn_103",
      proposed_merchant: "Acme Cloud Services",
      proposed_category: "Vendor — IT services",
      confidence: 0.88,
      rationale: "Receipt amount + merchant match. Lekin amount high-value threshold se upar → human review mandatory.",
      evidence_ids: ["evd_231"],
      requires_review: true,
      recommended_action: "suggest_only",
    },
    evidence: [
      {
        id: "evd_231",
        source: "inbox",
        extracted_merchant: "Acme Cloud Services",
        extracted_amount: 125000,
        match_score: 0.91,
        redacted_summary: "Invoice #AC-2210 · acme.example · amount match",
      },
    ],
    guardrail: {
      id: "grd_103",
      allowed: false,
      safe_to_post: false,
      human_review_required: true,
      violations: ["high_value_threshold_exceeded"],
      timestamp: "2026-09-29T16:03:00Z",
    },
    audit: [
      { id: "c1", entity_type: "transaction", entity_id: "txn_103", actor_type: "system", action: "ingested", timestamp: "2026-09-29T16:01:00Z" },
      { id: "c2", entity_type: "guardrail", entity_id: "grd_103", actor_type: "policy", action: "verdict: block auto-post (high value)", timestamp: "2026-09-29T16:03:00Z" },
    ],
  },
  txn_104: {
    transaction: mockTransactions[3],
    proposal: {
      id: "prop_104",
      transaction_id: "txn_104",
      proposed_merchant: "Counter sale",
      proposed_category: "Sales",
      confidence: 0.97,
      rationale: "Quick-sale entry by owner. Cash tally match.",
      evidence_ids: [],
      requires_review: false,
      recommended_action: "auto_post",
    },
    evidence: [],
    guardrail: {
      id: "grd_104",
      allowed: true,
      safe_to_post: true,
      human_review_required: false,
      violations: [],
      timestamp: "2026-09-29T12:31:00Z",
    },
    audit: [
      { id: "d1", entity_type: "transaction", entity_id: "txn_104", actor_type: "owner", action: "quick-sale recorded", timestamp: "2026-09-29T12:30:00Z" },
    ],
  },
};

export const mockCustomers: Customer[] = [
  { id: "cust_rahul", name: "Rahul K", phone: "+91 98200 11223", outstanding: 700, due_date: "2026-10-05", status: "due_soon", last_payment: "₹500 · 30 Sep" },
  { id: "cust_meena", name: "Meena S", phone: "+91 98111 33445", outstanding: 2350, due_date: "2026-09-27", status: "overdue", last_payment: "₹1,000 · 21 Sep" },
  { id: "cust_arif", name: "Arif Traders", phone: "+91 98333 77889", outstanding: 5700, due_date: "2026-10-12", status: "open", last_payment: "—" },
];

export const mockActions: ActionItem[] = [
  {
    id: "act_1",
    txn_id: "txn_102",
    message: "₹899 POS-SWIGGY par kharch hua. Ye business kharcha hai?",
    quick_replies: ["Business", "Personal", "Add receipt", "Ask later"],
  },
  {
    id: "act_2",
    txn_id: "txn_103",
    message: "₹1,25,000 Acme Cloud ko — approve karun? High-value hai, aapka OK chahiye.",
    quick_replies: ["Approve", "Reject", "Ask later"],
  },
  {
    id: "act_3",
    txn_id: "txn_101",
    message: "₹500 Rahul K se aaya. Udhaari (₹1,200) me adjust karun?",
    quick_replies: ["Yes", "New Sale", "Not Rahul"],
    resolved: true,
  },
];

export const mockOutbox: OutboxMessage[] = [
  { id: "w1", to: "+91 98200 11223", template: "udhaari_reminder", body: "Namaste Rahul ji! ₹700 udhaar baki hai (due 5 Oct). 🙏", status: "sent" },
  { id: "w2", to: "owner", template: "missing_receipt", body: "₹899 Swiggy — Business ya Personal? [Business] [Personal]", status: "awaiting_reply" },
];

// ---------- API functions ----------

export function apiBase(): string {
  return API_BASE;
}

export async function isBackendReachable(): Promise<boolean> {
  try {
    await request<{ status: string }>("/health", undefined, undefined);
    return true;
  } catch {
    return false;
  }
}

export async function getHealth(): Promise<{ status: string }> {
  return request("/health", undefined, { status: "mock (backend offline)" });
}

export async function postSync(): Promise<SyncResult> {
  return request<SyncResult>(
    "/api/sync",
    { method: "POST", body: JSON.stringify({}) },
    { run_id: "mock-run-001", ingested: 12, auto_posted: 8, nudges_sent: 2, manual_review: 2, message: "Mocked sync — backend offline, demo data dikhaya." }
  );
}

export async function getTransactions(): Promise<Transaction[]> {
  return request<Transaction[]>("/api/transactions", undefined, mockTransactions);
}

export async function getTransactionDetail(id: string): Promise<TransactionDetail> {
  const fallback: TransactionDetail =
    mockDetails[id] ?? mockDetails["txn_102"];
  return request<TransactionDetail>(`/api/transactions/${id}`, undefined, fallback);
}

export async function approveTransaction(
  id: string,
  approved: boolean,
  category_override?: string
): Promise<{ ok: boolean; message: string }> {
  return request(
    `/api/transactions/${id}/approve`,
    { method: "POST", body: JSON.stringify({ approved, category_override }) },
    { ok: true, message: approved ? "Mocked: approved ✓" : "Mocked: rejected — review me rakha." }
  );
}

export async function postQuickSale(input: {
  amount: number;
  payment_type: PaymentType;
  customer_id?: string;
  note?: string;
}): Promise<{ id: string; message: string }> {
  return request(
    "/api/quick-sale",
    { method: "POST", body: JSON.stringify(input) },
    { id: "mock-sale-1", message: `Mocked: ₹${input.amount} ${input.payment_type} sale saved ✓` }
  );
}

export async function getCustomers(): Promise<Customer[]> {
  return request<Customer[]>("/api/customers", undefined, mockCustomers);
}

export async function createCustomer(name: string, phone: string): Promise<Customer> {
  return request(
    "/api/customers",
    { method: "POST", body: JSON.stringify({ name, phone }) },
    { id: `cust_${Date.now()}`, name, phone, outstanding: 0, due_date: "—", status: "open" }
  );
}

export async function addCustomerPayment(id: string, amount: number): Promise<{ message: string }> {
  return request(
    `/api/customers/${id}/payment`,
    { method: "POST", body: JSON.stringify({ amount }) },
    { message: `Mocked: ₹${amount} payment joda ✓` }
  );
}

export async function remindCustomer(id: string): Promise<{ message: string }> {
  return request(
    `/api/customers/${id}/remind`,
    { method: "POST", body: JSON.stringify({}) },
    { message: "Mocked: WhatsApp reminder bheja 🙏" }
  );
}

export async function getActions(): Promise<ActionItem[]> {
  return request<ActionItem[]>("/api/actions", undefined, mockActions);
}

export async function respondAction(id: string, reply: string): Promise<{ message: string }> {
  return request(
    `/api/actions/${id}/respond`,
    { method: "POST", body: JSON.stringify({ reply }) },
    { message: `Mocked: "${reply}" noted ✓` }
  );
}

export async function getOutbox(): Promise<OutboxMessage[]> {
  return request<OutboxMessage[]>("/api/whatsapp/outbox", undefined, mockOutbox);
}

export async function getDigest(): Promise<DailyDigest> {
  return request<DailyDigest>("/api/digest/daily", undefined, mockDigest);
}

export async function getAudit(entity_id?: string): Promise<AuditEvent[]> {
  const path = entity_id ? `/api/audit?entity_id=${encodeURIComponent(entity_id)}` : "/api/audit";
  const fallback: AuditEvent[] = entity_id && mockDetails[entity_id]
    ? mockDetails[entity_id].audit
    : Object.values(mockDetails).flatMap((d) => d.audit);
  return request<AuditEvent[]>(path, undefined, fallback);
}

export function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
