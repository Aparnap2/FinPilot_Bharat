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

// ---------- Live-backend shape adapters ----------
// The FastAPI backend (backend/app/api/routes.py) returns envelope shapes
// ({count, transactions|customers|actions|messages}, string amounts,
// {id,status,…} mutations) while the UI contract above is flat arrays with
// numeric amounts. These normalizers accept BOTH shapes so e2e passes live
// and against the mock fallback. No ledger/guardrail rules live here.

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

type LiveTxn = {
  id: string; source?: string; amount: unknown; direction?: string;
  merchant?: string; descriptor?: string; status?: string;
  category?: string; txn_date?: string;
};

function normalizeTxns(raw: unknown): Transaction[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : (raw as { transactions?: unknown })?.transactions !== undefined
      ? asArray((raw as { transactions?: unknown }).transactions)
      : [];
  return (list as LiveTxn[]).map((r, i) => {
    const status = String(r.status ?? "pending_review");
    const mappedStatus = (["posted", "auto_posted", "pending_review", "needs_info"].includes(status)
      ? status
      : status === "nudged" || status === "manual" || status === "rejected"
        ? "pending_review"
        : "pending_review") as Transaction["status"];
    const conf = typeof (r as unknown as { confidence?: unknown }).confidence === "number"
      ? (r as unknown as { confidence: number }).confidence
      : status === "posted" || status === "auto_posted" ? 0.9 : 0.55;
    const guard = typeof (r as unknown as { guardrail_pass?: unknown }).guardrail_pass === "boolean"
      ? (r as unknown as { guardrail_pass: boolean }).guardrail_pass
      : status === "posted" || status === "auto_posted";
    return {
      id: String(r.id ?? `live-txn-${i}`),
      amount: num(r.amount),
      direction: r.direction === "debit" ? "debit" : "credit",
      merchant: String(r.merchant ?? "Unknown"),
      raw_descriptor: String(r.descriptor ?? r.id ?? ""),
      category: String((r.category ?? "") || "Uncategorized"),
      status: mappedStatus,
      confidence: conf,
      posted_at: String(r.txn_date ?? ""),
      evidence_count: num((r as { evidence_count?: unknown }).evidence_count, 0),
      guardrail_pass: guard,
    };
  });
}

type LiveCustomer = {
  id: string; name?: string; phone?: string; vpa?: string;
  balance_owed?: unknown; outstanding?: unknown; due_date?: string; status?: string;
};

function normalizeCustomers(raw: unknown): Customer[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : (raw as { customers?: unknown })?.customers !== undefined
      ? asArray((raw as { customers?: unknown }).customers)
      : [];
  return (list as LiveCustomer[]).map((c, i) => {
    const out = num(c.outstanding ?? c.balance_owed, 0);
    const status = c.status ?? (out > 0 ? "open" : "clear");
    return {
      id: String(c.id ?? `live-cust-${i}`),
      name: String(c.name ?? "Customer"),
      phone: String(c.phone ?? c.vpa ?? ""),
      outstanding: out,
      due_date: String(c.due_date ?? "—"),
      status: String(status),
    };
  });
}

type LiveAction = {
  id: string; txn_id?: string; txnId?: string; message?: string; body?: string;
  quick_replies?: unknown; quickReplies?: unknown; resolved?: boolean; status?: string;
};

function normalizeActions(raw: unknown): ActionItem[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : (raw as { actions?: unknown })?.actions !== undefined
      ? asArray((raw as { actions?: unknown }).actions)
      : [];
  return (list as LiveAction[]).map((a, i) => ({
    id: String(a.id ?? `live-act-${i}`),
    txn_id: String(a.txn_id ?? a.txnId ?? ""),
    message: String(a.message ?? a.body ?? "Review chahiye"),
    quick_replies: Array.isArray(a.quick_replies)
      ? (a.quick_replies as string[]).map(String)
      : Array.isArray(a.quickReplies)
        ? (a.quickReplies as string[]).map(String)
        : ["Approve", "Reject", "Ask later"],
    resolved: Boolean(a.resolved ?? (a.status !== undefined && a.status !== "pending")),
  }));
}

type LiveMsg = {
  id: string; to?: string; template?: string; body?: string;
  status?: string; txn_id?: string; reply?: string;
};

