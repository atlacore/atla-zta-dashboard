import { globalMetaTitle } from "@utils/meta";
import type { Metadata } from "next";
import SettingsLayout from "@/layouts/SettingsLayout";

export const metadata: Metadata = {
  title: `Settings - ${globalMetaTitle}`,
};
export default SettingsLayout;
