import { CLA, INS, ERROR_DESCRIPTION, PAYLOAD_TYPE, LedgerError } from "./consts"
import Transport from "@ledgerhq/hw-transport";
import { ResponseSign, ResponseVersion } from "./types";

const HARDENED = 0x80000000;

function isDict(v: any): boolean {
  return typeof v === "object" && v !== null && !(v instanceof Array) && !(v instanceof Date);
}

export async function getVersion(transport: Transport): Promise<ResponseVersion> {
  const versionResponse: ResponseVersion = await this.transport
    .send(CLA, INS.GET_VERSION, 0, 0)
    .then((response: Buffer) => {
      const errorCodeData = response.slice(-2);
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

      let targetId = 0;
      if (response.length >= 9) {
        /* eslint-disable no-bitwise */
        targetId = (response[5] << 24) + (response[6] << 16) + (response[7] << 8) + (response[8] << 0);
        /* eslint-enable no-bitwise */
      }

      return {
        return_code: returnCode,
        error_message: errorCodeToString(returnCode),
        test_mode: response[0] !== 0,
        major: response[1],
        minor: response[2],
        patch: response[3],
        device_locked: response[4] === 1,
        target_id: targetId.toString(16),
      };
    }, processErrorResponse);
  return versionResponse;
}

export function serializePathv1(path: string): Buffer {
  if (typeof path !== "string") {
    throw new Error("Path should be a string (e.g \"m/44'/461'/5'/0/3\")");
  }

  if (!path.startsWith("m")) {
    throw new Error('Path should start with "m" (e.g "m/44\'/461\'/5\'/0/3")');
  }

  const pathArray = path.split("/");

  if (pathArray.length !== 6) {
    throw new Error("Invalid path. (e.g \"m/44'/461'/5'/0/3\")");
  }

  const buf = Buffer.alloc(20);

  for (let i = 1; i < pathArray.length; i += 1) {
    let value = 0;
    let child = pathArray[i];
    if (child.endsWith("'")) {
      value += HARDENED;
      child = child.slice(0, -1);
    }

    const childNumber = Number(child);

    if (Number.isNaN(childNumber)) {
      throw new Error(`Invalid path : ${child} is not a number. (e.g "m/44'/461'/5'/0/3")`);
    }

    if (childNumber >= HARDENED) {
      throw new Error("Incorrect child value (bigger or equal to 0x80000000)");
    }

    value += childNumber;

    buf.writeUInt32LE(value, 4 * (i - 1));
  }
  return buf;
}

export async function signSendChunkv1(app: any, chunkIdx: number, chunkNum: number, chunk: Buffer, ins: number): Promise<ResponseSign> {
  let payloadType = PAYLOAD_TYPE.ADD;
  if (chunkIdx === 1) {
    payloadType = PAYLOAD_TYPE.INIT;
  }
  if (chunkIdx === chunkNum) {
    payloadType = PAYLOAD_TYPE.LAST;
  }
  return app.transport
    .send(CLA, ins, payloadType, 0, chunk, [0x9000, 0x6984, 0x6a80])
    .then((response: Buffer) => {
      const errorCodeData = response.slice(-2);
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1];
      let errorMessage = errorCodeToString(returnCode);

      if (returnCode === 0x6a80 || returnCode === 0x6984) {
        errorMessage = `${errorMessage} : ${response.slice(0, response.length - 2).toString("ascii")}`;
      }

      let signatureCompact = Buffer.alloc(0);
      let signatureDER = Buffer.alloc(0);
      if (response.length > 2) {
        signatureCompact = response.slice(0, 65);
        signatureDER = response.slice(65, response.length - 2);
      }

      return {
        signature_compact: signatureCompact,
        signature_der: signatureDER,
        return_code: returnCode,
        error_message: errorMessage,
      };
    }, processErrorResponse);
}
