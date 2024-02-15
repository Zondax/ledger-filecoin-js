export const APP_KEY = "FIL";

export const CLA = 0x06;
export const CHUNK_SIZE = 250;
export const PKLEN = 65;

export const P2_VALUES = {
  DEFAULT: 0x00,
};

export const INS = {
    GET_VERSION: 0x00,
    GET_ADDR_SECP256K1: 0x01,
    SIGN_SECP256K1: 0x02,
    SIGN_DATA_CAP: 0x05,
    SIGN_CLIENT_DEAL: 0x06,
    SIGN_RAW_BYTES: 0x07,
};

export const PAYLOAD_TYPE = {
    INIT: 0x00,
    ADD: 0x01,
    LAST: 0x02,
  };
  
  export const P1_VALUES = {
    ONLY_RETRIEVE: 0x00,
    SHOW_ADDRESS_IN_DEVICE: 0x01,
  };
  
  export const ERROR_CODE = {
    NoError: 0x9000,
  };
  
  export const enum LedgerError {
    U2FUnknown = 1,
    U2FBadRequest = 2,
    U2FConfigurationUnsupported = 3,
    U2FDeviceIneligible = 4,
    U2FTimeout = 5,
    Timeout = 14,
    NoErrors = 0x9000,
    DeviceIsBusy = 0x9001,
    ErrorDerivingKeys = 0x6802,
    ExecutionError = 0x6400,
    WrongLength = 0x6700,
    EmptyBuffer = 0x6982,
    OutputBufferTooSmall = 0x6983,
    DataIsInvalid = 0x6984,
    ConditionsNotSatisfied = 0x6985,
    TransactionRejected = 0x6986,
    BadKeyHandle = 0x6a80,
    InvalidP1P2 = 0x6b00,
    InstructionNotSupported = 0x6d00,
    AppDoesNotSeemToBeOpen = 0x6e01,
    UnknownError = 0x6f00,
    SignVerifyError = 0x6f01,
  }
  
  export const ERROR_DESCRIPTION = {
    1: "U2F: Unknown",
    2: "U2F: Bad request",
    3: "U2F: Configuration unsupported",
    4: "U2F: Device Ineligible",
    5: "U2F: Timeout",
    14: "Timeout",
    0x9000: "No errors",
    0x9001: "Device is busy",
    0x6802: "Error deriving keys",
    0x6400: "Execution Error",
    0x6700: "Wrong Length",
    0x6982: "Empty Buffer",
    0x6983: "Output buffer too small",
    0x6984: "Data is invalid",
    0x6985: "Conditions not satisfied",
    0x6986: "Transaction rejected",
    0x6a80: "Bad key handle",
    0x6b00: "Invalid P1/P2",
    0x6d00: "Instruction not supported",
    0x6e00: "App does not seem to be open",
    0x6f00: "Unknown error",
    0x6f01: "Sign/verify error",
  };
