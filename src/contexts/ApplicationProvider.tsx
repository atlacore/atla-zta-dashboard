"use client";

import { Params } from "@utils/api";
import { useIsMd } from "@utils/responsive";
import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type Props = { children: React.ReactNode };

const ApplicationContext = React.createContext(
  {} as {
    toggleMobileNav: () => void;
    mobileNavOpen: boolean;
    globalApiParams?: Params;
    setGlobalApiParams?: (p?: Params) => void;
    isNavigationCollapsed: boolean;
    toggleNavigation: () => void;
  },
);

export default function ApplicationProvider({ children }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMd = useIsMd();
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useLocalStorage(
    "atla-nav-collapsed",
    false,
  );
  const [globalApiParams, setGlobalApiParams] = useLocalStorage<Params | undefined>(
    "atla-api-params",
    undefined,
  );

  useEffect(() => {
    if (isMd) setMobileNavOpen(false);
  }, [isMd]);

  const toggleMobileNav = () => setMobileNavOpen((v) => !v);

  const toggleNavigation = useCallback(() => {
    setIsNavigationCollapsed((prev) => !prev);
  }, [setIsNavigationCollapsed]);

  return (
    <ApplicationContext.Provider
      value={{
        toggleMobileNav,
        mobileNavOpen,
        globalApiParams,
        setGlobalApiParams,
        isNavigationCollapsed,
        toggleNavigation,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplicationContext() {
  return useContext(ApplicationContext);
}
