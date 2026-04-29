// Dead code — routes are not supported in Atla ZTA.
import { Route } from "@/interfaces/Route";
import { Dispatch, SetStateAction } from "react";

type Props = { open?: boolean; onOpenChange?: Dispatch<SetStateAction<boolean>> | ((open: boolean) => void); route?: Route };
export default function RouteUpdateModal(_props: Props) { return null; }
