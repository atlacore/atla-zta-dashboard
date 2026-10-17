// Parses an ATLA ARN "arn:atla:net:<region>:<tenantId>:<resourceType>:<resourceId>"
// See internal/dsl/arn.go for the canonical format
export type ParsedAtlaArn = {
  resourceType: string;
  resourceId: string;
};

export function parseAtlaArn(arn: string): ParsedAtlaArn | null {
  const parts = arn.split(":");
  if (parts.length < 7) return null;
  return { resourceType: parts[5], resourceId: parts[6] };
}
