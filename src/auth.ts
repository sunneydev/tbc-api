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
import { type ISession, Session } from "./types/common.types";

import { promises as fs } from "fs";
import * as utils from "./utils";
import * as consts from "./consts";

import requests from "@sunney/requests";
import prompts from "prompts";

export interface AuthOptions {
  credentials?: Credentials;
  saveSession?: boolean;
  trustDevice?: boolean;
}

export class Auth {
  protected _requests = requests.create({
    baseUrl: consts.BASE_URL,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    headers: {
      "Application-Type": "IBSR",
      "Accept-Encoding": "gzip, deflate, br",
    },
    interceptors: {
      onResponse: process.env.LOG ? utils.logMiddleware : undefined,
    },
  });

  private _session: ISession | null = null;

  private async _saveSession(): Promise<void> {
    if (!this._session) {
      return;
    }

    const { key } = await prompts({
      type: "text",
      name: "key",
      message: "Encryption key",
      validate: (value) => value.length > 0,
      instructions: "This key will be used to encrypt the session file",
    });

    const encryptedPayload = await utils.encrypt(this._session, key);

    await fs.writeFile(".session", encryptedPayload, "utf-8");
  }

  private async _loadSession(): Promise<void> {
    const file = await fs.readFile(".session", "utf-8").catch(() => {});

    if (!file) {
      console.log("Session not found");
      return;
    }

    const { key } = await prompts({
      type: "text",
      name: "key",
      message: "Encryption key",
      validate: (value) => value.length > 0,
      instructions: "This key will be used to decrypt the session file",
    });

    const decryptedFile = await utils.decrypt(file, key).catch(() => {});

    if (!decryptedFile || typeof decryptedFile !== "string") {
      console.log("Session file is invalid");
      return;
    }

    const session = await Session.parseAsync(JSON.parse(decryptedFile)).catch(
      () => {}
    );

    if (!session) {
      console.log("Session file is invalid");
      return;
    }

    this._session = session;

    this._requests.headers.update(session.headers);
    this._requests.cookies.update(session.cookies);
    this._requests.cookies.set(
      consts.keys.trustedRegistrationId,
      session.trustedRegistrationId
    );
  }

  private async _certify(
    transaction: Transaction,
    challengeCode: string,
    certifyType?: "login" | "transaction"
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
      certifyType === "transaction"
        ? `/certification/v1/certifications/${id}`
        : `/auth/v1/loginCertifications/${id}`)(transaction.id);

    return await this._requests
      .put<CertificationResponse>(url, { body: payload })
      .then((r) => r.data?.trustedRegistrationId);
  }

  private async _login(
    credentials: Credentials,
    browserFingerprint?: number,
    trustedLogin?: boolean
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
          trustedLoginRequested: trustedLogin,
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

  private async _trustDevice(): Promise<string> {
    const { data: transaction } = await this._requests.post<Transaction>(
      "/transaction/v1/transaction",
      { body: consts.TRUSTED_LOGIN_PAYLOAD }
    );

    const code = await utils.askCode("Trust device 2FA code");
    return await this._certify(transaction, code, "transaction");
  }

  public async auth() {
    await this._loadSession();

    if (this._session) {
      const { transaction } = await this._login(
        this._session.credentials,
        this._session.browserFingerprint,
        true
      );

      await this._certify(
        transaction,
        this._session.trustedRegistrationId,
        "login"
      );
    }

    const isLoggedIn = await this.loginCheck();

    if (isLoggedIn) {
      console.log("Logged in succesfully!");
      return;
    }

    const credentials = await utils.askCredentials();
    const { transaction, browserFingerprint } = await this._login(credentials);

    const code = await utils.askCode("Login 2FA code");
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
