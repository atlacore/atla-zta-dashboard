// Dead code — user invite flow not supported in Atla ZTA.
import React from "react";
import { Group } from "@/interfaces/Group";

export const InvitesTableColumns: never[] = [];

type Props = { headingTarget?: HTMLHeadingElement | null; onShowUsers?: () => void };
export default function UserInvitesTable(_props: Readonly<Props>) { return null; }

type InviteUserButtonProps = { show?: boolean; className?: string; groups?: Group[] };
export const InviteUserButton = (_props: InviteUserButtonProps) => null;
