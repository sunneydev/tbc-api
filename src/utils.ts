import * as jose from "jose";
import type { PublicKey } from "./types/tbc.types";
import fs from "node:fs";
import { AxiosResponse } from "axios";

export async function encryptJWE(publicKey: PublicKey, payload: string) {
  const { kty, kid, n, e } = publicKey;

  const jwk = await jose.importJWK({ kty, kid, n, e, alg: "RSA-OAEP-256" });

  const jwe = await new jose.CompactEncrypt(new TextEncoder().encode(payload))
    .setProtectedHeader({ alg: "RSA-OAEP-256", enc: "A256GCM" })
    .encrypt(jwk);

  return jwe;
}

export function getCookies(setCookies: string[]): string {
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

interface Request {
  request: {
    method?: string;
    url?: string;
    headers?: any;
    data?: any;
  };
  response: {
    status: number;
    statusText: string;
    headers: any;
    data?: any;
  };
}

let requests: Request[] = [];
let filename = `requests-${new Date().toISOString()}.json`;

export function add(response: AxiosResponse) {
  const request: Request = {
    request: {
      method: response.config.method,
      url: response.config.url,
      headers: response.config.headers,
      data: response.config.data,
    },
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    },
  };

  requests.push(request);

  fs.writeFileSync(filename, JSON.stringify(requests, null, 2));
}
