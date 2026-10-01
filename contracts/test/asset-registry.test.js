const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AssetRegistry (Feature 5)", function () {
  let am, assets;
  let admin, manager, auditor, user, stranger;
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));
  const AUDITOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE"));
  const USER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("USER_ROLE"));

  // Raw serial NEVER goes on-chain — callers hash it off-chain first.
  const rawSerial = "SN-2026-00017";
  const salt = "test-salt";
  const serialHash = ethers.keccak256(ethers.toUtf8Bytes(rawSerial + "|" + salt));
  const metadataRef = ethers.keccak256(ethers.toUtf8Bytes("ipfs-placeholder-ref"));

  async function registerSample(who = admin) {
    return assets.connect(who).registerAsset("Turbine X1", "Industrial", "Gas turbine unit", serialHash, metadataRef);
  }

  beforeEach(async function () {
    [admin, manager, auditor, user, stranger] = await ethers.getSigners();
    const AM = await ethers.getContractFactory("AccessManager");
    am = await AM.deploy(admin.address);
    await am.waitForDeployment();

    const AR = await ethers.getContractFactory("AssetRegistry");
    assets = await AR.deploy(await am.getAddress());
    await assets.waitForDeployment();

    await am.connect(admin).grantPlatformRole(MANAGER_ROLE, manager.address);
    await am.connect(admin).grantPlatformRole(AUDITOR_ROLE, auditor.address);
    await am.connect(admin).grantPlatformRole(USER_ROLE, user.address);
  });

  describe("deployment wiring", function () {
    it("rejects a zero access-manager address (single RBAC source enforced)", async function () {
      const AR = await ethers.getContractFactory("AssetRegistry");
      await expect(AR.deploy(ethers.ZeroAddress)).to.be.revertedWith("accessManager required");
    });

    it("exposes the AccessManager and shares canonical role constants", async function () {
      expect(await assets.accessManager()).to.equal(await am.getAddress());
      // Same four canonical keccak256("<NAME>_ROLE") hashes are used everywhere (one RBAC system).
      expect(await am.ADMIN_ROLE()).to.equal(ADMIN_ROLE);
      expect(await am.MANAGER_ROLE()).to.equal(MANAGER_ROLE);
    });
  });

  describe("authorized registration", function () {
    it("ADMIN can register an asset; unique sequential ids start at 1", async function () {
      const tx = await registerSample();
      await expect(tx)
        .to.emit(assets, "AssetRegistered")
        .withArgs(1n, serialHash, "Turbine X1", "Industrial", admin.address, (v) => v > 0n);
      const a = await assets.getAsset(1);
      expect(a.assetId).to.equal(1n);
      expect(a.name).to.equal("Turbine X1");
      expect(a.category).to.equal("Industrial");
      expect(a.description).to.equal("Gas turbine unit");
      expect(a.serialHash).to.equal(serialHash);
      expect(a.metadataRef).to.equal(metadataRef);
      expect(a.status).to.equal(0); // Registered
      expect(a.nftTokenId).to.equal(0n);
      expect(a.createdAt).to.equal(a.updatedAt);
      expect(await assets.assetCount()).to.equal(1n);
    });

    it("MANAGER can also register assets (RBAC via existing AccessManager)", async function () {
      await expect(registerSample(manager)).to.emit(assets, "AssetRegistered");
      const a = await assets.getAsset(1);
      expect(a.serialHash).to.equal(serialHash);
    });

    it("stores only the serial HASH — raw serial value never appears in storage layout reads", async function () {
      await registerSample();
      const a = await assets.getAsset(1);
      // The record contains a 32-byte digest, not the plaintext serial.
      expect(a.serialHash).to.have.length(66);
      expect(a.serialHash).to.not.equal(ethers.hexlify(ethers.toUtf8Bytes(rawSerial)));
      // And the reverse lookup works from the hash alone.
      expect(await assets.assetIdBySerialHash(serialHash)).to.equal(1n);
    });
  });

  describe("unauthorized attempts rejected on-chain", function () {
    // NOTE: build the signer map INSIDE each test — beforeEach reassigns the
    // outer variables, a closure captured at describe-time would go stale.
    it("AUDITOR/USER/stranger cannot register assets", async function () {
      const actors = { auditor, user, stranger };
      for (const [name, who] of Object.entries(actors)) {
        await expect(registerSample(who)).to.be.revertedWithCustomError(assets, "NotProvisioner");
        void name;
      }
    });

    it("AUDITOR/USER/stranger cannot update or change status", async function () {
      await registerSample();
      for (const who of [auditor, user, stranger]) {
        await expect(
          assets.connect(who).updateAsset(1, "x", "y", "z", serialHash, metadataRef)
        ).to.be.revertedWithCustomError(assets, "NotProvisioner");
        await expect(assets.connect(who).setStatus(1, 1)).to.be.revertedWithCustomError(assets, "NotProvisioner");
      }
    });

    it("AUDITOR/USER/stranger cannot link NFTs", async function () {
      await registerSample();
      for (const who of [auditor, user, stranger]) {
        await expect(assets.connect(who).linkNft(1, 7)).to.be.revertedWithCustomError(assets, "NotAdmin");
      }
    });

    it("revoking MANAGER immediately removes asset provisioning powers", async function () {
      await am.connect(admin).revokePlatformRole(MANAGER_ROLE, manager.address);
      await expect(registerSample(manager)).to.be.revertedWithCustomError(assets, "NotProvisioner");
    });
  });

  describe("validation rules", function () {
    it("rejects empty name", async function () {
      await expect(
        assets.connect(admin).registerAsset("", "c", "d", serialHash, metadataRef)
      ).to.be.revertedWithCustomError(assets, "EmptyName");
    });
    it("rejects zero serial hash", async function () {
      await expect(
        assets.connect(admin).registerAsset("n", "c", "d", ethers.ZeroHash, metadataRef)
      ).to.be.revertedWithCustomError(assets, "ZeroSerialHash");
    });
    it("rejects duplicate serial hash (two assets cannot claim same serial)", async function () {
      await registerSample();
      await expect(
        assets.connect(admin).registerAsset("Other", "c", "d", serialHash, metadataRef)
      ).to.be.revertedWithCustomError(assets, "DuplicateSerialHash").withArgs(serialHash);
    });
    it("getAsset reverts for unknown id (missing != zero-filled)", async function () {
      await expect(assets.getAsset(99)).to.be.revertedWithCustomError(assets, "AssetNotFound").withArgs(99n);
      expect(await assets.assetExists(99)).to.equal(false);
    });
    it("assetIdBySerialHash returns 0 for unknown serial", async function () {
      expect(await assets.assetIdBySerialHash(ethers.keccak256(ethers.toUtf8Bytes("nope")))).to.equal(0n);
    });
  });

  describe("updates and status lifecycle", function () {
    it("updateAsset mutates fields, rotates serial index, emits event", async function () {
      await registerSample();
      const newSerial = ethers.keccak256(ethers.toUtf8Bytes("SN-REPLACED|salt"));
      await expect(assets.connect(manager).updateAsset(1, "Turbine X2", "Energy", "desc2", newSerial, metadataRef))
        .to.emit(assets, "AssetUpdated")
        .withArgs(1n, newSerial, metadataRef, (v) => v > 0n);
      const a = await assets.getAsset(1);
      expect(a.name).to.equal("Turbine X2");
      expect(a.serialHash).to.equal(newSerial);
      expect(await assets.assetIdBySerialHash(serialHash)).to.equal(0n); // old index cleared
      expect(await assets.assetIdBySerialHash(newSerial)).to.equal(1n);
    });

    it("updateAsset keeps self-consistency when serial unchanged", async function () {
      await registerSample();
      await assets.connect(admin).updateAsset(1, "Renamed", "c", "d", serialHash, metadataRef);
      expect(await assets.assetIdBySerialHash(serialHash)).to.equal(1n);
    });

    it("updateAsset rejects stealing another asset's serial hash", async function () {
      await registerSample();
      const other = ethers.keccak256(ethers.toUtf8Bytes("SN-OTHER|salt"));
      await assets.connect(admin).registerAsset("B", "c", "d", other, metadataRef);
      await expect(
        assets.connect(admin).updateAsset(1, "A", "c", "d", other, metadataRef)
      ).to.be.revertedWithCustomError(assets, "DuplicateSerialHash");
    });

    it("status transitions emit AssetStatusChanged and are idempotent", async function () {
      await registerSample();
      await expect(assets.connect(admin).setStatus(1, 1))
        .to.emit(assets, "AssetStatusChanged")
        .withArgs(1n, 0, 1, (v) => v > 0n);
      expect((await assets.getAsset(1)).status).to.equal(1); // Active
      await expect(assets.connect(admin).setStatus(1, 1)).to.not.emit(assets, "AssetStatusChanged");
      await assets.connect(admin).setStatus(1, 3); // Retired
      expect((await assets.getAsset(1)).status).to.equal(3);
    });

    it("setStatus/getAsset on unknown asset revert with AssetNotFound", async function () {
      await expect(assets.setStatus(5, 1)).to.be.revertedWithCustomError(assets, "AssetNotFound");
    });
  });

  describe("NFT linkage (future ERC-721 compatibility hook)", function () {
    it("ADMIN links asset -> token once; both directions queryable", async function () {
      await registerSample();
      await expect(assets.connect(admin).linkNft(1, 42))
        .to.emit(assets, "AssetNftLinked")
        .withArgs(1n, 42n, (v) => v > 0n);
      expect((await assets.getAsset(1)).nftTokenId).to.equal(42n);
      expect(await assets.assetIdForNft(42)).to.equal(1n);
    });

    it("cannot double-link an asset or reuse a token id", async function () {
      await registerSample();
      await assets.connect(admin).registerAsset("B", "c", "d",
        ethers.keccak256(ethers.toUtf8Bytes("SN-B|salt")), metadataRef);
      await assets.connect(admin).linkNft(1, 42);
      await expect(assets.connect(admin).linkNft(1, 43))
        .to.be.revertedWithCustomError(assets, "NftAlreadyLinked").withArgs(1n);
      await expect(assets.connect(admin).linkNft(2, 42))
        .to.be.revertedWithCustomError(assets, "TokenAlreadyLinked").withArgs(42n);
    });

    it("MANAGER may NOT link NFTs (admin-only)", async function () {
      await registerSample();
      await expect(assets.connect(manager).linkNft(1, 1))
        .to.be.revertedWithCustomError(assets, "NotAdmin");
    });

    it("linking unknown asset reverts", async function () {
      await expect(assets.connect(admin).linkNft(9, 1))
        .to.be.revertedWithCustomError(assets, "AssetNotFound");
    });
  });
});
