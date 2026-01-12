const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const Oracle = await hre.ethers.getContractFactory("OracleMock");
  const oracle = await Oracle.deploy();
  await oracle.deployed();
  console.log("OracleMock deployed to:", oracle.address);

  const artifact = await hre.artifacts.readArtifact("OracleMock");
  const abi = artifact.abi;

  const chainId = hre.network.config.chainId || (hre.network.name === 'localhost' ? 31337 : 11155111);
  const rpcUrl = hre.network.name === 'localhost' ? 'http://127.0.0.1:8546' : (process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org");

  const config = {
    rpcUrl,
    address: oracle.address,
    abi,
    network: hre.network.name || "sepolia",
    chainId,
    currency: "ETH",
  };
  const outPath = path.join(__dirname, "../src/config/oracle.json");
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log("Oracle config written to src/config/oracle.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
