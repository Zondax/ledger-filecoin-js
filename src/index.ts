/** ******************************************************************************
 *  (c) 2019 ZondaX GbH
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
import type Transport from "@ledgerhq/hw-transport"
import { LedgerEthTransactionResolution } from "@ledgerhq/hw-app-eth/lib/services/types";

import { ResponseAddress, ResponseAppInfo, ResponseSign, ResponseVersion } from "./types";
import { APP_KEY, CLA, INS, CHUNK_SIZE, PKLEN, P1_VALUES } from "./consts";

import GenericApp, { ConstructorParams, errorCodeToString, LedgerError, PAYLOAD_TYPE, processErrorResponse, ResponseBase } from "@zondax/ledger-js";

export * from "./types";

const varint = require("varint");

export function processGetAddrResponse(response: Buffer): ResponseAddress {
  let partialResponse = response;

  const errorCodeData = response.subarray(-2)
  const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

  const compressedPk = Buffer.from(partialResponse.subarray(0, PKLEN))
  partialResponse = partialResponse.subarray(PKLEN);

  const addrByteLength = partialResponse[0];
  partialResponse = partialResponse.subarray(1);

  const addrByte = Buffer.from(partialResponse.subarray(0, addrByteLength));
  partialResponse = partialResponse.subarray(addrByteLength);

  const addrStringLength = partialResponse[0];
  partialResponse = partialResponse.subarray(1);

  const addrString = Buffer.from(partialResponse.subarray(0, addrStringLength)).toString();

  return {
    addrByte,
    addrString,
    compressedPk,
    returnCode: returnCode,
    errorMessage: errorCodeToString(returnCode),
  };
}

export default class FilecoinApp extends GenericApp {
  private eth: Eth;
  versionResponse?: ResponseVersion

  constructor(transport: Transport, scrambleKey = APP_KEY, ethScrambleKey = "w0w", ethLoadConfig = {}) {
    if (transport == null) throw new Error("Transport has not been defined");

    const params: ConstructorParams = {
      cla: CLA,
      ins: {
        GET_VERSION: 0x00,
        GET_ADDR_SECP256K1: 0x01,
        SIGN_SECP256K1: 0x02,
        SIGN_DATA_CAP: 0x05,
        SIGN_CLIENT_DEAL: 0x06,
        SIGN_RAW_BYTES: 0x07,
      },
      p1Values: {
        ONLY_RETRIEVE: 0x00,
        SHOW_ADDRESS_IN_DEVICE: 0x01,
      },
      chunkSize: CHUNK_SIZE,
    };
    super(transport, params);
    this.eth = new Eth(transport, ethScrambleKey, ethLoadConfig);
  }

  async appInfo(): Promise<ResponseAppInfo> {
    return this.transport
      .send(0xb0, 0x01, 0, 0)
      .then((response) => {
        const errorCodeData = response.subarray(-2);
        const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

        let appName = "err";
        let appVersion = "err";
        let flagLen = 0;
        let flagsValue = 0;

        if (response[0] !== 1) {
          // Ledger responds with format ID 1. There is no spec for any format != 1
          const errorMessage = "response format ID not recognized";
          const returnCode = 0x9001;
        } else {
          const appNameLen = response[1];
          appName = response.subarray(2, 2 + appNameLen).toString("ascii");
          let idx = 2 + appNameLen;
          const appVersionLen = response[idx];
          idx += 1;
          appVersion = response.subarray(idx, idx + appVersionLen).toString("ascii");
          idx += appVersionLen;
          const appFlagsLen = response[idx];
          idx += 1;
          flagLen = appFlagsLen;
          flagsValue = response[idx];
        }

        return {
          returnCode: returnCode,
          errorMessage: errorCodeToString(returnCode),
          // //
          appName,
          appVersion,
          flagLen,
          flagsValue,
          // eslint-disable-next-line no-bitwise
          flagRecovery: (flagsValue & 1) !== 0,
          // eslint-disable-next-line no-bitwise
          flagSignedMcuCode: (flagsValue & 2) !== 0,
          // eslint-disable-next-line no-bitwise
          flagOnboarded: (flagsValue & 4) !== 0,
          // eslint-disable-next-line no-bitwise
          flagPinValidated: (flagsValue & 128) !== 0,
        };
      }, processErrorResponse);
  }

  async getAddressAndPubKey(path: string): Promise<ResponseAddress> {
    const serializedPath = this.serializePath(path);
    return await this.transport
      .send(this.CLA, this.INS.GET_ADDR_SECP256K1, this.P1_VALUES.ONLY_RETRIEVE, 0, serializedPath, [LedgerError.NoErrors])
      .then(processGetAddrResponse, processErrorResponse);
  }

  async showAddressAndPubKey(path: string): Promise<ResponseAddress> {
    const serializedPath = this.serializePath(path);

    return await this.transport
      .send(this.CLA, this.INS.GET_ADDR_SECP256K1, this.P1_VALUES.SHOW_ADDRESS_IN_DEVICE, 0, serializedPath, [
        LedgerError.NoErrors,
      ])
      .then(processGetAddrResponse, processErrorResponse);
  }

  async signSendChunk(chunkIdx: number, chunkNum: number, chunk: Buffer, ins: INS): Promise<ResponseSign> {
    let payloadType = PAYLOAD_TYPE.ADD;
    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT;
    }
    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST;
    }

    return await this.transport
      .send(this.CLA, ins, payloadType, 0, chunk, [
        LedgerError.NoErrors,
        LedgerError.DataIsInvalid,
        LedgerError.BadKeyHandle,
        LedgerError.SignVerifyError,
      ])

      .then((response: Buffer) => {
        const errorCodeData = response.subarray(-2);
        const returnCode = errorCodeData[0] * 256 + errorCodeData[1];
        let errorMessage = errorCodeToString(returnCode);

        let signatureCompact = Buffer.alloc(0);
        let signatureDER = Buffer.alloc(0);
        
        if (
          returnCode === LedgerError.BadKeyHandle ||
          returnCode === LedgerError.DataIsInvalid ||
          returnCode === LedgerError.SignVerifyError
        ) {
          errorMessage = `${errorMessage} : ${response.subarray(0, response.length - 2).toString("ascii")}`;
        }
        if (returnCode === LedgerError.NoErrors && response.length > 2) {
          signatureCompact = response.subarray(0, 65);
          signatureDER = response.subarray(65, response.length - 2);
        }
    
        return {
          signatureCompact: signatureCompact,
          signatureDER: signatureDER,
          returnCode: returnCode,
          errorMessage: errorMessage,
        };
      }, processErrorResponse);
  }

  async sign(path: string, message: Buffer): Promise<ResponseSign> {
    return this.signGeneric(path, message, INS.SIGN_SECP256K1);
  }

  async signGeneric(path: string, message: Buffer, txtype: number): Promise<ResponseSign> {
    const chunks = this.prepareChunks(path, message);
    return await this.signSendChunk(1, chunks.length, chunks[0], txtype).then(async (response) => {
      let result: ResponseSign  | ResponseBase= {
        returnCode: response.returnCode,
        errorMessage: response.errorMessage,
      };

      for (let i = 1; i < chunks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        result = await this.signSendChunk(1 + i, chunks.length, chunks[i], txtype);
        if (result.returnCode !== LedgerError.NoErrors) {
          break;
        }
      }
      return result;
    }, processErrorResponse);
  }

  async signRemoveDataCap(path: string, message: Buffer): Promise<ResponseSign> {
    return this.signGeneric(path, message, INS.SIGN_DATA_CAP);
  }

  async signClientDeal(path: string, message: Buffer): Promise<ResponseSign> {
    return this.signGeneric(path, message, INS.SIGN_CLIENT_DEAL);
  }

  async signRawBytes(path: string, message: Buffer): Promise<ResponseSign> {
    const len = Buffer.from(varint.encode(message.length));
    const data = Buffer.concat([len, message]);

    return this.signGeneric(path, data, INS.SIGN_RAW_BYTES);
  }

  async signETHTransaction(path: string, rawTxHex: string, resolution?: LedgerEthTransactionResolution | null) {
    return this.eth.signTransaction(path, rawTxHex, resolution);
  }

  async getETHAddress(path: string, boolDisplay?: boolean, boolChaincode?: boolean) {
      return this.eth.getAddress(path, boolDisplay, boolChaincode);
  }

}


