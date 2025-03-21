const config = require("./jest.config");

// Override default configuration
config.testMatch = ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(ispec|test).[tj]s?(x)"];
config.testTimeout = 60000;

// eslint-disable-next-line no-console
console.log("RUNNING INTEGRATION TESTS");

module.exports = config;
