// Dead code — onboarding routing peer setup not supported in Atla ZTA.
import { Peer } from "@/interfaces/Peer";
import { Network } from "@/interfaces/Network";

type Props = { network?: Network; peers?: Peer[]; onRoutingPeerAdded: (peer: Peer) => void };
export const OnboardingAddRoutingPeer = (_props: Props) => null;