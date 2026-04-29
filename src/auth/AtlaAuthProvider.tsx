"use client";

import FullScreenLoading from "@components/ui/FullScreenLoading";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { auth } from "@/utils/auth";

const PUBLIC_PATHS = ["/login", "/setup", "/install", "/error"];

const isPublicPath = (path: string) =>
  PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/")) ||
  path.startsWith("/invite");

type Props = { children: React.ReactNode };

export default function AtlaAuthProvider({ children }: Props) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isPublicPath(path)) {
      setReady(true);
      return;
    }

    if (!auth.isAuthenticated()) {
      router.replace(`/login?redirect=${encodeURIComponent(path)}`);
      return;
    }

    setReady(true);
  // router intentionally omitted — useRouter() returns a new reference every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  if (!ready) return <FullScreenLoading />;
  return <>{children}</>;
}
