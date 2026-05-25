import useFetchApi from "@utils/api";
import React, { useMemo } from "react";
import type { PeerSession } from "@/interfaces/Peer";

type Props = {
  children: React.ReactNode;
};

const PeerContext = React.createContext(
  {} as {
    peers: PeerSession[] | undefined;
    isLoading: boolean;
    refresh: () => void;
  },
);

export default function PeersProvider({ children }: Readonly<Props>) {
   const { data: peers, isLoading, mutate } = useFetchApi<PeerSession[]>("/ui/peers");

  const data = useMemo(
    () => ({ peers, isLoading, refresh: () => mutate() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [peers, isLoading],
  );

  return <PeerContext.Provider value={data}>{children}</PeerContext.Provider>;
}

export const usePeers = () => React.useContext(PeerContext);