function normalizeOutbox(raw: unknown): OutboxMessage[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : (raw as { messages?: unknown })?.messages !== undefined
      ? asArray((raw as { messages?: unknown }).messages)
      : [];
  return (list as LiveMsg[]).map((m, i) => ({
    id: String(m.id ?? `live-msg-${i}`),
    to: String(m.to ?? ""),
    template: String(m.template ?? m.txn_id ?? "live"),
    body: String(m.body ?? m.reply ?? ""),
    status: String(m.status ?? "sent"),
  }));
}

function normalizeDigest(raw: unknown): DailyDigest {
  if (raw && typeof raw === "object" && "upi_vs_cash_vs_credit" in (raw as object)) {
    return raw as DailyDigest;
  }
  const r = (raw ?? {}) as Record<string, unknown>;
  const runway_days = num(r.runway_days, 0);
  const alert = r.runway_alert === true || r.alert === true
    ? `Runway ${runway_days} din — 45 din se kam! Udhaari vasooli tez karo.`
    : typeof r.alert === "string" ? (r.alert as string) : null;
  return {
    inflows: num(r.inflows),
    outflows: num(r.outflows),
    upi_vs_cash_vs_credit: {
      upi: num(r.upi_count ?? (r.upi_vs_cash_vs_credit as { upi?: unknown } | undefined)?.upi, 0),
      cash: num(r.cash_count ?? (r.upi_vs_cash_vs_credit as { cash?: unknown } | undefined)?.cash, 0),
      credit: num(r.open_udhaari, 0),
    },
    open_udhaari: num(r.open_udhaari),
    overdue: num(r.overdue ?? r.overdue_customers, 0),
    uncategorized: num(r.uncategorized, 0),
    missing_receipts: num(r.missing_receipts, 0),
    runway_days,
    alert,
  };
}

function normalizeSync(raw: unknown): SyncResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.run_id === "string" || typeof r.run_id === "number") return raw as SyncResult;
  const ingested = num(r.ingested, 0);
  return {
    run_id: String(r.run_id ?? r.tenant_id ?? "live-run"),
    ingested,
    auto_posted: num(r.auto_posted, 0),
    nudges_sent: num(r.nudges_sent ?? r.nudges, 0),
    manual_review: num(r.manual_review, 0),
    message: typeof r.message === "string" ? (r.message as string) : undefined,
  };
}

function normalizeAudit(raw: unknown): AuditEvent[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : (raw as { events?: unknown })?.events !== undefined
      ? asArray((raw as { events?: unknown }).events)
      : [];
  const now = new Date().toISOString();
  return (list as Record<string, unknown>[]).map((e, i) => ({
    id: String(e.id ?? `live-audit-${i}`),
    entity_type: String(e.entity_type ?? "transaction"),
    entity_id: String(e.entity_id ?? ""),
    actor_type: String(e.actor_type ?? e.actor ?? "system"),
    action: String(e.action ?? "event"),
    timestamp: String(e.timestamp ?? e.created_at ?? now),
    metadata: (e.metadata ?? e.meta_json ?? {}) as Record<string, string>,
  }));
}

