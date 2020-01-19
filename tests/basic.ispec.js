import FilecoinApp from "index.js";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { expect, test } from "jest";
import secp256k1 from "secp256k1/elliptic";
import crypto from "crypto";
import { ERROR_CODE } from "../src/common";

test("get version", async () => {
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);
    const resp = await app.getVersion();
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

    console.log(resp);

    expect(resp.return_code).toEqual(ERROR_CODE.NoError);
    expect(resp.error_message).toEqual("No errors");

    expect(resp).toHaveProperty("address");
    expect(resp).toHaveProperty("compressed_pk");

    expect(resp.compressed_pk.length).toEqual(33);
    expect(resp.compressed_pk.toString("hex")).toEqual(
      "0325d0dbeedb2053e690a58e9456363158836b1361f30dba0332f440558fa803d0",
    );

    expect(resp.address).toEqual("f1ohi3e7hveiiuffactrneeni7ofwlw3dfaglieba");
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

    console.log(resp);

    expect(resp.return_code).toEqual(0x9000);
    expect(resp.error_message).toEqual("No errors");

    expect(resp).toHaveProperty("address");
    expect(resp).toHaveProperty("compressed_pk");

    expect(resp.compressed_pk.length).toEqual(33);
    expect(resp.compressed_pk.toString("hex")).toEqual(
      "03b481eeff158ba0044fa075b2a53cb34de11193699e0fd0ee8abb10fa2acd9bc3",
    );

    expect(resp.address).toEqual("f1jykk4gauvrgjd2l2o7n25k7cpjg4xjkmxpoklzy");
  } finally {
    transport.close();
  }
});

test("appInfo", async () => {
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);

    const resp = await app.appInfo();

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

    console.log(responsePk);
    console.log(responseSign);

    expect(responsePk.return_code).toEqual(ERROR_CODE.NoError);
    expect(responsePk.error_message).toEqual("No errors");
    expect(responseSign.return_code).toEqual(ERROR_CODE.NoError);
    expect(responseSign.error_message).toEqual("No errors");

    // Check signature is valid
    const hash = crypto.createHash("sha256");
    const msgHash = hash.update(message).digest();

    const signatureDER = responseSign.signature;
    const signature = secp256k1.signatureImport(signatureDER);
    const signatureOk = secp256k1.verify(msgHash, signature, responsePk.compressed_pk);
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
    let invalidMessage = Buffer.from("88315501fd1d0f4dfcd7e99afcb99a8326b7dc459d32c6285501b882619d46558f3d9e316d11b48dcf211327025a0144000186a0430009c4430061a80040", "hex");
    invalidMessage += "1";

    const responseSign = await app.sign(path, invalidMessage);

    console.log(responseSign);
    expect(responseSign.return_code).toEqual(0x6984);
    expect(responseSign.error_message).toEqual("Data is invalid : Unexpected data type");
  } finally {
    transport.close();
  }
});
