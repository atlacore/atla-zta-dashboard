// Pure device-signing core: no DOM, no app imports, so `node --test` can run it.
// Spec and test vectors: docs/content/flows/request-signing.md in the control-plane repo.
import "reflect-metadata"; // tsyringe, used by @peculiar/x509, refuses to load without this polyfill
import { Pkcs10CertificateRequestGenerator, X509Certificate } from "@peculiar/x509";

const REQUEST_PREFIX = "ATLA-DEVICE-SIG-V1";
const RESPONSE_PREFIX = "ATLA-RESP-V1";
const SIGNATURE_FIELD = "signature";
const MAX_CHAIN_DEPTH = 8;

export const ECDSA_P256 = { name: "ECDSA", namedCurve: "P-256" } as const;
const ECDSA_SIGN = { name: "ECDSA", hash: "SHA-256" } as const;

export class ResponseVerificationError extends Error {
  constructor(reason: string) {
    super(`untrusted response: ${reason}`);
    this.name = "ResponseVerificationError";
  }
}

const encoder = new TextEncoder();

export function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of view) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? encoder.encode(data) : data;
  return toHex(await crypto.subtle.digest("SHA-256", bytes as BufferSource));
}

export type SigningInput = {
  method: string;
  target: string;
  deviceId: string;
  timestamp: string;
  nonce: string;
  bodyHashHex: string;
};

// Seven lines joined by "\n", no trailing newline.
export function buildSigningString(r: SigningInput): string {
  return [REQUEST_PREFIX, r.method, r.target, r.deviceId, r.timestamp, r.nonce, r.bodyHashHex].join("\n");
}

export type SignedHeaders = {
  "X-Device-ID": string;
  "X-Device-Timestamp": string;
  "X-Device-Nonce": string;
  "X-Device-Public-Key": string;
  "X-Device-Signature": string;
};

export async function exportPublicKeyHeader(publicKey: CryptoKey): Promise<string> {
  return toBase64(await crypto.subtle.exportKey("spki", publicKey));
}

// WebCrypto hashes the message itself, so it signs the signing string, not its digest.
export async function signRequest(
  keys: CryptoKeyPair,
  deviceId: string,
  method: string,
  target: string,
  body: string,
  now: Date = new Date(),
): Promise<SignedHeaders> {
  const timestamp = String(Math.floor(now.getTime() / 1000));
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const signingString = buildSigningString({
    method,
    target,
    deviceId,
    timestamp,
    nonce,
    bodyHashHex: await sha256Hex(body),
  });
  const signature = await crypto.subtle.sign(ECDSA_SIGN, keys.privateKey, encoder.encode(signingString));
  return {
    "X-Device-ID": deviceId,
    "X-Device-Timestamp": timestamp,
    "X-Device-Nonce": nonce,
    "X-Device-Public-Key": await exportPublicKeyHeader(keys.publicKey),
    "X-Device-Signature": toBase64(signature),
  };
}

export async function generateDeviceKeys(): Promise<CryptoKeyPair> {
  // Non-extractable: page script can use the private key but never read it out.
  return crypto.subtle.generateKey(ECDSA_P256, false, ["sign", "verify"]);
}

export async function buildCsr(keys: CryptoKeyPair, commonName: string): Promise<string> {
  const csr = await Pkcs10CertificateRequestGenerator.create({
    name: `CN=${commonName}`,
    keys,
    signingAlgorithm: ECDSA_SIGN,
  });
  return csr.toString("pem");
}

export async function isEd25519Supported(): Promise<boolean> {
  try {
    await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]);
    return true;
  } catch {
    return false;
  }
}

type Member = { key: string; raw: string };

// U+2028/U+2029 are built from code points so no literal line separator sits in this source file
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);
const HTML_ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LINE_SEP]: "\\u2028",
  [PARA_SEP]: "\\u2029",
};
const ESCAPE_PATTERN = new RegExp(`[<>&${LINE_SEP}${PARA_SEP}]`, "g");

function escapeLikeGo(text: string): string {
  return text.replace(ESCAPE_PATTERN, (c) => HTML_ESCAPES[c]);
}

