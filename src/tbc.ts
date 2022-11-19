import type { CertifyAuthPayload, LoginResponse } from "./types/api.types";
import axios, { AxiosInstance } from "axios";
import { IUserAuthComponents, Transaction } from "./types/tbc.types";

export class TBC {
  private _axios: AxiosInstance = axios.create({
    baseURL: "https://tbconline.ge/ibs/delegate/rest",
    headers: { "Content-Type": "application/json" },
  });

  public async auth(username: string, password: string) {
    const response = await this._axios.post<LoginResponse>("/auth/v1/login", {
      username,
      password,
      language: "en",
      rememberUserName: false,
      trustedLoginRequested: false,
      deviceInfo: "web",
    });

    // set cookies manually because axios doesn't support cookies in node.js
    const key = "rest-action-token";
    const restActionToken = response.headers[key];

    if (!restActionToken) {
      throw new Error(`Missing ${key} header`);
    }

    this._axios.defaults.headers.common[key] = restActionToken;

    const cookies = [
      ...(response.headers["set-cookie"] || []),
      `TBC-Rest-Action-Token=${restActionToken}`,
    ]
      .map((c) => c.split(";")[0])
      .join("; ");

    this._axios.defaults.headers.common["Cookie"] = cookies;

    return response;
  }

  public async certifyLogin(id: number, payload: CertifyAuthPayload) {
    return await this._axios.put(`/auth/v1/loginCertifications/${id}`, payload);
  }

  public getCertifyPayload(
    transaction: Omit<Transaction, "signatures">,
    authComponents: IUserAuthComponents
  ) {
    return {
      transactionData: [transaction],
      userAuthComponents: authComponents,
    };
  }
}
