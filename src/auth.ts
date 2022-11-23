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

import axios, { AxiosError, type AxiosInstance } from "axios";
import prompts from "prompts";
import { BASE_URL, keys } from "./consts";

export interface AuthOptions {
  credentials?: Credentials;
  saveSession?: boolean;
  trustDevice?: boolean;
}

export class Auth {
  public _axios: AxiosInstance = axios.create({ baseURL: BASE_URL });
  public _isLoggedIn: boolean = false;

  constructor() {
    this._axios.interceptors.response.use(
      (response) => utils.add(response),
      (err: AxiosError) => {
        if (err.response) utils.add(err.response);

        return Promise.reject(err);
      }
    );
  }

  private _updateHeader(key: string, value: string): void {
    this._axios.defaults.headers.common[key] = value;
  }

  private _updateCookie(key: string, value: string): void {
    const axiosCookies = this._axios.defaults.headers?.common["Cookie"];

    const cookies = utils.parseCookies(
      typeof axiosCookies === "string" ? axiosCookies : ""
    );

    cookies[key] = value;

    this._axios.defaults.headers.common["Cookie"] =
      utils.toCookieString(cookies);
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

    const response = await this._axios
      .put<CertificationResponse>(url, payload)
      .catch(utils.handleError);

    if (!response) {
      throw new Error("Certification failed");
    }

    const { data } = response;

    data.trustedRegistrationId;
  }

  private async _login(credentials: Credentials): Promise<{
    transaction: Transaction;
    signature: Signature;
    restActionToken: string;
    sessionId: string;
  }> {
    const {
      data: { transaction },
      headers,
    } = await this._axios.post<LoginResponse>("/auth/v1/login", {
      username: credentials.username,
      password: credentials.password,
      language: "en",
      rememberUserName: false,
      trustedLoginRequested: false,
      deviceInfo: "web",
    });

    const [signature] = transaction.signatures;

    if (!signature) {
      throw new Error("Missing signature");
    }

    const restActionToken = headers[keys.restActionToken.header];

    // get last JSESSIONID from the array because
    // for some dumbass reason TBC thought it would be a great idea
    // to respond with two JSESSIONID's instead of one 🫠
    // TODO: replace this dumbass boilerplate with `.findLast` in 2023
    // https://github.com/microsoft/TypeScript/issues/48829
    const cookies = utils.parseCookies(headers["set-cookie"]?.join(",") || "");

    this._axios.defaults.headers.common["Cookie"] =
      utils.toCookieString(cookies);

    const sessionId = cookies[keys.sessionId];

    if (!restActionToken || !sessionId) {
      throw new Error(
        `Missing ${keys.restActionToken.header} or ${keys.sessionId}`
      );
    }

    return { transaction, signature, restActionToken, sessionId };
  }

  public async loadSession(): Promise<void> {
    const headers = JSON.parse(fs.readFileSync(".session", "utf-8"));

    this._axios.defaults.headers.common = headers;
  }

  public async saveSession(): Promise<void> {
    const headers = this._axios.defaults.headers.common;

    fs.writeFileSync(".session", JSON.stringify(headers), "utf-8");
  }

  public async checkLogin(): Promise<boolean> {
    const res = await this._axios
      .post("/auth/v1/loginCheck")
      .catch(utils.handleError);

    return res?.status === 200;
  }

  public async _trustDevice(): Promise<void> {
    const { data: transaction } = await this._axios.post<Transaction>(
      "/transaction/v1/transaction",
      {
        businessObjectType: "3.58.01.00",
        type: "TrustedLoginDevice",
      }
    );

    const [signature] = transaction.signatures;

    if (!signature) {
      throw new Error("Missing signature");
    }

    const code = await this._askCode("Trust device 2FA code");
    await this._certify(transaction, signature, code, "transaction");
  }

  public async withSession(): Promise<void> {
    await this.loadSession();
    await this.checkLogin();
  }

  public async authWithCredentials(
    credentials?: Credentials
  ): Promise<AxiosInstance> {
    credentials = credentials || (await this._askCredentials());

    const { transaction, signature, sessionId, restActionToken } =
      await this._login(credentials);

    this._updateCookie(keys.sessionId, sessionId);
    this._updateCookie(keys.restActionToken.cookie, restActionToken);
    this._updateHeader(keys.restActionToken.header, restActionToken);

    const code = await this._askCode("Login 2FA code");
    await this._certify(transaction, signature, code, "login");

    return this._axios;
  }
}
