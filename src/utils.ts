import type { Options, RequestResponse } from "@sunney/requests";
import type { Credentials, Fingerprint, PublicKey } from "./types/tbc.types";
import { defaultFingerprint } from "./consts";
import * as jose from "jose";
import prompts from "prompts";
import fs from "node:fs";

const filename = `log-${new Date().toISOString().replace(/:/g, "-")}.json`;

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

export const logMiddleware: NonNullable<
  Options["interceptors"]
>["onResponse"] = (url, _, response) => logRequest(url, response);

export async function encryptJWE(publicKey: PublicKey, payload: string) {
  const { kty, kid, n, e } = publicKey;

  const jwk = await jose.importJWK({ kty, kid, n, e, alg: "RSA-OAEP-256" });

  const jwe = await new jose.CompactEncrypt(new TextEncoder().encode(payload))
    .setProtectedHeader({ alg: "RSA-OAEP-256", enc: "A256GCM" })
    .encrypt(jwk);

  return jwe;
}

export function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function generateBrowserFingerprint(
  fingerprint: Partial<Fingerprint> = defaultFingerprint
): string {
  return Buffer.from(
    JSON.stringify({ ...defaultFingerprint, ...fingerprint })
  ).toString("base64");
}

export async function askCredentials(): Promise<Credentials> {
  return await prompts([
    {
      type: "text",
      name: "username",
      message: "Username",
      validate: (value) => value.length > 0,
    },
    {
      type: "password",
      name: "password",
      message: "Password",
      validate: (value) => value.length > 0,
    },
  ]);
}

export async function askCode(label?: string): Promise<string> {
  return await prompts({
    type: "text",
    name: "code",
    message: label || "Enter code",
    validate: (value) => value.length === 4,
  }).then((res) => res.code);
}

// make RSA encrypt and decrypt functions

export async function encrypt(data: string, key: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export async function decrypt(data: string, key: string) {
  const [iv, encrypted] = data.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    key,
    Buffer.from(iv, "hex")
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString();
}
