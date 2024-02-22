import { type ResponseBase } from "@zondax/ledger-js";

export interface ResponseAddress extends ResponseBase {
  addrByte?: Buffer;
  addrString?: string;
  compressedPk?: Buffer;
}

export interface ResponseVersion extends ResponseBase {
  testMode: boolean;
  major: number;
  minor: number;
  patch: number;
  deviceLocked: boolean;
  targetId: string;
}

export interface ResponseSign extends ResponseBase {
  signatureCompact?: Buffer;
  signatureDER?: Buffer;
}

export interface ResponseAppInfo extends ResponseBase {
  appName?: string;
  appVersion?: string;
  flagLen?: number;
  flagsValue?: number;
  flagRecovery?: boolean;
  flagSignedMcuCode?: boolean;
  flagOnboarded?: boolean;
  flagPINValidated?: boolean;
}

export interface ResponseDeviceInfo extends ResponseBase {
  targetId?: string;
  seVersion?: string;
  flag?: string;
  mcuVersion?: string;
}

export interface SignTransaction {
  r: string;
  s: string;
  v: string;
}

export interface GetAddress {
  publicKey: string;
  address: string;
  chainCode?: string;
}  