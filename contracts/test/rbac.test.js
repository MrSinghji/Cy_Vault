const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AccessManager + RBAC enforcement (Feature 4)", function () {
  let am, registry;
  let admin, manager, auditor, user, stranger;
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));
  const AUDITOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE"));
  const USER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("USER_ROLE"));
  const refHash = ethers.keccak256(ethers.toUtf8Bytes("off-chain-ref"));

  beforeEach(async function () {
    [admin, manager, auditor, user, stranger] = await ethers.getSigners();
    const AM = await ethers.getContractFactory("AccessManager");
    am = await AM.deploy(admin.address);
    await am.waitForDeployment();

    const Registry = await ethers.getContractFactory("IdentityRegistry");
    registry = await Registry.deploy(admin.address, await am.getAddress());
    await registry.waitForDeployment();

    await am.connect(admin).grantPlatformRole(MANAGER_ROLE, manager.address);
    await am.connect(admin).grantPlatformRole(AUDITOR_ROLE, auditor.address);
    await am.connect(admin).grantPlatformRole(USER_ROLE, user.address);
  });

  describe("role model", function () {
    it("constructor grants DEFAULT_ADMIN + ADMIN to bootstrap admin", async function () {
      expect(await am.hasRole(ADMIN_ROLE, admin.address)).to.equal(true);
      expect(await am.hasRole(ethers.ZeroHash, admin.address)).to.not.throw; // sanity read
      expect(await am.hasRole(await am.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
    });

    it("platform role hashes match the canonical keccak256 values", async function () {
      expect(await am.ADMIN_ROLE()).to.equal(ADMIN_ROLE);
      expect(await am.MANAGER_ROLE()).to.equal(MANAGER_ROLE);
      expect(await am.AUDITOR_ROLE()).to.equal(AUDITOR_ROLE);
      expect(await am.USER_ROLE()).to.equal(USER_ROLE);
      const list = await am.platformRoleHashes();
      expect(list.map((x) => x)).to.deep.equal([ADMIN_ROLE, MANAGER_ROLE, AUDITOR_ROLE, USER_ROLE]);
    });

    it("rolesOf returns [ADMIN, MANAGER, AUDITOR, USER] flags", async function () {
      expect(await am.rolesOf(manager.address)).to.deep.equal([false, true, false, false]);
      expect(await am.rolesOf(admin.address)).to.deep.equal([true, false, false, false]);
      expect(await am.rolesOf(stranger.address)).to.deep.equal([false, false, false, false]);
    });
  });

  describe("authorized role management", function () {
    it("ADMIN can grant and revoke platform roles", async function () {
      await expect(am.connect(admin).grantPlatformRole(USER_ROLE, stranger.address))
        .to.emit(am, "RoleStatusChanged")
        .withArgs(USER_ROLE, stranger.address, true, admin.address, (v) => v > 0n);
      expect(await am.hasRole(USER_ROLE, stranger.address)).to.equal(true);
      await expect(am.connect(admin).revokePlatformRole(USER_ROLE, stranger.address))
        .to.emit(am, "RoleStatusChanged")
        .withArgs(USER_ROLE, stranger.address, false, admin.address, (v) => v > 0n);
      expect(await am.hasRole(USER_ROLE, stranger.address)).to.equal(false);
    });

    it("emits OZ RoleGranted/RoleRevoked too (standard event surface)", async function () {
      await expect(am.connect(admin).grantPlatformRole(AUDITOR_ROLE, user.address))
        .to.emit(am, "RoleGranted").withArgs(AUDITOR_ROLE, user.address, admin.address);
      await expect(am.connect(admin).revokePlatformRole(AUDITOR_ROLE, user.address))
        .to.emit(am, "RoleRevoked").withArgs(AUDITOR_ROLE, user.address, admin.address);
    });

    it("grants are idempotent-safe: re-granting does not corrupt member count", async function () {
      // beforeEach grants USER to `user` (count=1); add a second holder then re-grant duplicates
      await am.connect(admin).grantPlatformRole(USER_ROLE, stranger.address);
      expect(await am.memberCount(USER_ROLE)).to.equal(2);
      await am.connect(admin).grantPlatformRole(USER_ROLE, stranger.address); // duplicate grant
      await am.connect(admin).grantPlatformRole(USER_ROLE, user.address);     // duplicate grant
      expect(await am.memberCount(USER_ROLE)).to.equal(2);
      await am.connect(admin).revokePlatformRole(USER_ROLE, stranger.address);
      expect(await am.memberCount(USER_ROLE)).to.equal(1);
      await am.connect(admin).revokePlatformRole(USER_ROLE, stranger.address); // duplicate revoke
      expect(await am.memberCount(USER_ROLE)).to.equal(1);
    });
  });

  describe("unauthorized role operations revert", function () {
    it("non-admin cannot grant any platform role", async function () {
      for (const signer of [manager, auditor, user, stranger]) {
        await expect(am.connect(signer).grantPlatformRole(USER_ROLE, stranger.address))
          .to.be.revertedWithCustomError(am, "AccessControlUnauthorizedAccount")
          .withArgs(signer.address, ADMIN_ROLE);
      }
    });

    it("non-admin cannot revoke any platform role", async function () {
      await expect(am.connect(manager).revokePlatformRole(USER_ROLE, user.address))
        .to.be.revertedWithCustomError(am, "AccessControlUnauthorizedAccount");
    });

    it("invalid role hash is rejected before authorization even matters", async function () {
      await expect(am.connect(admin).grantPlatformRole(ethers.randomBytes(32), user.address))
        .to.be.revertedWithCustomError(am, "InvalidRole");
      await expect(am.connect(admin).revokePlatformRole(ethers.hexlify(ethers.randomBytes(32)), user.address))
        .to.be.revertedWithCustomError(am, "InvalidRole");
    });

    it("zero address cannot receive roles", async function () {
      await expect(am.connect(admin).grantPlatformRole(USER_ROLE, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(am, "AddressZeroNotAllowed");
    });

    it("last admin cannot self-revoke ADMIN (lockout guard)", async function () {
      await expect(am.connect(admin).revokePlatformRole(ADMIN_ROLE, admin.address))
        .to.be.revertedWithCustomError(am, "SelfRoleChangeNotAllowed");
      // with a second admin present, revoking one's own is still allowed
      await am.connect(admin).grantPlatformRole(ADMIN_ROLE, auditor.address);
      await expect(am.connect(auditor).revokePlatformRole(ADMIN_ROLE, auditor.address)).to.not.be.reverted;
      expect(await am.hasRole(ADMIN_ROLE, auditor.address)).to.equal(false);
    });
  });

  describe("F3 IdentityRegistry compatibility + F4 enforcement", function () {
    it("RBAC-mode registry: legacy owner-only path still honored via accessManager=0 deployments", async function () {
      const Registry = await ethers.getContractFactory("IdentityRegistry");
      const legacy = await Registry.deploy(admin.address, ethers.ZeroAddress);
      await legacy.waitForDeployment();
      // owner works exactly like F3
      await expect(legacy.connect(admin).createIdentity(user.address, refHash)).to.not.be.reverted;
      // non-owner rejected with OZ Ownable error (unchanged F3 behavior)
      await expect(legacy.connect(stranger).createIdentity(manager.address, refHash))
        .to.be.revertedWithCustomError(legacy, "OwnableUnauthorizedAccount");
      await expect(legacy.connect(manager).deactivateIdentity(user.address))
        .to.be.revertedWithCustomError(legacy, "OwnableUnauthorizedAccount");
    });

    it("RBAC mode: ADMIN can create/deactivate identities", async function () {
      await expect(registry.connect(admin).createIdentity(user.address, refHash)).to.not.be.reverted;
      expect(await registry.verifyIdentity(user.address)).to.not.be.reverted;
      const [verified] = await registry.verifyIdentity.staticCall(user.address);
      expect(verified).to.equal(true);
      await expect(registry.connect(admin).deactivateIdentity(user.address)).to.not.be.reverted;
    });

    it("RBAC mode: MANAGER can create + update references but NOT deactivate", async function () {
      await expect(registry.connect(manager).createIdentity(auditor.address, refHash)).to.not.be.reverted;
      await expect(registry.connect(manager).updateReference(auditor.address, ethers.keccak256(ethers.toUtf8Bytes("new")))).to.not.be.reverted;
      await expect(registry.connect(manager).deactivateIdentity(auditor.address))
        .to.be.revertedWithCustomError(registry, "AdminRoleRequired");
      await expect(registry.connect(manager).activateIdentity(auditor.address))
        .to.be.revertedWithCustomError(registry, "AdminRoleRequired");
    });

    it("RBAC mode: USER/AUDITOR/stranger cannot create identities", async function () {
      for (const s of [user, auditor, stranger]) {
        await expect(registry.connect(s).createIdentity(s.address, refHash))
          .to.be.revertedWithCustomError(registry, "ManagerOrAdminRoleRequired");
      }
    });

    it("RBAC mode: revoking a MANAGER role immediately removes their registry powers", async function () {
      await expect(registry.connect(manager).createIdentity(stranger.address, refHash)).to.not.be.reverted;
      await am.connect(admin).revokePlatformRole(MANAGER_ROLE, manager.address);
      await expect(registry.connect(manager).createIdentity(auditor.address, refHash))
        .to.be.revertedWithCustomError(registry, "ManagerOrAdminRoleRequired");
    });

    it("core identity rules survive RBAC integration (duplicate, zero, empty ref)", async function () {
      await registry.connect(admin).createIdentity(user.address, refHash);
      await expect(registry.connect(admin).createIdentity(user.address, refHash))
        .to.be.revertedWithCustomError(registry, "IdentityAlreadyExists");
      await expect(registry.connect(admin).createIdentity(ethers.ZeroAddress, refHash))
        .to.be.revertedWithCustomError(registry, "ZeroAddressNotAllowed");
      await expect(registry.connect(admin).createIdentity(stranger.address, ethers.ZeroHash))
        .to.be.revertedWithCustomError(registry, "EmptyReference");
    });

    it("events from F3 still emitted in RBAC mode", async function () {
      await expect(registry.connect(admin).createIdentity(user.address, refHash))
        .to.emit(registry, "IdentityCreated")
        .withArgs(user.address, await registry.idOf(user.address), refHash, (v) => v > 0n);
    });
  });
});