// Splits a JSON object into its top-level members keeping each value's own text, compacted
// the way Go's encoding/json does (no whitespace outside strings, <>& U+2028/9 escaped).
// Re-encoding through JSON.parse would reorder keys and reformat numbers and break the hash.
export function splitTopLevel(text: string): Member[] {
  let i = 0;
  const skipWs = () => {
    while (i < text.length && " \t\r\n".includes(text[i])) i++;
  };
  const readString = (): string => {
    const start = i;
    i++;
    while (i < text.length && text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
    if (i >= text.length) throw new Error("unterminated string");
    i++;
    return text.slice(start, i);
  };
  const readValue = (): string => {
    let out = "";
    let depth = 0;
    for (; i < text.length; ) {
      const c = text[i];
      if (c === '"') {
        out += escapeLikeGo(readString());
        continue;
      }
      if (depth === 0 && (c === "," || c === "}")) break;
      if (c === "{" || c === "[") depth++;
      if (c === "}" || c === "]") depth--;
      if (!" \t\r\n".includes(c)) out += c;
      i++;
    }
    return out;
  };

  skipWs();
  if (text[i] !== "{") throw new Error("response body is not a JSON object");
  i++;
  const members = new Map<string, string>();
  skipWs();
  if (text[i] === "}") return [];
  for (;;) {
    skipWs();
    if (text[i] !== '"') throw new Error("expected a member name");
    const key = JSON.parse(readString()) as string;
    skipWs();
    if (text[i++] !== ":") throw new Error("expected ':'");
    skipWs();
    members.set(key, readValue());
    skipWs();
    if (text[i] === ",") {
      i++;
      continue;
    }
    if (text[i] === "}") break;
    throw new Error("malformed JSON object");
  }
  return [...members].map(([key, raw]) => ({ key, raw }));
}

function compareUtf8(a: string, b: string): number {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}

export function canonicalBody(body: string): string {
  const members = splitTopLevel(body)
    .filter((m) => m.key !== SIGNATURE_FIELD)
    .sort((a, b) => compareUtf8(a.key, b.key));
  return `{${members.map((m) => `${escapeLikeGo(JSON.stringify(m.key))}:${m.raw}`).join(",")}}`;
}

export async function responseSigningInput(nonce: string, body: string): Promise<string> {
  return `${RESPONSE_PREFIX}\n${nonce}\n${await sha256Hex(canonicalBody(body))}`;
}

type ResponseSignature = {
  alg: string;
  kid: string;
  value: string;
  nonce: string;
  public_key: string;
  certificate: string;
};

function pemBlocks(pem: string): string[] {
  return pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? [];
}

// True when `leaf` is signed by a pinned cert and the pinned chain ends in a valid self-signed root.
async function chainsToPinned(leaf: X509Certificate, pinned: X509Certificate[], now: Date): Promise<boolean> {
  let current = leaf;
  for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth++) {
    const issuer = pinned.find((c) => c.subject === current.issuer);
    if (!issuer || !(await current.verify({ publicKey: issuer, date: now }))) return false;
    if (issuer.subject === issuer.issuer) return issuer.verify({ date: now });
    current = issuer;
  }
  return false;
}

// Accepts the response only if every check passes; throws ResponseVerificationError otherwise.
export async function verifyResponse(p: {
  pinnedCaPem: string;
  body: string;
  headerSignature: string | null;
  requestNonce: string;
  now?: Date;
}): Promise<void> {
  const now = p.now ?? new Date();
  const fail = (reason: string): never => {
    throw new ResponseVerificationError(reason);
  };

  let sig: ResponseSignature | undefined;
  try {
    const raw = splitTopLevel(p.body).find((m) => m.key === SIGNATURE_FIELD)?.raw;
    sig = raw ? (JSON.parse(raw) as ResponseSignature) : undefined;
  } catch {
    return fail("body is not valid JSON");
  }
  if (!sig) return fail("response carries no signature");
  if (sig.alg !== "ed25519") return fail("unexpected signature algorithm");
  if (p.headerSignature !== sig.value) return fail("X-Atla-Signature header differs from the body");
  if (sig.nonce !== p.requestNonce) return fail("answers a different request");

  const pinned = pemBlocks(p.pinnedCaPem).map((pem) => new X509Certificate(pem));
  const leaf = new X509Certificate(sig.certificate);
  if (!(await chainsToPinned(leaf, pinned, now))) return fail("certificate does not chain to the pinned CA");

  // Ed25519 SPKI is a 12-byte prefix followed by the raw 32-byte key
  const spki = new Uint8Array(leaf.publicKey.rawData);
  const declared = fromBase64(sig.public_key);
  const certKey = spki.slice(spki.length - declared.length);
  if (declared.length !== 32 || certKey.some((b, i) => b !== declared[i])) {
    return fail("declared public key is not the certificate's");
  }

  const key = await crypto.subtle.importKey("spki", spki, { name: "Ed25519" }, false, ["verify"]);
  const input = encoder.encode(await responseSigningInput(sig.nonce, p.body));
  const valid = await crypto.subtle.verify({ name: "Ed25519" }, key, fromBase64(sig.value) as BufferSource, input);
  if (!valid) fail("signature does not match the response");
}
