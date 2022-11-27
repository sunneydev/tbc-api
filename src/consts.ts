export const keys = {
  sessionId: "JSESSIONID",
  restActionToken: {
    cookie: "TBC-Rest-Action-Token",
    header: "Rest-Action-Token",
  },
  username: {
    primary: "tbcIbUsername",
    secondary: "tbcIbUsernameX",
  },
} as const;

export const BASE_URL = "https://tbconline.ge/ibs/delegate/rest";
