import useFetchApi from "@utils/api";
import { SupportStatus } from "@/interfaces/Support";

// False while loading or on any error, so support UI never shows for a broken backend.
export function useSupportEnabled(): boolean {
  const { data } = useFetchApi<SupportStatus>("/ui/support/status", true);
  return data?.enabled === true;
}
