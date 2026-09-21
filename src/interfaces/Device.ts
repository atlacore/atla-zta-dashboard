/** Device — returned from GET /ui/devices. Binds a client device_id to the (tenant, user) that enrolled it for posture-claim signing. */
export interface Device {
  id: string;
  tenantId: string;
  userId: string;
  deviceId: string;
  enrolledAt: string;
  lastSeenAt?: string;
}
