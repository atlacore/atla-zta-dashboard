import loadConfig from "@utils/config";
import { auth } from "@/utils/auth";
import { signRequest, verifyResponse } from "./core";
import type { StoredIdentity } from "./keyStore";

const config = loadConfig();
const RESPONSE_SIGNATURE_HEADER = "X-Atla-Signature";
const NONCE_HEADER = "X-Device-Nonce";

export class SignedRequestError extends Error {
  code: number;
  /** The control plane no longer recognises this browser's device (revoked, deleted, cert invalid). */
  deviceRejected: boolean;
  /** The reply failed signature verification: treat as tampering, not as a server error. */
  untrusted: boolean;

  constructor(code: number, message: string, flags: { deviceRejected?: boolean; untrusted?: boolean } = {}) {
    super(message);
    this.name = "SignedRequestError";
    this.code = code;
    this.deviceRejected = flags.deviceRejected ?? false;
    this.untrusted = flags.untrusted ?? false;
  }
}

function errorMessage(text: string, fallback: string): string {
  try {
    const body = JSON.parse(text);
    return body.message || body.error || body.validationError || fallback;
  } catch {
    return fallback;
  }
}

// POSTs `data` signed with the device key and returns the body only if the reply's signature
// verifies against the CA pinned at enrollment. A signed PDP denial (403) is returned as a result.
export async function signedPost<T>(identity: StoredIdentity, path: string, data: unknown): Promise<T> {
  const url = new URL(`${config.apiOrigin}/api${path}`, window.location.origin);
  const body = JSON.stringify(data);
  const signed = await signRequest(identity.keys, identity.deviceId, "POST", url.pathname + url.search, body);

  const token = auth.getToken();
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { "X-User-Token": token } : {}),
      ...signed,
    },
    body,
  });
  const text = await res.text();

  const verify = async () => {
    try {
      await verifyResponse({
        pinnedCaPem: identity.caPem,
        body: text,
        headerSignature: res.headers.get(RESPONSE_SIGNATURE_HEADER),
        requestNonce: signed[NONCE_HEADER],
      });
    } catch (err) {
      throw new SignedRequestError(res.status, err instanceof Error ? err.message : "untrusted response", {
        untrusted: true,
      });
    }
  };

  if (res.ok) {
    await verify();
    return JSON.parse(text) as T;
  }
  if (res.status === 403 && text.includes('"signature"')) {
    await verify();
    return JSON.parse(text) as T;
  }

  const message = errorMessage(text, res.statusText);
  throw new SignedRequestError(res.status, message, {
    deviceRejected: res.status === 401 && /device/i.test(message),
  });
}
