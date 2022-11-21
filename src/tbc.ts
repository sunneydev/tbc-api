import type {
  CertifyAuthPayload,
  CertifySignature,
  LoginResponse,
  Transaction,
} from "./types/api.types";
import type {
  AuthPayload,
  IAuthenticationCodePayload,
  Signature,
  UserInfo,
} from "./types/tbc.types";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { encryptJWE, getCookies, handleError } from "./utils";
import prompts from "prompts";
import fs from "node:fs";

export const BASE_URL_IBS = "https://tbconline.ge/ibs/delegate/rest";
export const BASE_URL_RIBGW = "https://ribgw.tbconline.ge/accounts/api/v1";

class Auth {
  protected _axios: AxiosInstance = axios.create({ baseURL: BASE_URL_IBS });

  private _setTokens(loginResponseHeaders: AxiosResponse["headers"]): void {
    const key = "rest-action-token";
    const restActionToken = loginResponseHeaders[key];

    if (!restActionToken) {
      throw new Error(`Missing ${key} header`);
    }

    const cookies = getCookies([
      ...(loginResponseHeaders["set-cookie"] || []),
      `TBC-Rest-Action-Token=${restActionToken}`,
    ]);

    // set cookies manually because axios doesn't support cookies in node.js
    this._axios.defaults.headers.common["Cookie"] = cookies;
    this._axios.defaults.headers.common[key] = restActionToken;
  }

  private async _askCredentials(): Promise<AuthPayload> {
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

    const authenticationCode = await encryptJWE(
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

    await this._axios.put(url, payload).catch(handleError);
  }

  private async _login(payload: AuthPayload): Promise<{
    transaction: Transaction;
    signature: Signature;
    headers: AxiosResponse["headers"];
  }> {
    const {
      data: { transaction },
      headers,
    } = await this._axios.post<LoginResponse>("/auth/v1/login", {
      username: payload.username,
      password: payload.password,
      language: "en",
      rememberUserName: false,
      trustedLoginRequested: false,
      deviceInfo: "web",
    });

    const [signature] = transaction.signatures;

    if (!signature) {
      throw new Error("Missing signature");
    }

    return { transaction, signature, headers };
  }

  private async _loadSession(): Promise<void> {
    const headers = JSON.parse(fs.readFileSync(".session", "utf-8"));

    this._axios.defaults.headers.common = headers;
  }

  private async _saveSession(): Promise<void> {
    const headers = this._axios.defaults.headers.common;

    fs.writeFileSync(".session", JSON.stringify(headers), "utf-8");
  }

  protected async check(): Promise<boolean> {
    const res = await this._axios
      .post("/auth/v1/loginCheck")
      .catch(handleError);

    return res?.status === 200;
  }

  protected async save(): Promise<void> {
    await this._saveSession();
  }
  protected async trustDevice(): Promise<void> {
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
    await this._loadSession();
    await this.check();
  }

  protected async withCredentials(
    payload?: AuthPayload
  ): Promise<AxiosInstance> {
    payload = payload || (await this._askCredentials());

    const { transaction, signature, headers } = await this._login(payload);
    this._setTokens(headers);

    const code = await this._askCode("Login 2FA code");
    await this._certify(transaction, signature, code, "login");

    return this._axios;
  }
}

export class TBC extends Auth {
  private _isLoggedIn: boolean = false;

  public auth = {
    withCredentials: async ({
      authPayload,
      save,
    }: {
      authPayload: AuthPayload;
      save?: boolean;
    }) => {
      await this.withCredentials(authPayload);
      this._isLoggedIn = true;
      if (save) {
        await this.save();
      }
    },
    withSession: async () => {
      await this.withSession();
      this._isLoggedIn = await this.check();

      if (!this._isLoggedIn) {
        throw new Error("Session expired or invalid");
      }
    },
    trustDevice: this.trustDevice,
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
