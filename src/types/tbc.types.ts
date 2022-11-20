export interface AuthPayload {
  username: string;
  password: string;
}

export interface Transaction {
  type: string;
  id: number;
  status: string;
  statusText: string;
  businessObjectType: string;
  description: null;
  certRequired: boolean;
  hasMySign: null;
  enhancedStatusText: null;
  reasonForCancel: null;
  externalSystemResultCode: null;
  lastTransactionCheckResult: LastTransactionCheckResult;
  failureReason: null;
  signatures: Signature[];
  registeredBy: number;
  registeredByName: null;
  registrationDate: number;
  attachmentReferences: null;
  needMyAuthorization: null;
  awaitingSignRoles: null;
  awaitingSigners: null;
  validEmail: boolean;
  possibleChallengeRegenTypes: string[];
  lastTrial: null;
}

export interface LastTransactionCheckResult {
  violations: any[];
  failed: boolean;
  created: number;
  needCerification: boolean;
}

export interface Signature {
  id: number;
  deviceType: string;
  status: string;
  regenerateChallengeCount: number;
  regenerateChallengeCountRemaining: number;
  evaluateCount: number;
  evaluateCountRemaining: number;
  signer: number;
  signerName: null;
  challengeValidTo: number;
  accessToken: string;
  publicKey: PublicKey;
}

export interface PublicKey {
  kty: string;
  e: string;
  kid: string;
  n: string;
}

export interface IUserAuthComponents {
  accessToken: string;
  challengeCode: string;
}

export interface IAuthenticationCodePayload {
  transactionData: Transaction[];
  userAuthComponents: IUserAuthComponents;
}

export interface UserInfo {
  userDcuId: number;
  userActorId: number;
  personId: number;
  username: string;
  firstName: string;
  firstNameEn: string;
  firstNameGe: string;
  middleName: null;
  lastName: string;
  lastNameEn: string;
  lastNameGe: string;
  email: string;
  homePhone: null;
  mobilePhone: string;
  mobilePhoneForSms: string;
  mfaType: string;
  externalClientId: string;
  clientName: string;
  clientNameEn: string;
  clientNameGe: string;
  lastLoginDate: number;
  clientSegment: string;
  isChecker: boolean;
  checkingEnabled: boolean;
  batchCrcSignatureRequired: boolean;
  channel: string;
  subChannel: string;
  signingRoleCode: null;
  showMyMoneyReportPopup: boolean;
  showWelcomeNewsletterPopup: boolean;
  showTrustedDevicePopup: boolean;
  showOffersMenu: boolean;
  appleWalletTurnedOn: boolean;
  reportDataExist: boolean;
  isAdmin: boolean;
  isDirector: boolean;
  identificationDocumentUpdatable: boolean;
  identificationDocumentValidTo: number;
  validTo: null;
  preferredCertificationMethod: string;
  securityDevices: string[];
  address: string;
  city: string;
  street: string;
  birthday: number;
  resident: boolean;
  parameters: Parameters;
  widgetLayouts: any[];
  securityLevel: string;
  operationTypes: string[];
  signingRuleOperations: null;
  hasLinkForContextSwitch: boolean;
  showCorpContact3CollectionPopup: boolean;
  showBfmClientData: boolean;
  multipleAccountStatementExport: boolean;
  clientInvoiceGeDisabled: boolean;
  checkUniquenessOfTransfers: boolean;
  digitalUser: boolean;
  showOpenBankingPopup: null;
  showOpenbankingExpiryPopup: null;
  admin: boolean;
  director: boolean;
}

export interface Parameters {
  FEEDEBT_WARNING_LAST_DATE: string;
  SELECTED_UPS_PAYMENT_REGION_ID: number;
  PRIMARY_ACCOUNT: number;
  PUBLIC_AVATAR_WARNING_SHOWN: boolean;
  UMTS_PAYMENT_FUNCTIONALITY_VIEWED: boolean;
  WELCOME_TOUR_SEEN_VERSION_PRIMARY: number;
  HOME_PAGE_WIDGET_DISPLAY_SETTINGS: string;
  EXPIRED_ID_WARNING_LAST_SEEN_DATE: string;
  PRIMARY_ACCOUNT_CONFIRMATION_ASK_AGAIN: boolean;
  PENSIONS_POPUP_VIEWED: boolean;
  CDP_EMAIL_MODIFICATIONDATE: string;
}
