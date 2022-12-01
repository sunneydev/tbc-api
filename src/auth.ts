import type {
  Credentials,
  IAuthenticationCodePayload,
  Signature,
} from "./types/tbc.types";
import type {
  Transaction,
  CertifySignature,
  CertifyAuthPayload,
  CertificationResponse,
  LoginResponse,
} from "./types/api.types";

import * as fs from "node:fs";
import * as utils from "./utils";

import prompts from "prompts";
import requests from "../../requests/dist";
import * as consts from "./consts";

export interface AuthOptions {
  credentials?: Credentials;
  saveSession?: boolean;
  trustDevice?: boolean;
}

export class Auth {
  public _requests = requests.create({
    baseUrl: consts.BASE_URL,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
    headers: {
      "Application-Type": "IBSR",
      DNT: "1",
      "Accept-Language": "en;q=0.9",
      "sec-ch-ua-mobile": "?0",
      Origin: "https://tbconline.ge",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
      Referer: "https://tbconline.ge/tbcrd/settings/login",
      "Accept-Encoding": "gzip, deflate, br",
    },
    interceptors: {
      onResponse(url, _, response) {
        utils.logRequest(url, response);
      },
    },
  });
  public _isLoggedIn: boolean = false;

  constructor() {}

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
    signature: Signature,
    challengeCode: string,
    type?: "login" | "transaction"
  ): Promise<void> {
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

    const response = await this._requests.put<CertificationResponse>(url, {
      body: payload,
    });

    if (!response) {
      throw new Error("Certification failed");
    }
  }

  private async _login(credentials: Credentials): Promise<{
    transaction: Transaction;
    signature: Signature;
    restActionToken: string;
  }> {
    credentials.username = credentials.username.toUpperCase();
    this._requests.cookies.set(
      consts.keys.username.primary,
      credentials.username
    );
    this._requests.cookies.set(
      consts.keys.username.secondary,
      credentials.username
    );

    const response = await this._requests
      .post<LoginResponse>("/auth/v1/login", {
        body: {
          username: credentials.username,
          password: credentials.password,
          language: "en",
          rememberUserName: false,
          trustedLoginRequested: false,
          deviceInfo: "yeah",
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

    const [signature] = transaction.signatures;

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

    return { transaction, signature, restActionToken };
  }

  public async loadSession(): Promise<void> {
    const { headers, cookie } = JSON.parse(
      fs.readFileSync(".session", "utf-8")
    ) as {
      headers: Record<string, string>;
      cookie: Record<string, string>;
    };

    Object.entries(headers).map(([key, value]) =>
      this._requests.headers.set(key, value)
    );
    Object.entries(cookie).map(([key, value]) =>
      this._requests.cookies.set(key, value)
    );
  }

  public async saveSession(): Promise<void> {
    const session = {
      headers: this._requests.headers.getAll(),
      cookie: this._requests.cookies.getAll(),
    };

    fs.writeFileSync(".session", JSON.stringify(session), "utf-8");
  }

  public async loginCheck(): Promise<boolean> {
    const res = await this._requests.post("/auth/v1/loginCheck");

    return res?.status === 200;
  }

  public async _trustDevice(): Promise<void> {
    if (!(await this.loginCheck())) {
      throw new Error("Not logged in");
    }

    const { data: transaction, request } =
      await this._requests.post<Transaction>("/transaction/v1/transaction", {
        body: consts.TRUSTED_LOGIN_PAYLOAD,
      });

    const [signature] = transaction.signatures;

    if (!signature) {
      throw new Error("Missing signature");
    }

    const code = await this._askCode("Trust device 2FA code");
    await this._certify(transaction, signature, code, "transaction");
  }

  public async withSession(): Promise<void> {
    await this.loadSession();
    await this.loginCheck();
  }

  public async authWithCredentials(credentials?: Credentials): Promise<void> {
    credentials = credentials || (await this._askCredentials());

    const { transaction, signature, restActionToken } = await this._login(
      credentials
    );

    this._requests.headers.set(
      consts.keys.restActionToken.header,
      restActionToken
    );
    this._requests.cookies.set(
      consts.keys.restActionToken.cookie,
      restActionToken
    );

    const code = await this._askCode("Login 2FA code");
    await this._certify(transaction, signature, code, "login");
  }
}
