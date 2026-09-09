/**
 * A raw Rego policy revision, as returned by the `ui/policies` group.
 * Mirrors schemas.PolicyResponse. Distinct from the declarative
 * `AccessPolicy` model — this is the underlying `package tenant` Rego hook
 * boolean-evaluated by the PDP (see internal/pdp README on the two-pass model).
 */
export interface RawPolicy {
  id: string;
  tenant_id: string;
  name: string;
  revision: number;
  hash: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface UpsertRawPolicyRequest {
  name: string;
  body: string;
}
