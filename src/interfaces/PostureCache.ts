/**
 * One row from `posture_cache` — external posture score for a device fetched
 * by the `posture_sync` worker every 5 min. Mirrors the response of
 * `GET /api/ui/posture-cache/:device_id`.
 */
export interface PostureCacheEntry {
  id: string;
  tenantId: string;
  provider: "fleet" | "crowdstrike" | "intune" | string;
  deviceId: string;
  score: PostureScore;
  fetchedAt: string;
}

export interface PostureScore {
  compliant?: boolean;
  os_platform?: string;
  os_version?: string;
  disk_encryption?: boolean;
  mdm_enrolled?: boolean;
  online?: boolean;
  fetched_at?: string;
  raw?: Record<string, unknown>;
}