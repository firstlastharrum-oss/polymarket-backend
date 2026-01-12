const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const Market = await hre.ethers.getContractFactory("Market");
  const market = await Market.deploy();
  await market.deployed();
  console.log("Market deployed to:", market.address);

  // Write simple config file for backend usage
  const chainId = hre.network.config.chainId || (hre.network.name === 'localhost' ? 31337 : 11155111);
  const rpcUrl = hre.network.name === 'localhost' ? 'http://127.0.0.1:8546' : (process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org");

  const config = {
    rpcUrl,
    address: market.address,
    abi: (await hre.artifacts.readArtifact("Market")).abi,
    network: hre.network.name || "sepolia",
    chainId,
    currency: "ETH",
  };
  const outPath = path.join(__dirname, "../src/config/market.json");
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log("Market config written to src/config/market.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
