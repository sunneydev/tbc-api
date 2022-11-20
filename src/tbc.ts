import type {
  CertifyAuthPayload,
  CertifySignature,
  LoginResponse,
} from "./types/api.types";
import {
  AuthPayload,
  IAuthenticationCodePayload,
  Signature,
  Transaction,
  UserInfo,
} from "./types/tbc.types";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import prompts from "prompts";
import { BASE_URL } from "./consts";
import { encryptJWE, getCookies } from "./utils";

class Auth {
  private _axios: AxiosInstance = axios.create({ baseURL: BASE_URL });

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

  private async _askCredentials() {
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

  private async _getCertifyPayload(
    transaction: Transaction,
    signature: Signature,
    challengeCode: string
  ): Promise<CertifySignature> {
    const payload: IAuthenticationCodePayload = {
      transactionData: [transaction],
      userAuthComponents: {
        accessToken: signature.accessToken,
        challengeCode,
      },
    };

    const authenticationCode = await encryptJWE(
      signature.publicKey,
      JSON.stringify(payload)
    );

    return {
      ...signature,
      authenticationCode,
    };
  }

  private async _certifyLogin(id: number, signature: CertifySignature) {
    const payload: CertifyAuthPayload = { signatures: [signature] };

    return await this._axios.put(`/auth/v1/loginCertifications/${id}`, payload);
  }

  private async _login(payload: AuthPayload) {
    const { data, headers } = await this._axios.post<LoginResponse>(
      "/auth/v1/login",
      {
        username: payload.username,
        password: payload.password,
        language: "en",
        rememberUserName: false,
        trustedLoginRequested: false,
        deviceInfo: "web",
      }
    );

    const { transaction } = data;
    const signature = transaction.signatures.find((s) => s.accessToken);

    if (!signature) {
      throw new Error("Missing signature");
    }

    return { transaction, signature, headers };
  }

  public async withCredentials(payload?: AuthPayload) {
    payload = payload || (await this._askCredentials());

    const { transaction, signature, headers } = await this._login(payload);

    this._setTokens(headers);

    const { code } = await prompts({
      type: "text",
      name: "code",
      message: "Enter code",
      validate: (value) => value.length === 4,
    });

    const certifyPayload = await this._getCertifyPayload(
      transaction,
      signature,
      code
    );

    await this._certifyLogin(transaction.id, certifyPayload);

    return this._axios;
  }
}

export class TBC {
  private _axios: AxiosInstance = axios.create({ baseURL: BASE_URL });

  public async auth(payload?: AuthPayload) {
    const auth = new Auth();

    this._axios = await auth.withCredentials(payload);
  }

  public async getUserInfo() {
    const { data } = await this._axios.get<UserInfo>("/user/v1/info");

    return data;
  }
}
