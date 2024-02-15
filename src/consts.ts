export const APP_KEY = "FIL";

export const CLA = 0x06;
export const CHUNK_SIZE = 250;
export const PKLEN = 65;

export const P2_VALUES = {
  DEFAULT: 0x00,
};

export const enum INS {
    GET_VERSION = 0x00,
    GET_ADDR_SECP256K1 = 0x01,
    SIGN_SECP256K1 = 0x02,
    SIGN_DATA_CAP = 0x05,
    SIGN_CLIENT_DEAL = 0x06,
    SIGN_RAW_BYTES = 0x07,
};
  
export const P1_VALUES = {
  ONLY_RETRIEVE: 0x00,
  SHOW_ADDRESS_IN_DEVICE: 0x01,
};
  
  