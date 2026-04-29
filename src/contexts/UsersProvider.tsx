"use client";

import FullScreenLoading from "@components/ui/FullScreenLoading";
import useFetchApi, { useApiCall } from "@utils/api";
import { useRouter } from "next/navigation";
import React from "react";
import { auth } from "@/utils/auth";
import { User } from "@/interfaces/User";

type Props = { children: React.ReactNode };

const UsersContext = React.createContext(
  {} as {
    users: User[] | undefined;
    refresh: () => void;
    isLoading: boolean;
  },
);

const UserProfileContext = React.createContext(
  {} as {
    loggedInUser: User | undefined;
  },
);

export default function UsersProvider({ children }: Readonly<Props>) {
  // revalidate=false: list doesn't refetch on focus/reconnect; call refresh() explicitly when needed
  const { data: users, mutate, isLoading } = useFetchApi<User[]>("/ui/users", false, false);

  const refresh = () => {
    mutate().then();
  };

  return (
    <UsersContext.Provider value={{ users, refresh, isLoading }}>
      <UserProfileProvider>{children}</UserProfileProvider>
    </UsersContext.Provider>
  );
}

export const useUsers = () => React.useContext(UsersContext);

const UserProfileProvider = ({ children }: Props) => {
  // ignoreError=true so 401 doesn't crash; revalidate=false to prevent focus-triggered refetches
  const { data: user, isLoading } = useFetchApi<User>("/ui/user", true, false, true, {
    key: "user-profile",
  });

  // Only block on the very first load (no data yet), not on background revalidations
  if (isLoading && !user) return <FullScreenLoading />;

  return (
    <UserProfileContext.Provider value={{ loggedInUser: user }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => React.useContext(UserProfileContext);

export const useLoggedInUser = () => {
  const { loggedInUser } = useUserProfile();
  const router = useRouter();

  const isOwner = loggedInUser?.role === "owner";
  const isAdmin = loggedInUser?.role === "admin";
  const isOwnerOrAdmin = isOwner || isAdmin;
  const isUser = !isOwnerOrAdmin;

  const logout = () => {
    auth.clearToken();
    router.push("/login");
  };

  return { loggedInUser, isOwner, isAdmin, isUser, isOwnerOrAdmin, logout } as const;
};

export const useUserUpdate = () => {
  const request = useApiCall<User>("/ui/user");
  return {
    update: (id: string, data: Partial<User>) => request.patch(data, `/${id}`),
  };
};
