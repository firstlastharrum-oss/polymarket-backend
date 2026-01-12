const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Market
  const Market = await hre.ethers.getContractFactory("Market");
  const market = await Market.deploy();
  await market.deployed();
  console.log("Market deployed to:", market.address);

  // Deploy StakingOracle
  const StakingOracle = await hre.ethers.getContractFactory("StakingOracle");
  const oracle = await StakingOracle.deploy(market.address);
  await oracle.deployed();
  console.log("StakingOracle deployed to:", oracle.address);

  // Set Oracle in Market
  await market.setOracle(oracle.address);
  console.log("Oracle set in Market");

  // Save config for Frontend
  const configDir = path.join(__dirname, "../../Frontend/poly-market/src/utils");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const config = {
    marketAddress: market.address,
    oracleAddress: oracle.address,
    networkId: "31337", // Hardhat Local
  };

  fs.writeFileSync(
    path.join(configDir, "contract-config.json"),
    JSON.stringify(config, null, 2)
  );

  // Save ABIs
  const marketArtifact = await hre.artifacts.readArtifact("Market");
  const oracleArtifact = await hre.artifacts.readArtifact("StakingOracle");

  fs.writeFileSync(
    path.join(configDir, "Market.json"),
    JSON.stringify(marketArtifact, null, 2)
  );
  fs.writeFileSync(
    path.join(configDir, "StakingOracle.json"),
    JSON.stringify(oracleArtifact, null, 2)
  );

  console.log("Config and ABIs saved to Frontend/poly-market/src/utils");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
