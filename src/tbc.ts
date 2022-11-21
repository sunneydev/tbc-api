import type {
  CertificationResponse,
  CertifyAuthPayload,
  CertifySignature,
  LoginResponse,
  Transaction,
} from "./types/api.types";
import type {
  Credentials,
  IAuthenticationCodePayload,
  Signature,
  UserInfo,
} from "./types/tbc.types";
import { keys } from "./consts";
import axios, { AxiosInstance } from "axios";
import * as utils from "./utils";
import prompts from "prompts";
import fs from "node:fs";

export const BASE_URL = "https://tbconline.ge/ibs/delegate/rest";

class Auth {
  protected _axios: AxiosInstance = axios.create({ baseURL: BASE_URL });
  protected _isLoggedIn: boolean = false;

  private _updateHeader(key: string, value: string): void {
    this._axios.defaults.headers.common[key] = value;
  }

  private _updateCookie(key: string, value: string): void {
    const cookies = utils.parseCookies(
      this._axios.defaults.headers.common.Cookie || ""
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
    const sessions = headers["set-cookie"]?.filter((cookie) =>
      cookie.includes(keys.sessionId)
    );
    const sessionId = sessions?.[sessions?.length - 1]?.split(";")?.[0];

    if (!restActionToken || !sessionId) {
      throw new Error(
        `Missing ${keys.restActionToken.header} or ${keys.sessionId}`
      );
    }

    return { transaction, signature, restActionToken, sessionId };
  }

  protected async loadSession(): Promise<void> {
    const headers = JSON.parse(fs.readFileSync(".session", "utf-8"));

    this._axios.defaults.headers.common = headers;
  }

  protected async saveSession(): Promise<void> {
    const headers = this._axios.defaults.headers.common;

    fs.writeFileSync(".session", JSON.stringify(headers), "utf-8");
  }

  protected async checkLogin(): Promise<boolean> {
    const res = await this._axios
      .post("/auth/v1/loginCheck")
      .catch(utils.handleError);

    return res?.status === 200;
  }

  protected async _trust(): Promise<void> {
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

  protected async withSession(): Promise<void> {
    await this.loadSession();
    await this.checkLogin();
  }

  protected async withCredentials(
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

export class TBC extends Auth {
  private async _withCredentials(
    credentials?: Credentials,
    { save = false, trust = false }: { save?: boolean; trust?: boolean } = {}
  ) {
    await this.withCredentials(credentials);

    this._isLoggedIn = true;

    if (save) await this.saveSession();
    if (trust) await this._trust();
  }

  private async _withSession() {
    await this.withSession();
    this._isLoggedIn = await this.checkLogin();

    if (!this._isLoggedIn) {
      throw new Error("Session expired or invalid");
    }
  }

  public auth = {
    withCredentials: this._withCredentials,
    withSession: this._withSession,
    trust: this._trust,
  };

  public async getUserInfo() {
    const { data } = await this._axios.get<UserInfo>("/user/v1/info");

    return data;
  }

  public async getAccounts() {
    const { data } = await this._axios.get("/accounts/v1/accounts");

    return data;
  }
}
