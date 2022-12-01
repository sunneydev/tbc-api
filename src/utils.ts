import type { RequestResponse } from "@sunney/requests";
import type { PublicKey } from "./types/tbc.types";
import * as jose from "jose";
import fs from "node:fs";

export async function encryptJWE(publicKey: PublicKey, payload: string) {
  const { kty, kid, n, e } = publicKey;

  const jwk = await jose.importJWK({ kty, kid, n, e, alg: "RSA-OAEP-256" });

  const jwe = await new jose.CompactEncrypt(new TextEncoder().encode(payload))
    .setProtectedHeader({ alg: "RSA-OAEP-256", enc: "A256GCM" })
    .encrypt(jwk);

  return jwe;
}

const filename = `${new Date().toISOString().replace(/:/g, "-")}.json`;

interface Log {
  url: string;
  request: {
    method: string;
    headers: Record<string, string>;
    cookies: Record<string, string>;
    body: Record<string, unknown>;
  };
  response: {
    status: number;
    headers: Record<string, string>;
    cookies: Record<string, string>;
    body: Record<string, unknown>;
  };
}

const logs: {
  url: string;
  request: {
    url: string;
    options?: RequestInit | undefined;
  };
  response: Omit<RequestResponse<any>, "request" | "statusText" | "redirected">;
}[] = [];

export const logRequest = (url: string, response: RequestResponse<any>) => {
  const { request, statusText, redirected, ...rest } = response;
  const { method, ...restRequest } = request;

  logs.push({ url, request: restRequest, response: rest });
  fs.writeFileSync(filename, JSON.stringify(logs, null, 2));
};
