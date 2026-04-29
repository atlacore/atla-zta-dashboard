/**
 * Raw audit event as returned by the ZTA backend (`GET /api/ui/events`).
 * Field names match the Go `schemas.AuditEvent` JSON tags (camelCase).
 */
export interface BackendAuditEvent {
  id: string;
  tenantId: string;
  activity: string; // event code, e.g. "user.created"
  initiatorId?: string | null;
  targetId: string;
  meta: string; // JSON-encoded string (Go `string` over JSONB)
  createdAt: string;
}

/**
 * Frontend-friendly audit event used by all activity components.
 * Transformed from {@link BackendAuditEvent} via {@link transformAuditEvent}.
 */
export interface ActivityEvent {
  id: string;
  timestamp: string;
  activity: string; // human-readable name
  activity_code: string; // event code, e.g. "user.created"
  initiator_id: string;
  initiator_email: string;
  initiator_name: string;
  target_id: string;
  meta: { [key: string]: string };
}

// ── Display name mapping ────────────────────────────────────────────────────

const ACTIVITY_DISPLAY_NAMES: Record<string, string> = {
  // Users
  "user.created": "User Created",
  "user.updated": "User Updated",
  "user.deleted": "User Deleted",
  "user.login": "User Login",
  "user.login_failed": "User Login Failed",
  "user.password_changed": "Password Changed",

  // Sessions
  "session.revoked": "Session Revoked",
  "session.expired": "Session Expired",

  // Tenants
  "tenant.created": "Tenant Created",
  "tenant.updated": "Tenant Updated",
  "tenant.deleted": "Tenant Deleted",

  // SDK Keys
  "sdk_key.created": "SDK Key Created",
  "sdk_key.revoked": "SDK Key Revoked",

  // Resources
  "resource.created": "Resource Created",
  "resource.updated": "Resource Updated",
  "resource.deleted": "Resource Deleted",

  // Access Policies
  "access_policy.created": "Access Policy Created",
  "access_policy.updated": "Access Policy Updated",
  "access_policy.deleted": "Access Policy Deleted",

  // Policy Rules
  "policy_rule.created": "Policy Rule Created",

  // Raw Rego Policies
  "policy.upserted": "Policy Upserted",
  "policy.updated": "Policy Updated",
  "policy.deleted": "Policy Deleted",
  "policy_revision.deleted": "Policy Revision Deleted",

  // Edge Nodes
  "edge_node.registered": "Edge Node Registered",

  // Posture
  "posture_check.created": "Posture Check Created",
};

function humanizeActivityCode(code: string): string {
  if (code in ACTIVITY_DISPLAY_NAMES) return ACTIVITY_DISPLAY_NAMES[code];
  // Fallback: "sdk_key.created" → "Sdk Key Created"
  return code
    .split(".")
    .map((part) =>
      part
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
    )
    .join(" ");
}

function parseMeta(raw: string | Record<string, any> | null | undefined): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "object") {
    // Already parsed (shouldn't happen with current backend, but defensive)
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      out[k] = v != null ? String(v) : "";
    }
    return out;
  }
  try {
    const parsed = JSON.parse(raw);
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      out[k] = v != null ? String(v) : "";
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Transforms a backend audit event into the frontend ActivityEvent model.
 */
export function transformAuditEvent(raw: BackendAuditEvent): ActivityEvent {
  const meta = parseMeta(raw.meta);
  return {
    id: raw.id,
    timestamp: raw.createdAt,
    activity: humanizeActivityCode(raw.activity),
    activity_code: raw.activity,
    initiator_id: raw.initiatorId ?? "",
    initiator_email: "",
    initiator_name: "",
    target_id: raw.targetId,
    meta,
  };
}

/**
 * Transforms an array of backend audit events.
 */
export function transformAuditEvents(raw: BackendAuditEvent[]): ActivityEvent[] {
  return raw.map(transformAuditEvent);
}
