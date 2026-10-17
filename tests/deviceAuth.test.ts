// Run with `yarn test` (Node's built-in runner executes the TypeScript directly).
// The vectors below are copied from docs/content/flows/request-signing.md in the control-plane repo.
import "reflect-metadata"; // must precede any import of @peculiar/x509
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Pkcs10CertificateRequest, X509CertificateGenerator } from "@peculiar/x509";
import {
  buildCsr,
  buildSigningString,
  canonicalBody,
  ECDSA_P256,
  fromBase64,
  generateDeviceKeys,
  isEd25519Supported,
  ResponseVerificationError,
  responseSigningInput,
  sha256Hex,
  signRequest,
  splitTopLevel,
  verifyResponse,
} from "../src/utils/deviceAuth/core.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/signed-response.json", import.meta.url), "utf8")) as {
  ca_pem: string;
  body: string;
  header_signature: string;
  nonce: string;
  now: string;
};
const verifyArgs = () => ({
  pinnedCaPem: fixture.ca_pem,
  body: fixture.body,
  headerSignature: fixture.header_signature,
  requestNonce: fixture.nonce,
  now: new Date(fixture.now),
});

async function rejects(args: Parameters<typeof verifyResponse>[0], fragment: string) {
  await assert.rejects(
    () => verifyResponse(args),
    (err: unknown) => err instanceof ResponseVerificationError && err.message.includes(fragment),
  );
}

test("request signing string matches the documented vector", async () => {
  const body =
    '{"arn":"arn:atla:net:global:3fa85f64-5717-4562-b3fc-2c963f66afa6:resource:7b1e9c0e-1d2a-4c3b-9f10-5a6b7c8d9e01","subject":"3fa85f64-5717-4562-b3fc-2c963f66afa6"}';
  const bodyHash = await sha256Hex(body);
  assert.equal(bodyHash, "8aa940ee18c671774e8e14c40e733abb60e4e56f1d5a32f2bd5dc53079f632e0");
  assert.equal(
    buildSigningString({
      method: "POST",
      target: "/api/access/connect",
      deviceId: "laptop-01",
      timestamp: "1792243200",
      nonce: "00112233445566778899aabbccddeeff",
      bodyHashHex: bodyHash,
    }),
    [
      "ATLA-DEVICE-SIG-V1",
      "POST",
      "/api/access/connect",
      "laptop-01",
      "1792243200",
      "00112233445566778899aabbccddeeff",
      "8aa940ee18c671774e8e14c40e733abb60e4e56f1d5a32f2bd5dc53079f632e0",
    ].join("\n"),
  );
});

test("response signing input matches the documented vector", async () => {
  const body = `{
  "session_id": "6f0c6f7e-9e0b-4a53-9a39-0f2d1d0a1111",
  "note": "a<b & c",
  "allowed_ips_added": [ "10.20.0.0/24" ],
  "expires_at": "2026-10-18T12:00:00Z",
  "signature": {"alg":"ed25519"}
}`;
  assert.equal(
    canonicalBody(body),
    '{"allowed_ips_added":["10.20.0.0/24"],"expires_at":"2026-10-18T12:00:00Z","note":"a\\u003cb \\u0026 c","session_id":"6f0c6f7e-9e0b-4a53-9a39-0f2d1d0a1111"}',
  );
  assert.equal(
    await responseSigningInput("00112233445566778899aabbccddeeff", body),
    "ATLA-RESP-V1\n00112233445566778899aabbccddeeff\n1cf29d602a72a7b0e20e8f19bdaf85468b4f23de7a4fc04be9bd52a9982529bb",
  );
});

test("canonicalization keeps raw member text instead of re-encoding it", () => {
  const members = splitTopLevel('{ "b" : { "10": 1, "2": 2 }, "a": [ 1.50 , 2e3 ], "s": "x > y" }');
  assert.deepEqual(
    members.map((m) => m.key),
    ["b", "a", "s"],
  );
  // JSON.parse would reorder "10"/"2" and turn 1.50 into 1.5; the hash must not depend on that
  assert.equal(members[0].raw, '{"10":1,"2":2}');
  assert.equal(members[1].raw, "[1.50,2e3]");
  assert.equal(members[2].raw, '"x \\u003e y"');
});

