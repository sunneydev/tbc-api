import { Fingerprint } from "./types/tbc.types";

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
  trustedRegistrationId: "trustedRegistrationId",
} as const;

export const BASE_URL = "https://tbconline.ge/ibs/delegate/rest";

export const TRUSTED_LOGIN_PAYLOAD = {
  businessObjectType: "3.58.01.00",
  type: "TrustedLoginDevice",
} as const;

export const defaultFingerprint: Fingerprint = {
  browserFingerprint: 1678742652,
  browserName: "Chrome",
  browserVersion: "108.0.0.0",
  operationSystemVersion: "10",
  deviceTrackedData: JSON.stringify({
    browser: "Chrome",
    engine: "WebKit",
    os: "Windows 10",
    osVersion: "10",
    cpu: "amd64",
    screen: {
      currentResolution: "1920x1080",
      availableResolution: "1920x1032",
      colorDepth: 24,
    },
    fonts:
      "Arial Black, Arial, Bauhaus 93, Calibri Light, Calibri, Cambria Math, Cambria, Candara, Comic Sans MS, Consolas, Constantia, Corbel, Courier New, Ebrima, Franklin Gothic Heavy, Franklin Gothic Medium, Gabriola, Georgia, Impact, Lucida Console, Lucida Sans Unicod",
    localStorage: true,
    isSessionStorage: true,
    timeZone: "Georgia Standard Time",
    language: "en-US",
    isCookie: true,
  }),
  os: "Windows",
};
