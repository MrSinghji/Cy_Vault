// Central environment/config module (Phase 0). Reads .env-style variables with safe defaults
// so the stack runs locally without secrets. Later features consume this module only.
const path = require("path");

const config = {
  env: process.env.NODE_ENV || "development",
  apiPort: parseInt(process.env.API_PORT || "4000", 10),
  databaseFile: process.env.DATABASE_FILE || path.join(__dirname, "..", "..", "data", "app.db"),
  chain: {
    rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
    chainId: parseInt(process.env.CHAIN_ID || "31337", 10), // Hardhat default local chain id
  },
  contracts: {
    identityRegistryAddress: process.env.IDENTITY_REGISTRY_ADDRESS || "",
    assetRegistryAddress: process.env.ASSET_REGISTRY_ADDRESS || "",
    assetNftAddress: process.env.ASSET_NFT_ADDRESS || "",
  },
  ipfs: {
    gatewayUrl: process.env.IPFS_GATEWAY_URL || "https://ipfs.io/ipfs/",
    pinEndpoint: process.env.IPFS_PIN_ENDPOINT || "",
  },
};

module.exports = { config };
