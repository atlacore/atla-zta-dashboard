import { Resource } from "@/interfaces/Resource";

/**
 * Builds the `net` ARN for a resource. The backend never sends a
 * precomputed ARN on ResourceResponse — the format is fixed
 * (see internal/dsl/arn.go), so we assemble it client-side from the
 * resource's own tenantId/region/id.
 */
export function buildResourceArn(resource: Pick<Resource, "tenantId" | "region" | "id">) {
  return `arn:atla:net:${resource.region}:${resource.tenantId}:resource:${resource.id}`;
}
