/** ******************************************************************************
 *  (c) 2019-2025 Zondax AG
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
import Eth from '@ledgerhq/hw-app-eth'
import type Transport from '@ledgerhq/hw-transport'
import BaseApp, { BIP32Path, INSGeneric, processErrorResponse, processResponse } from '@zondax/ledger-js'

import * as varint from 'varint'

import { P1_VALUES, PUBKEYLEN } from './consts'
import { ResponseAddress, ResponseSign } from './types'

export class FilecoinApp extends BaseApp {
  private eth: Eth

  static _INS = {
    GET_VERSION: 0x00 as number,
    GET_ADDR_SECP256K1: 0x01 as number,
    SIGN_SECP256K1: 0x02 as number,
    SIGN_RAW_BYTES: 0x07 as number,
    SIGN_PERSONAL_MESSAGE: 0x08 as number,
  }

  static _params = {
    cla: 0x06,
    ins: { ...FilecoinApp._INS } as INSGeneric,
    p1Values: { ONLY_RETRIEVE: 0x00 as 0, SHOW_ADDRESS_IN_DEVICE: 0x01 as 1 },
    chunkSize: 250,
    requiredPathLengths: [5],
  }

  constructor(transport: Transport) {
    super(transport, FilecoinApp._params)
    if (!this.transport) {
      throw new Error('Transport has not been defined')
    }
    this.eth = new Eth(transport)
  }

  private parseAddressResponse(response: any): ResponseAddress {
    const compressed_pk = response.readBytes(PUBKEYLEN)
    const addrByteLength = response.readBytes(1)[0]
    const addrByte = response.readBytes(addrByteLength)
    const addrStringLength = response.readBytes(1)[0]
    const addrString = response.readBytes(addrStringLength).toString()

    return {
      compressed_pk,
      addrByte,
      addrString,
    } as ResponseAddress
  }

  async getAddressAndPubKey(path: string): Promise<ResponseAddress> {
    const bip44PathBuffer = this.serializePath(path)

    try {
      const responseBuffer = await this.transport.send(this.CLA, this.INS.GET_ADDR_SECP256K1!, P1_VALUES.ONLY_RETRIEVE, 0, bip44PathBuffer)

      const response = processResponse(responseBuffer)

      return this.parseAddressResponse(response)
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async showAddressAndPubKey(path: string): Promise<ResponseAddress> {
    const bip44PathBuffer = this.serializePath(path)

    try {
      const responseBuffer = await this.transport.send(
        this.CLA,
        this.INS.GET_ADDR_SECP256K1!,
        P1_VALUES.SHOW_ADDRESS_IN_DEVICE,
        0,
        bip44PathBuffer
      )

      const response = processResponse(responseBuffer)

      return this.parseAddressResponse(response)
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  private async _sign(instruction: number, path: BIP32Path, data: Buffer): Promise<ResponseSign> {
    const chunks = this.prepareChunks(path, data)
    try {
      // First chunk
      let signatureResponse = await this.sendGenericChunk(instruction, 0, 1, chunks.length, chunks[0]!)

      for (let i = 1; i < chunks.length; i += 1) {
        signatureResponse = await this.sendGenericChunk(instruction, 0, 1 + i, chunks.length, chunks[i]!)
      }

      return {
        signature_compact: signatureResponse.readBytes(65),
        signature_der: signatureResponse.getAvailableBuffer(),
      }
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async sign(path: BIP32Path, blob: Buffer): Promise<ResponseSign> {
    return this._sign(this.INS.SIGN_SECP256K1!, path, blob)
  }

  async signRawBytes(path: BIP32Path, message: Buffer) {
    const len = Buffer.from(varint.encode(message.length))
    const data = Buffer.concat([len, message])

    return this._sign(this.INS.SIGN_RAW_BYTES!, path, data)
  }

  async signPersonalMessageFVM(path: BIP32Path, messageHex: Buffer) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(messageHex.length, 0)
    const data = Buffer.concat([len, messageHex])

    return this._sign(this.INS.SIGN_PERSONAL_MESSAGE!, path, data)
  }

  async signETHTransaction(path: BIP32Path, rawTxHex: string, resolution = null) {
    return await this.eth.signTransaction(path, rawTxHex, resolution)
  }

  async getETHAddress(path: BIP32Path, boolDisplay = false, boolChaincode = false) {
    return await this.eth.getAddress(path, boolDisplay, boolChaincode)
  }

  async signPersonalMessageEVM(path: BIP32Path, messageHex: string) {
    return await this.eth.signPersonalMessage(path, messageHex)
  }
}
