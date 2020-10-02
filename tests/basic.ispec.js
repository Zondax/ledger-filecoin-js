/* eslint-disable no-console */
import FilecoinApp from "index.js";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { expect, test } from "jest";
import secp256k1 from "secp256k1/elliptic";
import Message from "@openworklabs/filecoin-message";
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
      "04240ecf6ec722b701f051aaaffde7455a56e433139e4c0ff2ad7c8675e2cce104a8027ba13e5bc640ec9932cce184f33a789bb9c32f41e34328118b7862fc9ca2",
    );

    expect(resp.addrByte.toString("hex")).toEqual("0175a6b113220c2f71c4db420753aab2cef5edb6a8");

    expect(resp.addrString).toEqual("f1owtlcezcbqxxdrg3iidvhkvsz3263nvijwpumui");
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

    const path = "m/44'/461'/0'/0/1";
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
      "04fc016f3d88dc7070cdd95b5754d32fd5290f850b7c2208fca0f715d35861de1841d9a342a487692a63810a6c906b443a18aa804d9d508d69facc5b06789a01b4",
    );

    expect(resp.addrByte.toString("hex")).toEqual("018bab69a28eeb4525bd8f49679a740a9582691906");

    expect(resp.addrString).toEqual("f1rovwtiuo5ncslpmpjftzu5akswbgsgighjazxoi");
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

    const path = [44, 1, 0, 0, 0];
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
      "0466f2bdb19e90fd7c29e4bf63612eb98515e5163c97888042364ba777d818e88b765c649056ba4a62292ae4e2ccdabd71b845d8fa0991c140f664d2978ac0972a",
    );

    expect(resp.addrByte.toString("hex")).toEqual("01dfe49184d46adc8f89d44638beb45f78fcad2590");

    expect(resp.addrString).toEqual("t137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy");
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
      "8a0055016b1f15eef5ae456c76d9559257703bdcc5bd3bec55016b1f15eef5ae456c76d9559257703bdcc5bd3bec0048002386f26fc100001a00084391440002445b4400023ffe0040",
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
    const path = [44, 1, 0, 0, 0];

    const messageContent = new Message({
      from: "t137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy",
      to: "t1t5gdjfb6jojpivbl5uek6vf6svlct7dph5q2jwa",
      value: "1000",
      method: 0,
      gasPrice: "1",
      gasLimit: "1000",
      nonce: 0,
    });

    const message = await messageContent.serialize();

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
