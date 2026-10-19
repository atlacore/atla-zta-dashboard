import { globalMetaTitle } from "@utils/meta";
import type { Metadata } from "next";
import IntegrationsLayout from "@/layouts/IntegrationsLayout";

export const metadata: Metadata = {
  title: `Integrations - ${globalMetaTitle}`,
};
export default IntegrationsLayout;
