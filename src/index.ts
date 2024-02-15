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

//totes les funcions que nonfacin servir "this." ho posem al helper
//el ? es com una or amb undefined

import Eth from "@ledgerhq/hw-app-eth";
import Transport from "@ledgerhq/hw-transport";
import { LedgerEthTransactionResolution } from "@ledgerhq/hw-app-eth/lib/services/types";

import { getVersion, serializePathv1, signSendChunkv1 } from "./helperV1";
import { ResponseAddress, ResponseAppInfo, ResponseDeviceInfo, ResponseSign, ResponseVersion } from "./types";
import { APP_KEY, ERROR_CODE, CLA, INS, CHUNK_SIZE, PKLEN, P1_VALUES } from "./consts";

import { errorCodeToString, processErrorResponse } from "@zondax/ledger-js";

export * from "./types";

const varint = require("varint");

export function processGetAddrResponse(response: Buffer): ResponseAddress { 
  let partialResponse = response;

  const errorCodeData = response.subarray(-2)
  const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

  const pk = Buffer.from(partialResponse.subarray(0, PKLEN))
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
    compressed_pk: pk,
    return_code: returnCode,
    error_message: errorCodeToString(returnCode),
  };
}

export default class FilecoinApp {
  private eth: Eth;
  versionResponse?: ResponseVersion
  transport: Transport

  constructor(transport: Transport, scrambleKey = APP_KEY, ethScrambleKey = "w0w", ethLoadConfig = {}) {
    if (transport == null) throw new Error("Transport has not been defined");
      this.transport = transport;
      this.eth = new Eth(transport as any, ethScrambleKey, ethLoadConfig);
  }

  static prepareChunks(serializedPathBuffer: Buffer, message: Buffer): Buffer[] {
    const chunks: Buffer[] = [];

    chunks.push(serializedPathBuffer);

    const buffer = Buffer.concat([message]);
    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      let end = i + CHUNK_SIZE;
      if (i > buffer.length) {
        end = buffer.length;
      }
      chunks.push(buffer.slice(i, end));
    }
    return chunks;
  }
  
  async signGetChunks(path: string, message: Buffer): Promise<Buffer[]> {
    const serializedPath = await this.serializePath(path);
    return FilecoinApp.prepareChunks(serializedPath, message);
  }

  async serializePath(path: string): Promise<Buffer> {
    this.versionResponse = await getVersion(this.transport);

    if (this.versionResponse.return_code !== ERROR_CODE.NoError) {
      throw this.versionResponse;
    }

    switch (this.versionResponse.major) {
      case 0:
      case 1:
        return serializePathv1(path);
      default:
        throw new Error("App Version is not supported")
    }
  }

  async appInfo(): Promise<ResponseAppInfo> {
    return this.transport.send(0xb0, 0x01, 0, 0).then((response) => {
      const errorCodeData = response.slice(-2);
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

      const result: any = {};

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
        // eslint-disable-next-line no-bitwise
        flag_recovery: (flagsValue & 1) !== 0,
        // eslint-disable-next-line no-bitwise
        flag_signed_mcu_code: (flagsValue & 2) !== 0,
        // eslint-disable-next-line no-bitwise
        flag_onboarded: (flagsValue & 4) !== 0,
        // eslint-disable-next-line no-bitwise
        flag_pin_validated: (flagsValue & 128) !== 0,
      };
    }, processErrorResponse);
  }

  async deviceInfo(): Promise<ResponseDeviceInfo> {
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
          targetId,
          seVersion,
          flag,
          mcuVersion,
        };
      }, processErrorResponse);
  }

  async getAddressAndPubKey(path: string): Promise<ResponseAddress> {
    const serializedPath = await this.serializePath(path);
    return await this.transport
      .send(CLA, INS.GET_ADDR_SECP256K1, P1_VALUES.ONLY_RETRIEVE, 0, serializedPath, [0x9000])
      .then(processGetAddrResponse, processErrorResponse);
  }

  async showAddressAndPubKey(path): Promise<ResponseAddress> {
    const serializedPath = await this.serializePath(path);
    
    return await this.transport 
      .send(CLA, INS.GET_ADDR_SECP256K1, P1_VALUES.SHOW_ADDRESS_IN_DEVICE, 0, serializedPath, [0x9000])
      .then(processGetAddrResponse, processErrorResponse);
  }

  async signSendChunk(chunkIdx: number, chunkNum: number, chunk: Buffer, ins: number): Promise<ResponseSign> {
    this.versionResponse = await getVersion(this.transport);
    switch (this.versionResponse.major) {
      case 0:
      case 1:
        return signSendChunkv1(this, chunkIdx, chunkNum, chunk, ins);
      default:
        throw new Error("App Version is not supported")
    }
  }

  async signGeneric(path: string, message: Buffer, ins: number): Promise<ResponseSign> {
    return this.signGetChunks(path, message)
      .then((chunks) => {
        return this.signSendChunk(1, chunks.length, chunks[0], ins)
          .then(async (response) => {
            let result: ResponseSign = { 
              return_code: response.return_code,
              error_message: response.error_message,
              signature_compact: Buffer.alloc(0),
              signature_der: Buffer.alloc(0),
            };

            for (let i = 1; i < chunks.length; i += 1) {
              // eslint-disable-next-line no-await-in-loop
              result = await this.signSendChunk(1 + i, chunks.length, chunks[i], ins);
              if (result.return_code !== ERROR_CODE.NoError) {
                break;
              }
            }
            return {
              return_code: result.return_code,
              error_message: result.error_message,
              signature_compact: result.signature_compact,
              signature_der: result.signature_der,
            };
          },
          processErrorResponse,
        );
    }, processErrorResponse);
  }

  async sign(path: string, message: Buffer): Promise<ResponseSign> {
    return this.signGeneric(path, message, INS.SIGN_SECP256K1);
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
