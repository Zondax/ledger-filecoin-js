export interface ResponseAddress {
  compressed_pk: Buffer
  addrByte: Buffer
  addrString: string
}

export interface ResponseSign {
  signature_compact: Buffer
  signature_der: Buffer
}
