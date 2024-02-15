import { type ResponseBase } from "@zondax/ledger-js";

export interface ResponseAddress extends ResponseBase {
    addrByte?: Buffer;
    addrString?: string;
    compressed_pk?: Buffer;
}

export interface ResponseVersion extends ResponseBase {
    test_mode: boolean,
    major: number,
    minor: number,
    patch: number,
    device_locked: boolean,
    target_id: string,
}

export interface ResponseSign extends ResponseBase { 
    signature_compact?: Buffer,
    signature_der?: Buffer,
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