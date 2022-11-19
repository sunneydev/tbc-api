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
