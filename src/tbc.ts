import type { UserInfo } from "./types/tbc.types";
import type { AuthOptions } from "./auth";
import { Auth } from "./auth";

export class TBC extends Auth {
  constructor() {
    super();
  }

  private async _withCredentials(opts?: AuthOptions): Promise<void> {
    const { credentials, trustDevice, saveSession } = opts || {};

    await this.authWithCredentials(credentials);

    this._isLoggedIn = true;

    if (trustDevice) await this._trustDevice();
    if (saveSession) await this.saveSession();
  }

  private async _withSession() {
    await this.withSession();
    this._isLoggedIn = await this.checkLogin();

    if (!this._isLoggedIn) {
      throw new Error("Session expired or invalid");
    }
  }

  public auth = {
    withCredentials: this._withCredentials.bind(this),
    withSession: () => this._withSession(),
  };

  public async getUserInfo() {
    const { data } = await this._requests.get<UserInfo>("/user/v1/info");

    return data;
  }

  public async getAccounts() {
    const { data } = await this._requests.get("/account/v2/everydayAccounts", {
      params: {
        showAccountsWithZeroBalance: "true",
        showHidden: "true",
      },
    });

    return data;
  }
}
