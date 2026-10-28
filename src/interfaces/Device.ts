/** Device — returned from GET /ui/devices. Binds a client device_id to the (tenant, user) that enrolled it for posture-claim signing. */
export interface Device {
  id: string;
  tenantId: string;
  userId: string;
  deviceId: string;
  enrolledAt: string;
  lastSeenAt?: string;
  /** Empty while the device waits for an admin (the tenant requires device approval). */
  approvedAt?: string;
  approvedBy?: string;
  /** The setup key the device enrolled with; empty for a device a user registered. */
  setupKeyId?: string;
}
