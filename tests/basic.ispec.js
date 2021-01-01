/* eslint-disable no-console */
import FilecoinApp from "index.js";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { expect, test } from "jest";
import secp256k1 from "secp256k1/elliptic";
import { ERROR_CODE, PKLEN } from "../src/common";
import { getDigest } from "./utils";

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

    const path = "m/44'/461'/5'/0/3";
    const resp = await app.getAddressAndPubKey(path);

    // eslint-disable-next-line no-console
    console.log(resp);

    expect(resp.return_code).toEqual(ERROR_CODE.NoError);
    expect(resp.error_message).toEqual("No errors");

    expect(resp).toHaveProperty("addrByte");
    expect(resp).toHaveProperty("addrString");
    expect(resp).toHaveProperty("compressed_pk");

    expect(resp.compressed_pk.length).toEqual(PKLEN);
    expect(resp.compressed_pk.toString("hex")).toEqual(
      "0425d0dbeedb2053e690a58e9456363158836b1361f30dba0332f440558fa803d056042b50d0e70e4a2940428e82c7cea54259d65254aed4663e4d0cffd649f4fb",
    );

    expect(resp.addrString).toEqual("f1mk3zcefvlgpay4f32c5vmruk5gqig6dumc7pz6q");
  } finally {
    transport.close();
  }
});

test("showAddressAndPubKey", async () => {
  // noinspection ES6ModulesDependencies
  jest.setTimeout(60000);
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);

    const path = "m/44'/461'/5'/0/3";
    const resp = await app.showAddressAndPubKey(path);

    // eslint-disable-next-line no-console
    console.log(resp);

    expect(resp.return_code).toEqual(0x9000);
    expect(resp.error_message).toEqual("No errors");

    expect(resp).toHaveProperty("addrByte");
    expect(resp).toHaveProperty("addrString");
    expect(resp).toHaveProperty("compressed_pk");

    expect(resp.compressed_pk.length).toEqual(PKLEN);
    expect(resp.compressed_pk.toString("hex")).toEqual(
      "0425d0dbeedb2053e690a58e9456363158836b1361f30dba0332f440558fa803d056042b50d0e70e4a2940428e82c7cea54259d65254aed4663e4d0cffd649f4fb",
    );

    expect(resp.addrString).toEqual("f1mk3zcefvlgpay4f32c5vmruk5gqig6dumc7pz6q");
  } finally {
    transport.close();
  }
});

test("getAddressAndPubKeyTestnet", async () => {
  // noinspection ES6ModulesDependencies
  jest.setTimeout(60000);
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);

    const path = "m/44'/1'/0'/0/0";
    const resp = await app.getAddressAndPubKey(path);

    // eslint-disable-next-line no-console
    console.log(resp);

    expect(resp.return_code).toEqual(0x9000);
    expect(resp.error_message).toEqual("No errors");

    expect(resp).toHaveProperty("addrByte");
    expect(resp).toHaveProperty("addrString");
    expect(resp).toHaveProperty("compressed_pk");

    expect(resp.compressed_pk.length).toEqual(PKLEN);
    expect(resp.compressed_pk.toString("hex")).toEqual(
      "0431fef770d890c1ee4f38efd0a24dfd5e2687416a3e7718035e380f0d0489ce176b91fba5c922bf5683e65df00a29df31c326c72160d0ece7c3a543dedfb605aa",
    );

    expect(resp.addrString).toEqual("t156h5dzekdyhrusjrb3dhlpdhpi4vifduelwsr4y");
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
  // noinspection ES6ModulesDependencies
  jest.setTimeout(60000);
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);

    // Derivation path. First 3 items are automatically hardened!
    const path = "m/44'/461'/0'/0/0";
    const message = Buffer.from(
      "8a0058310396a1a3e4ea7a14d49985e661b22401d44fed402d1d0925b243c923589c0fbc7e32cd04e29ed78d15d37d3aaa3fe6da3358310386b454258c589475f7d16f5aac018a79f6c1169d20fc33921dd8b5ce1cac6c348f90a3603624f6aeb91b64518c2e80950144000186a01961a8430009c44200000040",
      "hex",
    );

    const responsePk = await app.getAddressAndPubKey(path);
    const responseSign = await app.sign(path, message);

    expect(responsePk.return_code).toEqual(ERROR_CODE.NoError);
    expect(responsePk.error_message).toEqual("No errors");
    expect(responseSign.return_code).toEqual(ERROR_CODE.NoError);
    expect(responseSign.error_message).toEqual("No errors");

    // Calculate message digest
    const msgDigest = getDigest(message);

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

test("sign_and_verify_testnet", async () => {
  // noinspection ES6ModulesDependencies
  jest.setTimeout(60000);
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);

    // Derivation path. First 3 items are automatically hardened!
    const path = "m/44'/1'/0'/0/0";

    const message = Buffer.from(
      "8a0055019f4c34943e4b92f4542bed08af54be955629fc6f5501ef8fd1e48a1e0f1a49310ec675bc677a3954147400430003e81903e84200014200010040",
      "hex",
    );

    const responsePk = await app.getAddressAndPubKey(path);
    const responseSign = await app.sign(path, message);

    expect(responsePk.return_code).toEqual(ERROR_CODE.NoError);
    expect(responsePk.error_message).toEqual("No errors");
    expect(responseSign.return_code).toEqual(ERROR_CODE.NoError);
    expect(responseSign.error_message).toEqual("No errors");

    // Calculate message digest
    const msgDigest = getDigest(message);
    console.log(`Digest: ${msgDigest.toString("hex")}`);

    // Check signature is valid
    const signatureDER = responseSign.signature_der;
    const signature = secp256k1.signatureImport(signatureDER);
    console.log(`DER   : ${responseSign.signature_der.toString("hex")}`);

    // Check compact signatures
    const sigBuf = Buffer.from(signature);
    const sigCompBuf = Buffer.from(responseSign.signature_compact.slice(0, 64));
    console.log(`compact   : ${Buffer.from(responseSign.signature_compact).toString("hex")}`);

    expect(sigBuf).toEqual(sigCompBuf);

    const signatureOk = secp256k1.ecdsaVerify(signature, msgDigest, responsePk.compressed_pk);
    expect(signatureOk).toEqual(true);

    console.log(`compact   : ${responseSign.signature_compact.toString("base64")}`);

    // Prepare curl command
  } finally {
    transport.close();
  }
});

test("sign_invalid", async () => {
  // noinspection ES6ModulesDependencies
  jest.setTimeout(60000);
  const transport = await TransportNodeHid.create();
  try {
    const app = new FilecoinApp(transport);

    const path = "m/44'/461'/0'/0/0";
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
