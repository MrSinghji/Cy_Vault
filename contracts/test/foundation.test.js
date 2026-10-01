const { expect } = require("chai");
const { ethers } = require("hardhat");

// Phase 0 smoke tests: toolchain compiles, deploys, RBAC primitives behave correctly.
describe("Phase 0 — Foundation smoke tests", function () {
  it("compiles and exposes PlatformRoles with expected role hashes", async function () {
    const Probe = await ethers.getContractFactory("FoundationProbe");
    const probe = await Probe.deploy();
    expect(await probe.ADMIN_ROLE()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE")));
    expect(await probe.MANAGER_ROLE()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE")));
    expect(await probe.AUDITOR_ROLE()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE")));
    expect(await probe.USER_ROLE()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("USER_ROLE")));
  });

  it("local Hardhat network runs and accounts are funded", async function () {
    const signers = await ethers.getSigners();
    expect(signers.length).to.be.greaterThan(0);
    const bal = await ethers.provider.getBalance(signers[0].address);
    expect(bal).to.be.greaterThan(0n);
  });

  it("deploys a concrete AccessControl probe; deployer holds ADMIN_ROLE", async function () {
    const Probe = await ethers.getContractFactory("FoundationProbe");
    const probe = await Probe.deploy();
    const [admin, other] = await ethers.getSigners();
    const ADMIN_ROLE = await probe.ADMIN_ROLE();
    expect(await probe.hasRole(ADMIN_ROLE, admin.address)).to.equal(true);
    expect(await probe.hasRole(ADMIN_ROLE, other.address)).to.equal(false);
  });

  it("grants a role when called by an admin and emits RoleGranted", async function () {
    const Probe = await ethers.getContractFactory("FoundationProbe");
    const probe = await Probe.deploy();
    const [admin, other] = await ethers.getSigners();
    const ADMIN_ROLE = await probe.ADMIN_ROLE();
    // OZ AccessControl: granting ADMIN_ROLE requires DEFAULT_ADMIN_ROLE, held by deployer.
    await expect(probe.connect(admin).grantRole(ADMIN_ROLE, other.address))
      .to.emit(probe, "RoleGranted")
      .withArgs(ADMIN_ROLE, other.address, admin.address);
    expect(await probe.hasRole(ADMIN_ROLE, other.address)).to.equal(true);
  });

  it("reverts when a non-admin tries to grant a role (RBAC enforced on-chain)", async function () {
    const Probe = await ethers.getContractFactory("FoundationProbe");
    const probe = await Probe.deploy();
    const [, other] = await ethers.getSigners();
    const USER_ROLE = await probe.USER_ROLE();
    await expect(
      probe.connect(other).grantRole(USER_ROLE, other.address)
    ).to.be.revertedWithCustomError(probe, "AccessControlUnauthorizedAccount");
  });
});
