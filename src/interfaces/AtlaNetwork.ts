/**
 * Mirror of the atla-zta backend `Network` / `NetworkRoute` payloads
 * (`/api/ui/networks`, `/api/ui/routes`).
 *
 * Keep field names in sync with `internal/control/schemas/network.go` and
 * `internal/control/schemas/network_route.go`.
 */

export interface AtlaNetwork {
  id: string;
  tenantId: string;
  resourceId: string;
  name: string;
  cidr: string;           // serialised by Cidr.MarshalJSON: "192.168.0.0/24"
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AtlaNetworkRoute {
  id: string;
  networkId: string;
  tenantId: string;
  cidr: string;
  via?: string | null;    // optional gateway; null/empty → connected route
  metric: number;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAtlaNetworkRequest {
  name: string;
  resourceId: string;
  cidr: string;
  description?: string;
}

export interface UpdateAtlaNetworkRequest {
  name?: string;
  resourceId?: string;
  cidr?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateAtlaRouteRequest {
  networkId: string;
  cidr: string;
  via?: string;
  metric?: number;
  description?: string;
}

export interface UpdateAtlaRouteRequest {
  networkId: string;      // immutable; identifies the route
  cidr?: string;
  via?: string;
  metric?: number;
  description?: string;
  isActive?: boolean;
}