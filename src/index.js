/** ******************************************************************************
 *  (c) 2019 ZondaX GmbH
 *  (c) 2016-2017 Ledger
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ******************************************************************************* */

import Eth from "@ledgerhq/hw-app-eth";
import { serializePathv1, signSendChunkv1 } from "./helperV1";
import {
  APP_KEY,
  CHUNK_SIZE,
  CLA,
  ERROR_CODE,
  errorCodeToString,
  getVersion,
  INS,
  P1_VALUES,
  PKLEN,
  processErrorResponse,
} from "./common";

const varint = require("varint");

export const CHAIN_TYPE = {
  EVM: 0,
  FVM: 1,
};

function processGetAddrResponse(response) {
  let partialResponse = response;

  const errorCodeData = partialResponse.slice(-2);
  const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

  const pk = Buffer.from(partialResponse.slice(0, PKLEN));
  partialResponse = partialResponse.slice(PKLEN);

  const addrByteLength = partialResponse[0];
  partialResponse = partialResponse.slice(1);

  const addrByte = Buffer.from(partialResponse.slice(0, addrByteLength));
  partialResponse = partialResponse.slice(addrByteLength);

  const addrStringLength = partialResponse[0];
  partialResponse = partialResponse.slice(1);

  const addrString = Buffer.from(partialResponse.slice(0, addrStringLength)).toString();

  return {
    addrByte,
    addrString,
    compressed_pk: pk,
    return_code: returnCode,
    error_message: errorCodeToString(returnCode),
  };
}

export default class FilecoinApp {
  constructor(transport, scrambleKey = APP_KEY, ethScrambleKey = "w0w", ethLoadConfig = {}) {
    if (!transport) {
      throw new Error("Transport has not been defined");
    }

    this.transport = transport;
    this.eth = new Eth(transport, ethScrambleKey, ethLoadConfig);

    transport.decorateAppAPIMethods(
      this,
      ["getVersion", "appInfo", "deviceInfo", "getAddressAndPubKey", "sign"],
      scrambleKey,
    );
  }

  static prepareChunks(serializedPathBuffer, message) {
    const chunks = [];

    // First chunk (only path)
    chunks.push(serializedPathBuffer);

    const messageBuffer = Buffer.from(message);

    const buffer = Buffer.concat([messageBuffer]);
    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      let end = i + CHUNK_SIZE;
      if (i > buffer.length) {
        end = buffer.length;
      }
      chunks.push(buffer.slice(i, end));
    }

