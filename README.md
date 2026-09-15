# @zondax/ledger-filecoin

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://badge.fury.io/js/%40zondax%2Fledger-filecoin.svg)](https://badge.fury.io/js/%40zondax%2Fledger-filecoin)

This package provides a basic client library to communicate with the Filecoin App running in a Ledger Nano S+/X, Flex and Stax

We recommend using the npmjs package to receive updates/fixes.

## Transports

`FilecoinApp` accepts any transport that can send an APDU: a legacy `Transport` from
`@ledgerhq/hw-transport`, or a [Device Management Kit](https://www.ledger.com/blog-dmk-rollout)
session wrapped in `DMKTransport` from `@zondax/ledger-js`.

```ts
const app = new FilecoinApp(transport)
```

### Breaking change: the transport type parameter

The class is now generic in its transport -- `FilecoinApp<T extends LedgerTransport = LedgerTransport>`
-- so that `app.transport` keeps the type you constructed it with. `T` is inferred from the
constructor argument, so `new FilecoinApp(transport)` is unaffected.

Writing the type yourself is not. The bare form falls back to the `LedgerTransport` default,
which describes `send` and nothing else, so hw-transport members reached through it
(`close`, `exchange`, `on`) stop typechecking. Name the transport type to keep them:

```diff
-let app: FilecoinApp
+let app: FilecoinApp<Transport>
```

## Development

### Available Scripts

```bash
# Build the project
yarn build

# Format code and sort package.json
yarn format

# Check formatting
yarn format:check

# Run linter
yarn lint

# Fix linting issues
yarn lint:fix

# Run tests (builds first)
yarn test

# Check for dependency updates
yarn upgrade
```

## Notes

Use `yarn install` to avoid issues.
