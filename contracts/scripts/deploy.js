// Phase 0 placeholder deploy script. Real deployments arrive with Features 3-6.
const hre = require("hardhat");

async function main() {
  const Probe = await hre.ethers.getContractFactory("FoundationProbe");
  const probe = await Probe.deploy();
  await probe.waitForDeployment();
  console.log("FoundationProbe deployed to:", await probe.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
