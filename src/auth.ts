import type {
  Credentials,
  IAuthenticationCodePayload,
} from "./types/tbc.types";
import type {
  Transaction,
  CertifySignature,
  CertifyAuthPayload,
  CertificationResponse,
  LoginResponse,
} from "./types/api.types";

import { z } from "zod";
import * as fs from "node:fs";
import * as utils from "./utils";
import * as consts from "./consts";

import requests from "@sunney/requests";
import prompts from "prompts";

interface ISession extends z.infer<typeof Session> {}

const Session = z.object({
  trustedRegistrationId: z.string(),
  browserFingerprint: z.number(),
  credentials: z.object({
    username: z.string(),
    password: z.string(),
  }),
  headers: z.record(z.string()),
  cookies: z.record(z.string()),
});

export interface AuthOptions {
  credentials?: Credentials;
  saveSession?: boolean;
  trustDevice?: boolean;
}

export class Auth {
  public _requests = requests.create({
    baseUrl: consts.BASE_URL,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    headers: {
      "Application-Type": "IBSR",
      "Accept-Encoding": "gzip, deflate, br",
    },
    interceptors: {
      onResponse(url, _, response) {
        utils.logRequest(url, response);
      },
    },
  });

  private _session: ISession | null = null;

  private async _saveSession(): Promise<void> {
    if (!this._session) {
      return;
    }

    fs.writeFileSync(
      ".session",
      JSON.stringify(this._session, null, 2),
      "utf-8"
    );
  }

  private async _loadSession(): Promise<void> {
    const file = await fs.promises
      .readFile(".session", "utf-8")
      .catch(() => console.log("Session not found"));

    if (!file) return;

    const session = await Session.parseAsync(JSON.parse(file)).catch(() =>
      console.log("Session file is invalid")
    );

    if (!session) return;

    this._session = session;

    this._requests.headers.update(session.headers);
    this._requests.cookies.update(session.cookies);
    this._requests.cookies.set(
      consts.keys.trustedRegistrationId,
      session.trustedRegistrationId
    );

    const { transaction } = await this._login(session.credentials);

    await this._certify(transaction, session.trustedRegistrationId, "login");
  }

  private async _askCredentials(): Promise<Credentials> {
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

  private async _askCode(label?: string): Promise<string> {
    return await prompts({
      type: "text",
      name: "code",
      message: label || "Enter code",
      validate: (value) => value.length === 4,
    }).then((res) => res.code);
  }

  private async _certify(
    transaction: Transaction,
    challengeCode: string,
    type?: "login" | "transaction"
  ): Promise<string> {
    const signature = transaction.signatures?.[0];

    if (!signature) {
      throw new Error("Signature not found");
    }

    const authPayload: IAuthenticationCodePayload = {
      transactionData: [transaction],
      userAuthComponents: {
        accessToken: signature.accessToken,
        challengeCode,
      },
    };

    const authenticationCode = await utils.encryptJWE(
      signature.publicKey,
      JSON.stringify(authPayload)
    );

    const certifySignature: CertifySignature = {
      ...signature,
      authenticationCode,
    };

    const payload: CertifyAuthPayload = { signatures: [certifySignature] };

    const url = ((id: number) =>
      type === "transaction"
        ? `/certification/v1/certifications/${id}`
        : `/auth/v1/loginCertifications/${id}`)(transaction.id);

    return await this._requests
      .put<CertificationResponse>(url, {
        body: payload,
      })
      .then((r) => r.data?.trustedRegistrationId);
  }

  private async _login(
    credentials: Credentials,
    browserFingerprint?: number
  ): Promise<{
    transaction: Transaction;
    browserFingerprint: number;
  }> {
    browserFingerprint ??= utils.random(1600000000, 1700000000);

    const response = await this._requests
      .post<LoginResponse>("/auth/v1/login", {
        body: {
          username: credentials.username,
          password: credentials.password,
          language: "en",
          rememberUserName: false,
          trustedLoginRequested: false,
          deviceInfo: utils.generateBrowserFingerprint({ browserFingerprint }),
        },
      })
      .catch(console.error);

    if (!response) {
      throw new Error("Login failed");
    }

    const {
      data: { transaction },
      headers,
    } = response;

    const signature = transaction?.signatures.find((s) => s);

    if (!signature) {
      throw new Error("Missing signature");
    }

    const restActionToken = headers.get(consts.keys.restActionToken.header);
    const sessionId = this._requests.cookies.get(consts.keys.sessionId);

    if (!restActionToken || !sessionId) {
      throw new Error(
        `Missing ${consts.keys.restActionToken.header} or ${consts.keys.sessionId}`
      );
    }

    this._requests.headers.set(
      consts.keys.restActionToken.header,
      restActionToken
    );

    return { transaction, browserFingerprint };
  }

  public async loginCheck(): Promise<boolean> {
    const res = await this._requests.post<{ success: boolean }>(
      "/auth/v1/loginCheck"
    );

    return res?.data.success;
  }

  public async _trustDevice(): Promise<string> {
    const { data: transaction } = await this._requests.post<Transaction>(
      "/transaction/v1/transaction",
      { body: consts.TRUSTED_LOGIN_PAYLOAD }
    );

    const code = await this._askCode("Trust device 2FA code");
    return await this._certify(transaction, code, "transaction");
  }

  public async login() {
    const sessionLoaded = await this._loadSession()
      .then(() => this.loginCheck())
      .catch(() => false);

    if (sessionLoaded) {
      console.log("Session loaded");
      return;
    }

    const credentials = await this._askCredentials();
    const { transaction, browserFingerprint } = await this._login(credentials);

    const code = await this._askCode("Login 2FA code");
    await this._certify(transaction, code, "login");

    const trustedRegistrationId = await this._trustDevice();

    this._session = {
      credentials,
      trustedRegistrationId,
      browserFingerprint,
      cookies: this._requests.cookies.getAll(),
      headers: this._requests.headers.getAll(),
    };

    this._saveSession();
  }
}
