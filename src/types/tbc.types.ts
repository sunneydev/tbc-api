import { Transaction } from "./api.types";

export interface AuthPayload {
  username: string;
  password: string;
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

export interface Accounts {
  items: Account[];
  hideAccountsWithZeroBalance: null;
  totalAmountInGel: number;
  bills: null;
}

export interface Account {
  id: number;
  coreAccountId: number;
  friendlyName: null | string;
  iban: string;
  type: string;
  cardUsageType: number;
  priority: number;
  typeText: string;
  subType: string;
  subTypeText: AccountType;
  availableBalance: number;
  availableBalanceInGel: number;
  blockedAmount: number;
  currency: string;
  hidden: null;
  primary: null;
  canBePrimary: boolean;
  overdraftCheckDate: null;
  overdraftAmount: null;
  paymentOperationTypeContext: PaymentOperationTypeContext[];
  accountCategory: AccountCategory;
  canBeClosed: boolean;
}

export enum AccountCategory {
  DebitCard = "DebitCard",
  SavingAccount = "SavingAccount",
}

export interface PaymentOperationTypeContext {
  code: null;
  operationType: string;
  context: string | null;
}

export type AccountType =
  | "VISA ELECTRON"
  | "VISA CLASSIC"
  | "VISA GOLD"
  | "VISA BUSINESS"
  | "TBC COSMO CLASSIC"
  | "VISA GOLD COMFORT"
  | "VISA ELECTRON INTERNET"
  | "VISA ELECTRON MOBILE"
  | "TBC COSMO ELECTRON"
  | "MC GOLD"
  | "MC STANDARD"
  | "MC MAESTRO"
  | "TBC LUKOIL ELECTRON"
  | "INSTALLEMENT CARD"
  | "TBC CARD INSTANT"
  | "TBC CARD CLASSIC"
  | "TBC CARD GOLD"
  | "TBC CARD STANDARD"
  | "TBC CARD MC_GOLD"
  | "CONCEPT CARD VISA GOLD"
  | "CONCEPT CARD MC GOLD"
  | "SMART CARD VISA ELECTRON"
  | "VISA PLATINUM"
  | "INSTALLMENT_CARD"
  | "iC@rd"
  | "Internet Banking"
  | "MC Business საკრედიტო"
  | "Mini-Micro"
  | "Mobile Banking"
  | "MC BUSINESS"
  | "VISA INFINITE"
  | "AGRO CARD"
  | "MC STUDENT CARD"
  | "Business Club Visa Business"
  | "MC WORLD ELITE"
  | "BUSINESS PLAN VISA BUSINESS"
  | "CONCEPT MC PLATINUM"
  | "VISA BUSINESS STARTUPER"
  | "SPACE ბარათი"
  | "VISA GOLD PAYROLL"
  | "LOCAL BUSINESS CARD"
  | "CONCEPT VISA PLATINUM"
  | "VISA BUSINESS PLATINUM"
  | "AGRO CARD"
  | "CONCEPT VISA SIGNATURE";
