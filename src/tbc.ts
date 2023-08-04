import type { UserInfo } from "./types/tbc.types.js";
import { Auth } from "./auth.js";

export class TBC extends Auth {
  constructor() {
    super();
  }

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
