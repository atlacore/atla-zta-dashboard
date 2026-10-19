/** GET /ui/billing - live state from Kill Bill, owner/admin only. */
export interface BillingOverview {
  enabled: boolean;
  billingStatus?: "active" | "suspended";
  planName?: string;
  currency?: string;
  maxDevices?: number;
  deviceCount: number;
  plans: BillingPlan[];
}

export interface BillingPlan {
  name: string;
  product: string;
  billingPeriod: string;
  price: number;
  deviceQuota?: number;
}

/** GET /ui/billing/invoices - issued (non-draft) invoices, newest first. */
export interface BillingInvoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  balance: number;
  currency: string;
  status: string;
}
