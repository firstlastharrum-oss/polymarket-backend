const hre = require("hardhat");

async function main() {
  const Betting = await hre.ethers.getContractFactory("Betting");
  const betting = await Betting.deploy();
  await betting.deployed();
  console.log("Betting deployed to:", betting.address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
