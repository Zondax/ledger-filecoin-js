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
import type Transport from '@ledgerhq/hw-transport'

import { BIP32Path } from '@zondax/ledger-js'

/**
 * Minimal ETH APDU implementation to avoid heavy hw-app-eth dependency
 * This implementation only includes the methods needed for Filecoin EVM support
 */

const CLA = 0xe0
const INS_GET_ETH_ADDRESS = 0x02
const INS_SIGN_ETH_TRANSACTION = 0x04
const INS_SIGN_PERSONAL_MESSAGE = 0x08

const CHUNK_SIZE = 255

export interface EthAddress {
  publicKey: string
  address: string
  chainCode?: string
}

export interface EthSignature {
  v: string
  r: string
  s: string
}

/**
 * Encodes a BIP32 path into a buffer
 */
function encodePath(path: BIP32Path): Buffer {
  const pathArray = typeof path === 'string' ? path.split('/').filter((p) => p !== 'm') : path
  const pathNumbers = pathArray.map((p) => {
    const stripped = p.replace(/'/g, '')
    const num = parseInt(stripped, 10)
    return p.includes("'") ? num + 0x80000000 : num
  })

  const buffer = Buffer.alloc(1 + pathNumbers.length * 4)
  buffer.writeUInt8(pathNumbers.length, 0)
  pathNumbers.forEach((element, index) => {
    buffer.writeUInt32BE(element, 1 + 4 * index)
  })
  return buffer
}

/**
 * Get Ethereum address from the Ledger device
 */
export async function getETHAddress(transport: Transport, path: BIP32Path, display = false, chaincode = false): Promise<EthAddress> {
  const pathBuffer = encodePath(path)
  const p1 = display ? 0x01 : 0x00
  const p2 = chaincode ? 0x01 : 0x00

  const response = await transport.send(CLA, INS_GET_ETH_ADDRESS, p1, p2, pathBuffer)

  // Parse response: publicKey (65 bytes), address (40 bytes ASCII), optional chainCode (32 bytes)
  const publicKeyLength = response[0]!
  const publicKey = response.slice(1, 1 + publicKeyLength).toString('hex')
  const addressLength = response[1 + publicKeyLength]!
  const address = response.slice(1 + publicKeyLength + 1, 1 + publicKeyLength + 1 + addressLength).toString('ascii')

  const result: EthAddress = {
    publicKey,
    address: address.startsWith('0x') ? address : '0x' + address,
  }

  if (chaincode) {
    const chainCode = response.slice(1 + publicKeyLength + 1 + addressLength, 1 + publicKeyLength + 1 + addressLength + 32).toString('hex')
    result.chainCode = chainCode
  }

  return result
}

/**
 * Sign an Ethereum transaction
 */
export async function signETHTransaction(
  transport: Transport,
  path: BIP32Path,
  rawTxHex: string,
  resolution?: any
): Promise<EthSignature> {
  const pathBuffer = encodePath(path)

  // Remove 0x prefix if present
  const txHex = rawTxHex.startsWith('0x') ? rawTxHex.slice(2) : rawTxHex
  const txBuffer = Buffer.from(txHex, 'hex')

  const chunks: Buffer[] = []
  const totalLength = pathBuffer.length + txBuffer.length

  // First chunk includes path
  let offset = 0
  const firstChunkSize = Math.min(CHUNK_SIZE - pathBuffer.length, txBuffer.length)
  chunks.push(Buffer.concat([pathBuffer, txBuffer.slice(0, firstChunkSize)]))
  offset += firstChunkSize

  // Remaining chunks
  while (offset < txBuffer.length) {
    const chunkSize = Math.min(CHUNK_SIZE, txBuffer.length - offset)
    chunks.push(txBuffer.slice(offset, offset + chunkSize))
    offset += chunkSize
  }

  let response: Buffer = Buffer.alloc(0)

  // Send chunks
  for (let i = 0; i < chunks.length; i++) {
    const p1 = i === 0 ? 0x00 : 0x80 // First chunk or subsequent
    const p2 = 0x00
    response = await transport.send(CLA, INS_SIGN_ETH_TRANSACTION, p1, p2, chunks[i]!)
  }

  // Parse signature response
  // Response format: v (1 byte) + r (32 bytes) + s (32 bytes)
  if (response.length < 65) {
    throw new Error('Invalid signature response length')
  }

  const v = response[0]!.toString(16).padStart(2, '0')
  const r = response.slice(1, 33).toString('hex')
  const s = response.slice(33, 65).toString('hex')

  return { v, r, s }
}

/**
 * Sign a personal message (EIP-191)
 */
export async function signPersonalMessageEVM(transport: Transport, path: BIP32Path, messageHex: string): Promise<EthSignature> {
  const pathBuffer = encodePath(path)

  // Remove 0x prefix if present
  const msgHex = messageHex.startsWith('0x') ? messageHex.slice(2) : messageHex
  const messageBuffer = Buffer.from(msgHex, 'hex')

  // Prepare message length as 4-byte big-endian
  const lengthBuffer = Buffer.alloc(4)
  lengthBuffer.writeUInt32BE(messageBuffer.length, 0)

  const chunks: Buffer[] = []

  // First chunk includes path and length
  let offset = 0
  const firstChunkData = Buffer.concat([pathBuffer, lengthBuffer])
  const firstChunkSize = Math.min(CHUNK_SIZE - firstChunkData.length, messageBuffer.length)
  chunks.push(Buffer.concat([firstChunkData, messageBuffer.slice(0, firstChunkSize)]))
  offset += firstChunkSize

  // Remaining chunks
  while (offset < messageBuffer.length) {
    const chunkSize = Math.min(CHUNK_SIZE, messageBuffer.length - offset)
    chunks.push(messageBuffer.slice(offset, offset + chunkSize))
    offset += chunkSize
  }

  let response: Buffer = Buffer.alloc(0)

  // Send chunks
  for (let i = 0; i < chunks.length; i++) {
    const p1 = i === 0 ? 0x00 : 0x80 // First chunk or subsequent
    const p2 = 0x00
    response = await transport.send(CLA, INS_SIGN_PERSONAL_MESSAGE, p1, p2, chunks[i]!)
  }

  // Parse signature response
  if (response.length < 65) {
    throw new Error('Invalid signature response length')
  }

  const v = response[0]!.toString(16).padStart(2, '0')
  const r = response.slice(1, 33).toString('hex')
  const s = response.slice(33, 65).toString('hex')

  return { v, r, s }
}
