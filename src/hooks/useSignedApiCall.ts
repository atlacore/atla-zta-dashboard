import { useApiCall } from "@utils/api";
import { buildCsr, generateDeviceKeys, isEd25519Supported } from "@utils/deviceAuth/core";
import { deleteIdentity, loadIdentity, saveIdentity, StoredIdentity } from "@utils/deviceAuth/keyStore";
import { signedPost } from "@utils/deviceAuth/signedFetch";
import { useEffect, useState } from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";

type DeviceRegisterResponse = {
  deviceId: string;
  certificate: string;
  ca_chain: string;
};

export type SigningSupport = "checking" | "supported" | "insecure-context" | "unsupported";

export function randomDeviceId(): string {
  return `web-${[...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

// Signed POSTs for endpoints that require a device signature (/access/evaluate, /access/connect).
// The first call enrolls this browser as a device; later calls reuse the stored key.
export function useSignedApiCall<T>(path = "") {
  const { loggedInUser } = useLoggedInUser();
  const register = useApiCall<DeviceRegisterResponse>("/devices/register", true);
  const [support, setSupport] = useState<SigningSupport>("checking");
  const [identity, setIdentity] = useState<StoredIdentity>();

  useEffect(() => {
    if (!window.isSecureContext || !crypto?.subtle) return setSupport("insecure-context");
    isEd25519Supported().then((ok) => setSupport(ok ? "supported" : "unsupported"));
  }, []);

  useEffect(() => {
    if (loggedInUser?.id) loadIdentity(loggedInUser.id).then(setIdentity).catch(() => {});
  }, [loggedInUser?.id]);

  const enroll = async (userId: string, requestedId?: string): Promise<StoredIdentity> => {
    const keys = await generateDeviceKeys();
    const id = requestedId || randomDeviceId();
    const res = await register.post({ device_id: id, csr: await buildCsr(keys, id) });
    const identity: StoredIdentity = {
      userId,
      deviceId: id,
      keys,
      certificatePem: res.certificate,
      caPem: res.ca_chain,
      enrolledAt: new Date().toISOString(),
    };
    await saveIdentity(identity);
    setIdentity(identity);
    return identity;
  };

  const post = async (data: unknown): Promise<T> => {
    if (!loggedInUser?.id) throw new Error("not signed in");
    const userId = loggedInUser.id;
    const identity = (await loadIdentity(userId)) ?? (await enroll(userId));
    try {
      return await signedPost<T>(identity, path, data);
    } catch (err) {
      // An admin deleted this browser's device: forget it and enroll again, once.
      if (err instanceof Error && "deviceRejected" in err && err.deviceRejected) {
        await deleteIdentity(userId);
        return signedPost<T>(await enroll(userId), path, data);
      }
      throw err;
    }
  };

  const enrollThisBrowser = async (requestedId?: string) => {
    if (!loggedInUser?.id) throw new Error("not signed in");
    return enroll(loggedInUser.id, requestedId);
  };

  // Local only: the server-side device stays until an admin deletes it.
  const forget = async () => {
    if (!loggedInUser?.id) return;
    await deleteIdentity(loggedInUser.id);
    setIdentity(undefined);
  };

  return { post, support, deviceId: identity?.deviceId, identity, enrollThisBrowser, forget };
}