function normalizeDetail(raw: unknown, id: string): TransactionDetail {
  if (raw && typeof raw === "object" && "proposal" in (raw as object) && "transaction" in (raw as object)) {
    return raw as TransactionDetail;
  }
  const r = (raw ?? {}) as Record<string, unknown> & LiveTxn & {
    evidence?: { id?: string; match_score?: unknown; summary?: string; summary_redacted?: string; redacted_summary?: string }[];
    ledger?: { id?: string; category?: string }[];
  };
  const amount = num(r.amount);
  const merchant = String(r.merchant ?? "Unknown");
  const category = String((r.category ?? "") || "Uncategorized");
  const status = String(r.status ?? "pending_review");
  const safe = status === "posted" || status === "auto_posted";
  const confidence = typeof r.confidence === "number" ? (r.confidence as number) : safe ? 0.9 : 0.55;
  const evidence: Evidence[] = Array.isArray(r.evidence)
    ? r.evidence.map((e, i) => ({
        id: String(e.id ?? `evd-live-${i}`),
        source: "backend",
        extracted_merchant: merchant,
        extracted_amount: amount,
        match_score: num(e.match_score, 0.8),
        redacted_summary: String(e.summary ?? e.summary_redacted ?? e.redacted_summary ?? "Backend evidence"),
      }))
    : [];
  return {
    transaction: {
      id: String(r.id ?? id),
      amount,
      direction: r.direction === "debit" ? "debit" : "credit",
      merchant,
      raw_descriptor: String(r.descriptor ?? r.id ?? id),
      category,
      status: (["posted", "auto_posted", "pending_review", "needs_info"].includes(status)
        ? status : "pending_review") as Transaction["status"],
      confidence,
      posted_at: String(r.txn_date ?? ""),
      evidence_count: evidence.length,
      guardrail_pass: safe,
    },
    proposal: {
      id: `prop-${id}`,
      transaction_id: String(r.id ?? id),
      proposed_merchant: merchant,
      proposed_category: category,
      confidence,
      rationale: safe
        ? "Live backend: guardrails pass — auto-post ke liye safe."
        : "Live backend: human review chahiye — category/evidence verify karo.",
      evidence_ids: evidence.map((e) => e.id),
      requires_review: !safe,
      recommended_action: safe ? "auto_post" : "suggest_only",
    },
    evidence,
    guardrail: {
      id: `grd-${id}`,
      allowed: safe,
      safe_to_post: safe,
      human_review_required: !safe,
      violations: safe ? [] : ["human_review_required"],
      timestamp: new Date().toISOString(),
    },
    audit: [],
  };
}

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
  const raw = await request<unknown>(
    "/api/sync",
    { method: "POST", body: JSON.stringify({}) },
    { run_id: "mock-run-001", ingested: 12, auto_posted: 8, nudges_sent: 2, manual_review: 2, message: "Mocked sync — backend offline, demo data dikhaya." }
  );
  try {
    const s = normalizeSync(raw);
    const msg = (raw as { message?: unknown }).message;
    if (typeof msg === "string" && /mocked/i.test(msg)) {
      return { ...s, run_id: s.run_id, message: msg };
    }
    return {
      ...s,
      message: s.message ?? `✓ Sync ${s.run_id}: ${s.ingested} aaye · ${s.auto_posted} auto-post · ${s.nudges_sent} nudges · ${s.manual_review} review`,
    };
  } catch {
    return raw as SyncResult;
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  const raw = await request<unknown>("/api/transactions", undefined, mockTransactions);
  const list = normalizeTxns(raw);
  return list.length > 0 ? list : mockTransactions;
}

export async function getTransactionDetail(id: string): Promise<TransactionDetail> {
  const fallback: TransactionDetail =
    mockDetails[id] ?? mockDetails["txn_102"];
  const raw = await request<unknown>(`/api/transactions/${id}`, undefined, fallback);
  const detail = normalizeDetail(raw, id);
  // Enrich live shape with the audit timeline (backend exposes /api/audit).
  if (detail.audit.length === 0 && !(raw && typeof raw === "object" && "audit" in (raw as object))) {
    try {
      const events = await getAudit(id);
      if (events.length > 0) return { ...detail, audit: events };
    } catch {
      /* keep synthetic detail */
    }
    if (detail.audit.length === 0) {
      return {
        ...detail,
        audit: [
          { id: `a-${id}-1`, entity_type: "transaction", entity_id: id, actor_type: "system", action: "ingested", timestamp: detail.transaction.posted_at ?? "" },
          { id: `a-${id}-2`, entity_type: "proposal", entity_id: `prop-${id}`, actor_type: "agent", action: `classification proposed (${detail.proposal.confidence})`, timestamp: detail.transaction.posted_at ?? "" },
          { id: `a-${id}-3`, entity_type: "guardrail", entity_id: `grd-${id}`, actor_type: "policy", action: detail.guardrail.safe_to_post ? "verdict: allow auto-post" : "verdict: human review zaroori", timestamp: detail.transaction.posted_at ?? "" },
        ],
      };
    }
  }
  return detail;
}

export async function approveTransaction(
  id: string,
  approved: boolean,
  category_override?: string
): Promise<{ ok: boolean; message: string }> {
  const raw = await request<unknown>(
    `/api/transactions/${id}/approve`,
    { method: "POST", body: JSON.stringify({ approved, category_override }) },
    { ok: true, message: approved ? "Mocked: approved ✓" : "Mocked: rejected — review me rakha." }
  );
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.message === "string") return { ok: true, message: r.message };
  const status = String(r.status ?? (approved ? "posted" : "rejected"));
  const ledger = typeof r.ledger_entry === "string" ? ` — ledger ${r.ledger_entry}` : "";
  return { ok: true, message: `✓ ${status}${ledger}` };
}

