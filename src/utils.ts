import * as jose from "jose";
import type { PublicKey } from "./types/tbc.types";
import fs from "node:fs";
import axios, { AxiosResponse } from "axios";

export async function encryptJWE(publicKey: PublicKey, payload: string) {
  const { kty, kid, n, e } = publicKey;

  const jwk = await jose.importJWK({ kty, kid, n, e, alg: "RSA-OAEP-256" });

  const jwe = await new jose.CompactEncrypt(new TextEncoder().encode(payload))
    .setProtectedHeader({ alg: "RSA-OAEP-256", enc: "A256GCM" })
    .encrypt(jwk);

  return jwe;
}

export function parseCookies(cookies: string): Record<string, string> {
  if (cookies.includes(",")) {
    return (
      cookies
        .split(",")
        .map((cookie) => cookie.split(";")[0]?.split("="))
        .filter((kv) => kv && kv[0] && kv[1]) as [string, string][]
    ).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
  }

  return (
    cookies
      .split(";")
      .map((cookie) => cookie.split("="))
      .filter((kv) => kv && kv[0] && kv[1]) as [string, string][]
  ).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

export function toCookieString(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([key, value]) => `${key.split(";")[0]}=${value}`)
    .join("; `");
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

export function safeParseJSON<T>(maybeJSON: string): T | string | undefined {
  try {
    return JSON.parse(maybeJSON);
  } catch (e) {
    return maybeJSON;
  }
}

// filters headers from common properties that are not needed
export function filterHeaders(headers: Record<string, any & undefined>) {
  const uselessHeaders = [
    "date",
    "pragma",
    "expires",
    "cache-control",
    "correlationid",
    "content-security-policy",
    "x-xss-protection",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "server-timing",
    "connection",
    "content-language",
    "transfer-encoding",
  ];

  for (const header of uselessHeaders) {
    delete headers[header];
  }

  return headers;
}

export function add(response: AxiosResponse) {
  const request: Request = {
    request: {
      method: response.config.method,
      url: response.config.url,
      headers: filterHeaders(response.config.headers || {}),
      data: safeParseJSON(response.config.data),
    },
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: filterHeaders(response.headers || {}),
      data: safeParseJSON(response.data),
    },
  };

  requests.push(request);

  fs.writeFileSync(filename, JSON.stringify(requests, null, 2));

  return response;
}

export function handleError(error: any) {
  const message = axios.isAxiosError(error)
    ? error.response?.data?.error || error.response?.data?.message
    : error.message || "Unknown error";

  console.error(message);
}
