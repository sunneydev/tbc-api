import type { UserInfo } from "./types/tbc.types";
import type { AuthOptions } from "./auth";
import { Auth } from "./auth";

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

const tbc = new TBC();

const options = {
  auth: {
    withCredentials: async (opts?: AuthOptions) => {
      await tbc.withCredentials(opts);
    },
    withSession: async () => {
      await tbc.withSession();
    },
  },
};

export default options;
