import type { LastTransactionCheckResult, Signature } from "./tbc.types.js";

export interface LoginRequestPayload {
  username: string;
  password: string;
  language: string;
  rememberUserName: boolean;
  deviceInfo: string;
  trustedLoginRequested: boolean;
}

export interface LoginResponse {
  success: boolean;
  changePasswordSuggested: boolean;
  subchannelCode: string;
  language: string;
  timezone: string;
  currentActor: number;
  userLinks: any[];
  transaction: Transaction;
}

export interface CertifyAuthPayload {
  signatures: CertifySignature[];
}

export interface CertifySignature extends Signature {
  authenticationCode: string;
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

export interface CertificationResponse extends Transaction {
  trustedRegistrationId: string;
}
