"use client";

import "../app/globals.css";
import Button from "@components/Button";
import { UserAvatar } from "@components/ui/UserAvatar";
import { cn } from "@utils/helpers";
import { useIsSm, useIsXs } from "@utils/responsive";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import React from "react";
import AnnouncementProvider, {
  useAnnouncement,
} from "@/contexts/AnnouncementProvider";
import ApplicationProvider, {
  useApplicationContext,
} from "@/contexts/ApplicationProvider";
import CountryProvider from "@/contexts/CountryProvider";
import GroupsProvider from "@/contexts/GroupsProvider";
import PermissionsProvider from "@/contexts/PermissionsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import UsersProvider from "@/contexts/UsersProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import Navigation from "@/layouts/Navigation";
import Header, { headerHeight } from "./Header";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ApplicationProvider>
      <UsersProvider>
        <PermissionsProvider>
          <AnnouncementProvider>
            <GroupsProvider>
              <CountryProvider>
                <DashboardPageContent>{children}</DashboardPageContent>
              </CountryProvider>
            </GroupsProvider>
          </AnnouncementProvider>
        </PermissionsProvider>
      </UsersProvider>
    </ApplicationProvider>
  );
}

function DashboardPageContent({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { loggedInUser } = useLoggedInUser();
  const { mobileNavOpen, toggleMobileNav } = useApplicationContext();
  const isSm = useIsSm();
  const isXs = useIsXs();
  const { isRestricted } = usePermissions();
  const { bannerHeight } = useAnnouncement();

  const navOpenPageWidth = isSm ? "45%" : isXs ? "60%" : "80%";

  return (
    <div className={cn("flex flex-col h-screen", mobileNavOpen && "flex")}>
      {mobileNavOpen && (
        <motion.div
          className={"h-screen bg-nb-gray-950 w-11/12 max-w-[22rem]"}
          layout={true}
          transition={{
            type: "spring",
            stiffness: 100,
            bounce: 0.8,
            damping: 10,
            mass: 0.4,
          }}
          animate={{ x: 0 }}
          initial={{ x: -200 }}
        >
          <div
            className={
              "flex items-center justify-between gap-3 pl-4 pr-8 pt-8 pb-3 w-11/12"
            }
          >
            <div className={"flex items-center gap-3 max-w-[22rem]"}>
              <UserAvatar size={"small"} />
              <div className="flex flex-col space-y-1">
                <p className="font-medium leading-none dark:text-gray-300">
                  {loggedInUser?.displayName || loggedInUser?.email}
                </p>
                <p className="text-xs leading-none dark:text-gray-400">
                  {loggedInUser?.email}
                </p>
              </div>
            </div>
            <Button
              className={"!px-3"}
              variant={"default-outline"}
              size={"xs"}
              onClick={toggleMobileNav}
            >
              <div>
                <XIcon size={16} className={"relative"} />
              </div>
            </Button>
          </div>
          <Navigation fullWidth />
        </motion.div>
      )}
      {mobileNavOpen ? (
        // Mobile: animated slide + scale
        <motion.div
          className={"border border-nb-gray-900 shadow-inner overflow-hidden rounded-xl fixed scale-75"}
          transition={{ type: "spring", stiffness: 500, damping: 25, duration: 0.45, mass: 0.1 }}
          animate={{ x: navOpenPageWidth, width: "100%", height: "90vh", y: "6.5%" }}
        >
          <motion.div
            onClick={toggleMobileNav}
            className={"absolute w-full h-full bg-black z-[999] opacity-0"}
            animate={{ opacity: 0.2 }}
          />
          <div className={"relative"}>
            <Header />
            <div
              className={"flex flex-row flex-grow"}
              style={{ height: `calc(100vh - ${headerHeight + bannerHeight}px)` }}
            >
              {!isRestricted && <Navigation hideOnMobile />}
              {children}
            </div>
          </div>
        </motion.div>
      ) : (
        // Desktop: plain div, zero animation overhead
        <div className={"w-full"}>
          <Header />
          <div
            className={"flex flex-row flex-grow"}
            style={{ height: `calc(100vh - ${headerHeight + bannerHeight}px)` }}
          >
            {!isRestricted && <Navigation hideOnMobile />}
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
