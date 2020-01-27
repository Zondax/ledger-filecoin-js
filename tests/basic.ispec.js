import FilecoinApp from "index.js";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { expect, test } from "jest";
import secp256k1 from "secp256k1/elliptic";
import blake2 from "blake2";
import { ERROR_CODE } from "../src/common";

test("get version", async () => {
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);
    const resp = await app.getVersion();
    // eslint-disable-next-line no-console
    console.log(resp);

    expect(resp.return_code).toEqual(ERROR_CODE.NoError);
    expect(resp.error_message).toEqual("No errors");
    expect(resp).toHaveProperty("test_mode");
    expect(resp).toHaveProperty("major");
    expect(resp).toHaveProperty("minor");
    expect(resp).toHaveProperty("patch");
    expect(resp.test_mode).toEqual(false);
  } finally {
    transport.close();
  }
});

test("getAddressAndPubKey", async () => {
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);

    // Derivation path. First 3 items are automatically hardened!
    const path = [44, 461, 5, 0, 3];
    const resp = await app.getAddressAndPubKey(path);

    // eslint-disable-next-line no-console
    console.log(resp);

    expect(resp.return_code).toEqual(ERROR_CODE.NoError);
    expect(resp.error_message).toEqual("No errors");

    expect(resp).toHaveProperty("addrByte");
    expect(resp).toHaveProperty("addrString");
    expect(resp).toHaveProperty("compressed_pk");

    expect(resp.compressed_pk.length).toEqual(33);
    expect(resp.compressed_pk.toString("hex")).toEqual(
      "0325d0dbeedb2053e690a58e9456363158836b1361f30dba0332f440558fa803d0",
    );

    expect(resp.addrByte.toString("hex")).toEqual("0171d1b27cf522114294029c5a42351f716cbb6c65");

    expect(resp.addrString).toEqual("f1ohi3e7hveiiuffactrneeni7ofwlw3dfaglieba");
  } finally {
    transport.close();
  }
});

test("showAddressAndPubKey", async () => {
  jest.setTimeout(60000);
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);

    // Derivation path. First 3 items are automatically hardened!
    const path = [44, 461, 0, 0, 1];
    const resp = await app.showAddressAndPubKey(path);

    // eslint-disable-next-line no-console
    console.log(resp);

    expect(resp.return_code).toEqual(0x9000);
    expect(resp.error_message).toEqual("No errors");

    expect(resp).toHaveProperty("addrByte");
    expect(resp).toHaveProperty("addrString");
    expect(resp).toHaveProperty("compressed_pk");

    expect(resp.compressed_pk.length).toEqual(33);
    expect(resp.compressed_pk.toString("hex")).toEqual(
      "03b481eeff158ba0044fa075b2a53cb34de11193699e0fd0ee8abb10fa2acd9bc3",
    );

    expect(resp.addrByte.toString("hex")).toEqual("014e14ae1814ac4c91e97a77dbaeabe27a4dcba54c");

    expect(resp.addrString).toEqual("f1jykk4gauvrgjd2l2o7n25k7cpjg4xjkmxpoklzy");
  } finally {
    transport.close();
  }
});

test("appInfo", async () => {
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);

    const resp = await app.appInfo();

    // eslint-disable-next-line no-console
    console.log(resp);

    expect(resp.return_code).toEqual(ERROR_CODE.NoError);
    expect(resp.error_message).toEqual("No errors");

    expect(resp).toHaveProperty("appName");
    expect(resp).toHaveProperty("appVersion");
    expect(resp).toHaveProperty("flagLen");
    expect(resp).toHaveProperty("flagsValue");
    expect(resp).toHaveProperty("flag_recovery");
    expect(resp).toHaveProperty("flag_signed_mcu_code");
    expect(resp).toHaveProperty("flag_onboarded");
    expect(resp).toHaveProperty("flag_pin_validated");
  } finally {
    transport.close();
  }
});

test("deviceInfo", async () => {
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);

    const resp = await app.deviceInfo();

    // eslint-disable-next-line no-console
    console.log(resp);

    expect(resp.return_code).toEqual(ERROR_CODE.NoError);
    expect(resp.error_message).toEqual("No errors");

    expect(resp).toHaveProperty("targetId");
    expect(resp).toHaveProperty("seVersion");
    expect(resp).toHaveProperty("flag");
    expect(resp).toHaveProperty("mcuVersion");
  } finally {
    transport.close();
  }
});

test("sign_and_verify", async () => {
  jest.setTimeout(60000);
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);

    // Derivation path. First 3 items are automatically hardened!
    const path = [44, 461, 0, 0, 0];
    const message = Buffer.from(
      "885501fd1d0f4dfcd7e99afcb99a8326b7dc459d32c6285501b882619d46558f3d9e316d11b48dcf211327025a0144000186a0430009c4430061a80040",
      "hex",
    );

    const responsePk = await app.getAddressAndPubKey(path);
    const responseSign = await app.sign(path, message);

    expect(responsePk.return_code).toEqual(ERROR_CODE.NoError);
    expect(responsePk.error_message).toEqual("No errors");
    expect(responseSign.return_code).toEqual(ERROR_CODE.NoError);
    expect(responseSign.error_message).toEqual("No errors");

    // Calculate message digest
    // digest = blake2-256( prefix + blake2b-256(tx) )
    let hasher;

    hasher = blake2.createHash("blake2b", { digestLength: 32 });
    hasher.update(message);
    const tmp = hasher.digest();

    hasher = blake2.createHash("blake2b", { digestLength: 32 });
    const prefix = Buffer.from([0x01, 0x71, 0xa0, 0xe4, 0x02, 0x20]);
    hasher.update(prefix);
    hasher.update(tmp);
    const msgDigest = hasher.digest();

    // Check signature is valid
    const signatureDER = responseSign.signature_der;
    const signature = secp256k1.signatureImport(signatureDER);

    // Check compact signatures
    const sigBuf = Buffer.from(signature);
    const sigCompBuf = Buffer.from(responseSign.signature_compact.slice(0, 64));

    expect(sigBuf).toEqual(sigCompBuf);

    const signatureOk = secp256k1.ecdsaVerify(signature, msgDigest, responsePk.compressed_pk);
    expect(signatureOk).toEqual(true);
  } finally {
    transport.close();
  }
});

test("sign_invalid", async () => {
  jest.setTimeout(60000);
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);

    const path = [44, 461, 0, 0, 0]; // Derivation path. First 3 items are automatically hardened!
    let invalidMessage = Buffer.from(
      "88315501fd1d0f4dfcd7e99afcb99a8326b7dc459d32c6285501b882619d46558f3d9e316d11b48dcf211327025a0144000186a0430009c4430061a80040",
      "hex",
    );
    invalidMessage += "1";

    const responseSign = await app.sign(path, invalidMessage);

    // eslint-disable-next-line no-console
    console.log(responseSign);
    expect(responseSign.return_code).toEqual(0x6984);
    expect(responseSign.error_message).toEqual("Data is invalid : Unexpected data type");
  } finally {
    transport.close();
  }
});
