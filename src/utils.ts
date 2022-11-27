import * as jose from "jose";
import type { PublicKey } from "./types/tbc.types";

export async function encryptJWE(publicKey: PublicKey, payload: string) {
  const { kty, kid, n, e } = publicKey;

  const jwk = await jose.importJWK({ kty, kid, n, e, alg: "RSA-OAEP-256" });

  const jwe = await new jose.CompactEncrypt(new TextEncoder().encode(payload))
    .setProtectedHeader({ alg: "RSA-OAEP-256", enc: "A256GCM" })
    .encrypt(jwk);

  return jwe;
}
