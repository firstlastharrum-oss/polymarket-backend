const path = require("path");
const artifact = require(path.join(__dirname, "../src/oracle/Betting.json"));
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // Ganache default first account private key (matches the local node started earlier)
  const privateKey = "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
  const wallet = new ethers.Wallet(privateKey, provider);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  console.log("Deploying Betting contract from", await wallet.getAddress());
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("Betting deployed to:", address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
