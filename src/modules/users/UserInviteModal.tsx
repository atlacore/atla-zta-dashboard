// Dead code — user invite flow not supported in Atla ZTA.
import React from "react";
import { Group } from "@/interfaces/Group";
import { User, UserInvite } from "@/interfaces/User";

type Props = { children: React.ReactNode; groups?: Group[] };
type ModalProps = { onUserCreated: (user: User) => void; onInviteCreated: (invite: UserInvite) => void; groups?: Group[] };

export default function UserInviteModal({ children }: Readonly<Props>) {
  return <>{children}</>;
}

export function UserInviteModalContent(_props: Readonly<ModalProps>) {
  return null;
}
