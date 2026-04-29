// Dead code — not used; kept to avoid removal complexity.
import { RowSelectionState } from "@tanstack/react-table";

type Props = {
  selectedPeers?: RowSelectionState;
  onCanceled?: () => void;
};

export const PeerMultiSelect = (_props: Props) => null;