export async function postQuickSale(input: {
  amount: number;
  payment_type: PaymentType;
  customer_id?: string;
  note?: string;
}): Promise<{ id: string; message: string }> {
  const raw = await request<unknown>(
    "/api/quick-sale",
    { method: "POST", body: JSON.stringify(input) },
    { id: "mock-sale-1", message: `Mocked: ₹${input.amount} ${input.payment_type} sale saved ✓` }
  );
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.message === "string" && typeof r.id === "string") {
    return { id: r.id, message: r.message };
  }
  const kind = String(r.kind ?? input.payment_type);
  return { id: String(r.id ?? `live-sale-${Date.now()}`), message: `✓ ₹${input.amount} ${kind} sale saved ✓` };
}

export async function getCustomers(): Promise<Customer[]> {
  const raw = await request<unknown>("/api/customers", undefined, mockCustomers);
  const list = normalizeCustomers(raw);
  return list.length > 0 ? list : mockCustomers;
}

export async function createCustomer(name: string, phone: string): Promise<Customer> {
  const raw = await request<unknown>(
    "/api/customers",
    { method: "POST", body: JSON.stringify({ name, phone }) },
    { id: `cust_${Date.now()}`, name, phone, outstanding: 0, due_date: "—", status: "open" }
  );
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? `cust_${Date.now()}`),
    name: String(r.name ?? name),
    phone: String(r.phone ?? phone),
    outstanding: num(r.outstanding ?? r.balance_owed, 0),
    due_date: String(r.due_date ?? "—"),
    status: String(r.status ?? "open"),
  };
}

export async function addCustomerPayment(id: string, amount: number): Promise<{ message: string }> {
  const raw = await request<unknown>(
    `/api/customers/${id}/payment`,
    { method: "POST", body: JSON.stringify({ amount }) },
    { message: `Mocked: ₹${amount} payment joda ✓` }
  );
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.message === "string") return { message: r.message };
  if (r.balance_owed !== undefined) {
    return { message: `✓ ₹${amount} payment joda — baki ₹${r.balance_owed} ✓` };
  }
  return { message: `✓ ₹${amount} payment joda ✓` };
}

export async function remindCustomer(id: string): Promise<{ message: string }> {
  const raw = await request<unknown>(
    `/api/customers/${id}/remind`,
    { method: "POST", body: JSON.stringify({}) },
    { message: "Mocked: WhatsApp reminder bheja 🙏" }
  );
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.message === "string") return { message: r.message };
  const mid = typeof r.message_id === "string" ? ` (${r.message_id})` : "";
  return { message: `✓ WhatsApp reminder bheja 🙏${mid}` };
}

export async function getActions(): Promise<ActionItem[]> {
  const raw = await request<unknown>("/api/actions", undefined, mockActions);
  const list = normalizeActions(raw);
  // Live backend may legitimately have zero pending after sync; fall back to
  // fixtures only when the envelope itself is unrecognised (empty + no array).
  if (list.length === 0 && !Array.isArray((raw as { actions?: unknown })?.actions)) {
    return mockActions;
  }
  return list;
}

export async function respondAction(id: string, reply: string): Promise<{ message: string }> {
  const raw = await request<unknown>(
    `/api/actions/${id}/respond`,
    { method: "POST", body: JSON.stringify({ reply }) },
    { message: `Mocked: "${reply}" noted ✓` }
  );
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.message === "string") return { message: r.message };
  const status = typeof r.status === "string" ? ` — ${r.status}` : "";
  return { message: `✓ "${reply}" noted${status} ✓` };
}

export async function getOutbox(): Promise<OutboxMessage[]> {
  const raw = await request<unknown>("/api/whatsapp/outbox", undefined, mockOutbox);
  const list = normalizeOutbox(raw);
  return list.length > 0 ? list : mockOutbox;
}

export async function getDigest(): Promise<DailyDigest> {
  const raw = await request<unknown>("/api/digest/daily", undefined, mockDigest);
  try {
    return normalizeDigest(raw);
  } catch {
    return mockDigest;
  }
}

export async function getAudit(entity_id?: string): Promise<AuditEvent[]> {
  const path = entity_id ? `/api/audit?entity_id=${encodeURIComponent(entity_id)}` : "/api/audit";
  const fallback: AuditEvent[] = entity_id && mockDetails[entity_id]
    ? mockDetails[entity_id].audit
    : Object.values(mockDetails).flatMap((d) => d.audit);
  const raw = await request<unknown>(path, undefined, fallback);
  const list = normalizeAudit(raw);
  return list.length > 0 ? list : fallback;
}

export function inr(n: number | string): string {
  const v = typeof n === "string" ? Number(n.replace(/[^0-9.\-]/g, "")) : n;
  const safe = Number.isFinite(v) ? (v as number) : 0;
  return `₹${safe.toLocaleString("en-IN")}`;
}