test("a response signed by the Go control plane verifies", async () => {
  await verifyResponse(verifyArgs());
});

test("tampering is rejected", async () => {
  await rejects({ ...verifyArgs(), body: fixture.body.replace('"allow":true', '"allow":false') }, "does not match");
  await rejects({ ...verifyArgs(), body: fixture.body.replace("10.20.0.0/24", "0.0.0.0/0") }, "does not match");
});

test("header, nonce and missing signature are rejected", async () => {
  await rejects({ ...verifyArgs(), headerSignature: "AAAA" }, "header differs");
  await rejects({ ...verifyArgs(), headerSignature: null }, "header differs");
  await rejects({ ...verifyArgs(), requestNonce: "ffffffffffffffffffffffffffffffff" }, "different request");
  await rejects({ ...verifyArgs(), body: '{"allow":true}' }, "no signature");
  await rejects({ ...verifyArgs(), body: "not json" }, "body");
});

test("a certificate from another CA is rejected", async () => {
  const keys = (await crypto.subtle.generateKey(ECDSA_P256, true, ["sign", "verify"])) as CryptoKeyPair;
  const otherCa = await X509CertificateGenerator.createSelfSigned({
    serialNumber: "01",
    name: "CN=Other CA",
    notBefore: new Date("2026-01-01"),
    notAfter: new Date("2125-01-01"),
    signingAlgorithm: { name: "ECDSA", hash: "SHA-256" },
    keys,
  });
  await rejects({ ...verifyArgs(), pinnedCaPem: otherCa.toString("pem") }, "pinned CA");
});

test("an expired certificate is rejected", async () => {
  await rejects({ ...verifyArgs(), now: new Date("2126-06-01T00:00:00Z") }, "pinned CA");
});

test("a request signature verifies with the exported public key", async () => {
  const keys = await generateDeviceKeys();
  const now = new Date("2026-10-17T12:00:00Z");
  const body = '{"arn":"x"}';
  const headers = await signRequest(keys, "web-abc", "POST", "/api/access/evaluate", body, now);

  assert.equal(headers["X-Device-ID"], "web-abc");
  assert.equal(headers["X-Device-Timestamp"], String(Math.floor(now.getTime() / 1000)));
  assert.match(headers["X-Device-Nonce"], /^[0-9a-f]{32}$/);

  const signingString = buildSigningString({
    method: "POST",
    target: "/api/access/evaluate",
    deviceId: "web-abc",
    timestamp: headers["X-Device-Timestamp"],
    nonce: headers["X-Device-Nonce"],
    bodyHashHex: await sha256Hex(body),
  });
  const publicKey = await crypto.subtle.importKey("spki", fromBase64(headers["X-Device-Public-Key"]), ECDSA_P256, false, [
    "verify",
  ]);
  const signature = fromBase64(headers["X-Device-Signature"]);
  assert.equal(signature.length, 64, "WebCrypto emits raw r||s, which the server accepts");
  assert.ok(
    await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signature as BufferSource,
      new TextEncoder().encode(signingString),
    ),
  );
  await assert.rejects(() => crypto.subtle.exportKey("pkcs8", keys.privateKey), "the private key must not be extractable");
});

test("the CSR is a valid self-signed P-256 request", async () => {
  const keys = await generateDeviceKeys();
  const pem = await buildCsr(keys, "web-abc");
  assert.match(pem, /^-----BEGIN CERTIFICATE REQUEST-----/);

  const csr = new Pkcs10CertificateRequest(pem);
  assert.ok(await csr.verify(), "CSR must be signed by its own key");
  const exported = Buffer.from(await crypto.subtle.exportKey("spki", keys.publicKey)).toString("base64");
  assert.equal(Buffer.from(csr.publicKey.rawData).toString("base64"), exported);
});

test("this runtime can verify Ed25519 (the browser support check)", async () => {
  assert.equal(await isEd25519Supported(), true);
});
