<template>
  <div class="Ledger">
    <input id="webusb" v-model="transportChoice" type="radio" value="WebUSB" />
    <label for="webusb">WebUSB</label>
    <input id="u2f" v-model="transportChoice" type="radio" value="U2F" />
    <label for="u2f">U2F</label>
    <br />
    <!--
        Commands
    -->
    <button @click="getVersion">
      Get Version
    </button>

    <button @click="appInfo">
      AppInfo
    </button>

    <button @click="getAddress">
      Get Address and Pubkey
    </button>

    <button @click="showAddress">
      Show Address and Pubkey
    </button>

    <button @click="signExampleTx">
      Sign Example TX
    </button>
    <!--
        Commands
    -->
    <ul id="ledger-status">
      <li v-for="item in ledgerStatus" :key="item.index">
        {{ item.msg }}
      </li>
    </ul>
  </div>
</template>

<script>
// eslint-disable-next-line import/no-extraneous-dependencies
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
// eslint-disable-next-line import/no-extraneous-dependencies
import TransportU2F from "@ledgerhq/hw-transport-u2f";

import FilecoinApp from "../../src";

const path = [44, 461, 5, 0, 3];

export default {
  name: "Ledger",
  props: {},
  data() {
    return {
      deviceLog: [],
      transportChoice: "U2F",
    };
  },
  computed: {
    ledgerStatus() {
      return this.deviceLog;
    },
  },
  methods: {
    log(msg) {
      this.deviceLog.push({
        index: this.deviceLog.length,
        msg,
      });
    },
    async getTransport() {
      let transport = null;

      this.log(`Trying to connect via ${this.transportChoice}...`);
      if (this.transportChoice === "WebUSB") {
        try {
          transport = await TransportWebUSB.create();
        } catch (e) {
          this.log(e);
        }
      }

      if (this.transportChoice === "U2F") {
        try {
          transport = await TransportU2F.create(10000);
        } catch (e) {
          this.log(e);
        }
      }

      return transport;
    },
    async getVersion() {
      const transport = await this.getTransport();

      try {
        this.deviceLog = [];
        const app = new FilecoinApp(transport);
        // now it is possible to access all commands in the app
        const response = await app.getVersion();
        if (response.return_code !== 0x9000) {
          this.log(`Error [${response.return_code}] ${response.error_message}`);
          return;
        }

        this.log("Response received!");
        this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
        this.log(`Device Locked: ${response.device_locked}`);
        this.log(`Test mode: ${response.test_mode}`);
        this.log("Full response:");
        this.log(response);
      } finally {
        transport.close();
      }
    },
    async appInfo() {
      const transport = await this.getTransport();
      try {
        this.deviceLog = [];
        const app = new FilecoinApp(transport);

        // now it is possible to access all commands in the app
        const response = await app.appInfo();
        if (response.return_code !== 0x9000) {
          this.log(`Error [${response.return_code}] ${response.error_message}`);
          return;
        }

        this.log("Response received!");
        this.log(response);
      } finally {
        transport.close();
      }
    },
    async getAddress() {
      const transport = await this.getTransport();
      try {
        this.deviceLog = [];
        const app = new FilecoinApp(transport);

        let response = await app.getVersion();
        this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
        this.log(`Device Locked: ${response.device_locked}`);
        this.log(`Test mode: ${response.test_mode}`);

        // now it is possible to access all commands in the app
        response = await app.getAddressAndPubKey(path);
        if (response.return_code !== 0x9000) {
          this.log(`Error [${response.return_code}] ${response.error_message}`);
          return;
        }

        this.log("Response received!");
        this.log("Full response:");
        this.log(response);
      } finally {
        transport.close();
      }
    },
    async showAddress() {
      const transport = await this.getTransport();
      this.deviceLog = [];
      try {
        const app = new FilecoinApp(transport);

        let response = await app.getVersion();
        this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
        this.log(`Device Locked: ${response.device_locked}`);
        this.log(`Test mode: ${response.test_mode}`);

        // now it is possible to access all commands in the app
        this.log("Please click in the device");
        response = await app.showAddressAndPubKey(path);
        if (response.return_code !== 0x9000) {
          this.log(`Error [${response.return_code}] ${response.error_message}`);
          return;
        }

        this.log("Response received!");
        this.log("Full response:");
        this.log(response);
      } finally {
        transport.close();
      }
    },
    async signExampleTx() {
      const transport = await this.getTransport();

      try {
        this.deviceLog = [];
        const app = new FilecoinApp(transport);

        let response = await app.getVersion();
        this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
        this.log(`Device Locked: ${response.device_locked}`);
        this.log(`Test mode: ${response.test_mode}`);

        const message = Buffer.from(
          "875501fd1d0f4dfcd7e99afcb99a8326b7dc459d32c6285501b882619d46558f3d9e316d11b48dcf211327025a01430186a04209c44261a800",
          "hex",
        );
        response = await app.sign(path, message);

        this.log("Response received!");
        this.log("Full response:");
        this.log(response);
      } finally {
        transport.close();
      }
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}

button {
  padding: 5px;
  font-weight: bold;
  font-size: medium;
}

ul {
  padding: 10px;
  text-align: left;
  alignment: left;
  list-style-type: none;
  background: black;
  font-weight: bold;
  color: greenyellow;
}
</style>
