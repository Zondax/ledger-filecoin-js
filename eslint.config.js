const globals = require("globals");
const pluginJs = require("@eslint/js");
const tseslint = require("typescript-eslint");
const unusedImports = require("eslint-plugin-unused-imports");
const tsdoc = require("eslint-plugin-tsdoc");
const prettierConfig = require("eslint-config-prettier");

module.exports = tseslint.config(
  {
    ignores: ["dist/*", "node_modules/*", ".cache", ".git", "public", "build"],
  },
  pluginJs.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
    },
    plugins: {
      "unused-imports": unusedImports,
      "@typescript-eslint": tseslint.plugin,
      tsdoc: tsdoc,
    },
    rules: {
      ...prettierConfig.rules,
      curly: "warn",
      "prefer-const": "warn",
      "no-else-return": "warn",
      complexity: ["warn", 1000],
      "no-unneeded-ternary": "warn",
      "no-alert": "warn",
      "no-empty": "warn",
      "no-useless-catch": "error",
      "require-await": "warn",
      "no-continue": "warn",
      "no-console": "warn",
      "unused-imports/no-unused-imports": "warn",
      "no-magic-numbers": "off",
      "tsdoc/syntax": "warn",
    },
  },
);
