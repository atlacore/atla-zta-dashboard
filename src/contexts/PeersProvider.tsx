import useFetchApi from "@utils/api";
import React, { useMemo } from "react";
import type { PeerSession } from "@/interfaces/Peer";

type Props = {
  children: React.ReactNode;
  /** Limit the list to this user's sessions (server-side filter). */
  userId?: string;
};

const PeerContext = React.createContext(
  {} as {
    peers: PeerSession[] | undefined;
    isLoading: boolean;
    refresh: () => void;
  },
);

export default function PeersProvider({ children, userId }: Readonly<Props>) {
  const { data: peers, isLoading, mutate } = useFetchApi<PeerSession[]>(
    userId ? `/ui/peers?user_id=${userId}` : "/ui/peers",
  );

  const data = useMemo(
    () => ({ peers, isLoading, refresh: () => mutate() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [peers, isLoading],
  );

  return <PeerContext.Provider value={data}>{children}</PeerContext.Provider>;
}

export const usePeers = () => React.useContext(PeerContext);