    return chunks;
  }

  async serializePath(path) {
    this.versionResponse = await getVersion(this.transport);

    if (this.versionResponse.return_code !== ERROR_CODE.NoError) {
      throw this.versionResponse;
    }

    switch (this.versionResponse.major) {
      case 0:
      case 1:
      case 2:
        return serializePathv1(path);
      default:
        return {
          return_code: 0x6400,
          error_message: "App Version is not supported",
        };
    }
  }

  async signGetChunks(path, message) {
    const serializedPath = await this.serializePath(path);
    return FilecoinApp.prepareChunks(serializedPath, message);
  }

  async getVersion() {
    return getVersion(this.transport)
      .then((response) => {
        this.versionResponse = response;
        return response;
      })
      .catch((err) => processErrorResponse(err));
  }

  async appInfo() {
    return this.transport.send(0xb0, 0x01, 0, 0).then((response) => {
      const errorCodeData = response.slice(-2);
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

      const result = {};

      let appName = "err";
      let appVersion = "err";
      let flagLen = 0;
      let flagsValue = 0;

      if (response[0] !== 1) {
        // Ledger responds with format ID 1. There is no spec for any format != 1
        result.error_message = "response format ID not recognized";
        result.return_code = 0x9001;
      } else {
        const appNameLen = response[1];
        appName = response.slice(2, 2 + appNameLen).toString("ascii");
        let idx = 2 + appNameLen;
        const appVersionLen = response[idx];
        idx += 1;
        appVersion = response.slice(idx, idx + appVersionLen).toString("ascii");
        idx += appVersionLen;
        const appFlagsLen = response[idx];
        idx += 1;
        flagLen = appFlagsLen;
        flagsValue = response[idx];
      }

      return {
        return_code: returnCode,
        error_message: errorCodeToString(returnCode),
        // //
        appName,
        appVersion,
        flagLen,
        flagsValue,

        flag_recovery: (flagsValue & 1) !== 0,

        flag_signed_mcu_code: (flagsValue & 2) !== 0,

        flag_onboarded: (flagsValue & 4) !== 0,

        flag_pin_validated: (flagsValue & 128) !== 0,
      };
    }, processErrorResponse);
  }

  async deviceInfo() {
    return this.transport
      .send(0xe0, 0x01, 0, 0, Buffer.from([]), [ERROR_CODE.NoError, 0x6e00])
      .then((response) => {
        const errorCodeData = response.slice(-2);
        const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

        if (returnCode === 0x6e00) {
          return {
            return_code: returnCode,
            error_message: "This command is only available in the Dashboard",
          };
        }

        const targetId = response.slice(0, 4).toString("hex");

        let pos = 4;
        const secureElementVersionLen = response[pos];
        pos += 1;
        const seVersion = response.slice(pos, pos + secureElementVersionLen).toString();
        pos += secureElementVersionLen;

        const flagsLen = response[pos];
        pos += 1;
        const flag = response.slice(pos, pos + flagsLen).toString("hex");
        pos += flagsLen;

        const mcuVersionLen = response[pos];
        pos += 1;
        // Patch issue in mcu version
        let tmp = response.slice(pos, pos + mcuVersionLen);
        if (tmp[mcuVersionLen - 1] === 0) {
          tmp = response.slice(pos, pos + mcuVersionLen - 1);
        }
        const mcuVersion = tmp.toString();

        return {
          return_code: returnCode,
          error_message: errorCodeToString(returnCode),
          // //
          targetId,
          seVersion,
          flag,
          mcuVersion,
        };
      }, processErrorResponse);
  }

  async getAddressAndPubKey(path) {
    return this.serializePath(path)
      .then((data) => {
        return this.transport
          .send(CLA, INS.GET_ADDR_SECP256K1, P1_VALUES.ONLY_RETRIEVE, 0, data, [0x9000])
          .then(processGetAddrResponse, processErrorResponse);
      })
      .catch((err) => processErrorResponse(err));
  }

  async showAddressAndPubKey(path) {
    return this.serializePath(path)
      .then((data) => {
        return this.transport
          .send(CLA, INS.GET_ADDR_SECP256K1, P1_VALUES.SHOW_ADDRESS_IN_DEVICE, 0, data, [0x9000])
          .then(processGetAddrResponse, processErrorResponse);
      })
      .catch((err) => processErrorResponse(err));
  }

  async signSendChunk(chunkIdx, chunkNum, chunk, ins) {
    switch (this.versionResponse.major) {
      case 0:
      case 1:
      case 2:
        return signSendChunkv1(this, chunkIdx, chunkNum, chunk, ins);
      default:
        return {
          return_code: 0x6400,
          error_message: "App Version is not supported",
        };
    }
  }

  async signGeneric(path, message, ins) {
    return this.signGetChunks(path, message).then((chunks) => {
      return this.signSendChunk(1, chunks.length, chunks[0], ins, [ERROR_CODE.NoError]).then(
        async (response) => {
          let result = {
            return_code: response.return_code,
            error_message: response.error_message,
            signature_compact: null,
            signature_der: null,
          };

          for (let i = 1; i < chunks.length; i += 1) {
            result = await this.signSendChunk(1 + i, chunks.length, chunks[i], ins);
            if (result.return_code !== ERROR_CODE.NoError) {
              break;
            }
          }

          return {
            return_code: result.return_code,
            error_message: result.error_message,
            // ///
            signature_compact: result.signature_compact,
            signature_der: result.signature_der,
          };
        },
        processErrorResponse,
      );
    }, processErrorResponse);
  }

  async sign(path, message) {
    return this.signGeneric(path, message, INS.SIGN_SECP256K1);
  }

  async signRawBytes(path, message) {
    const msg = Buffer.from(message);
    const len = Buffer.from(varint.encode(msg.length));
    const data = Buffer.concat([len, message]);

    return this.signGeneric(path, data, INS.SIGN_RAW_BYTES);
  }

  async signETHTransaction(path, rawTxHex, resolution = null) {
    return this.eth.signTransaction(path, rawTxHex, resolution);
  }

  async getETHAddress(path, boolDisplay = false, boolChaincode = false) {
    return this.eth.getAddress(path, boolDisplay, boolChaincode);
  }

  async signPersonalMessageFVM(path, messageHex) {
    const msg = Buffer.from(messageHex, "hex");
    const len = Buffer.alloc(4);
    len.writeUInt32BE(msg.length, 0);
    const data = Buffer.concat([len, msg]);
    const result = await this.signGeneric(path, data, INS.SIGN_PERSONAL_MESSAGE);
    return result;
  }

  async signPersonalMessage(path, messageHex, chainType = CHAIN_TYPE.EVM) {
    if (typeof path !== "string" || !path) {
      throw new Error("Invalid or missing 'path' parameter");
    }
    if (typeof messageHex !== "string" || !/^[0-9a-fA-F]*$/.test(messageHex)) {
      throw new Error("Invalid or missing 'messageHex' parameter; must be a hex string");
    }

    switch (chainType) {
      case CHAIN_TYPE.EVM:
        return this.eth.signPersonalMessage(path, messageHex);
      case CHAIN_TYPE.FVM:
        return this.signPersonalMessageFVM(path, messageHex);
      default:
        throw new Error(`Unsupported chain type: ${chainType}`);
    }
  }
}
