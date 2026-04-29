// Dead code — not used; kept to avoid removal complexity.
import { Group } from "@/interfaces/Group";

export interface GroupUsage extends Group {
  peers_count: number;
  policies_count: number;
  nameservers_count: number;
  zones_count: number;
  routes_count: number;
  setup_keys_count: number;
  users_count: number;
  resources_count: number;
}

export default function useGroupsUsage() {
  return { data: [] as GroupUsage[], isLoading: false };
}
