import useFetchApi from "@utils/api";
import { SupportStatus } from "@/interfaces/Support";

// Fetched once per session: no refetch on window focus, a download or a dialog would trigger it.
export function useSupportStatus() {
  const { data, isLoading } = useFetchApi<SupportStatus>(
    "/ui/support/status",
    true,
    false,
  );
  return { enabled: data?.enabled === true, isLoading };
}

// False while loading or on any error, so support UI never shows for a broken backend.
export function useSupportEnabled(): boolean {
  return useSupportStatus().enabled;
}
