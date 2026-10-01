const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdentityRegistry (Feature 3)", function () {
  let registry, owner, alice, bob, stranger;
  const refHash = ethers.keccak256(ethers.toUtf8Bytes("off-chain-record-ref-alice"));

  beforeEach(async function () {
    [owner, alice, bob, stranger] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("IdentityRegistry");
    registry = await Registry.deploy(owner.address, ethers.ZeroAddress);
    await registry.waitForDeployment();
  });

  describe("creation", function () {
    it("creates an identity for a wallet with active status and timestamps", async function () {
      await expect(registry.createIdentity(alice.address, refHash)).to.not.be.reverted;
      const rec = await registry.getIdentity(alice.address);
      expect(rec.wallet).to.equal(alice.address);
      expect(rec.refHash).to.equal(refHash);
      expect(rec.active).to.equal(true);
      expect(rec.createdAt).to.be.gt(0);
      expect(rec.updatedAt).to.equal(rec.createdAt);
      expect(await registry.identityCount()).to.equal(1);
    });

    it("rejects duplicate wallet (one identity per wallet)", async function () {
      await registry.createIdentity(alice.address, refHash);
      await expect(registry.createIdentity(alice.address, refHash))
        .to.be.revertedWithCustomError(registry, "IdentityAlreadyExists")
        .withArgs(alice.address);
    });

    it("rejects zero address", async function () {
      await expect(registry.createIdentity(ethers.ZeroAddress, refHash))
        .to.be.revertedWithCustomError(registry, "ZeroAddressNotAllowed");
    });

    it("rejects empty reference hash", async function () {
      await expect(registry.createIdentity(alice.address, ethers.ZeroHash))
        .to.be.revertedWithCustomError(registry, "EmptyReference");
    });

    it("rejects creation by non-owner (unauthorized admin)", async function () {
      await expect(registry.connect(stranger).createIdentity(alice.address, refHash))
        .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount")
        .withArgs(stranger.address);
    });
  });

  describe("retrieval + verification", function () {
    it("verifyIdentity returns true + DID id for existing active identity", async function () {
      await registry.createIdentity(alice.address, refHash);
      const expectedId = await registry.idOf(alice.address);
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const manualId = ethers.keccak256(
        ethers.solidityPacked(["string", "uint256", "string", "address"],
          ["did:platform:", chainId, ":", alice.address])
      );
      expect(expectedId).to.equal(manualId); // minimal DID-compatible derivation check
      const res = await registry.verifyIdentity(alice.address);
      expect(res.verified).to.equal(true);
      expect(res.id).to.equal(manualId);
      expect(res.createdAt).to.be.gt(0);
    });

    it("verifyIdentity returns false for unknown wallet (no revert)", async function () {
      const res = await registry.verifyIdentity(bob.address);
      expect(res.verified).to.equal(false);
    });

    it("getIdentity reverts for unknown wallet", async function () {
      await expect(registry.getIdentity(bob.address))
        .to.be.revertedWithCustomError(registry, "IdentityNotFound")
        .withArgs(bob.address);
    });
  });

  describe("deactivation authorization", function () {
    it("owner can deactivate; verify then fails while record persists", async function () {
      await registry.createIdentity(alice.address, refHash);
      await expect(registry.deactivateIdentity(alice.address)).to.not.be.reverted;
      const rec = await registry.getIdentity(alice.address);
      expect(rec.active).to.equal(false);
      const res = await registry.verifyIdentity(alice.address);
      expect(res.verified).to.equal(false);
    });

    it("non-owner cannot deactivate", async function () {
      await registry.createIdentity(alice.address, refHash);
      await expect(registry.connect(stranger).deactivateIdentity(alice.address))
        .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("cannot deactivate unknown identity", async function () {
      await expect(registry.deactivateIdentity(bob.address))
        .to.be.revertedWithCustomError(registry, "IdentityNotFound");
    });

    it("owner can reactivate (activate/deactivate lifecycle)", async function () {
      await registry.createIdentity(alice.address, refHash);
      await registry.deactivateIdentity(alice.address);
      await registry.activateIdentity(alice.address);
      const res = await registry.verifyIdentity(alice.address);
      expect(res.verified).to.equal(true);
    });
  });

  describe("events", function () {
    it("emits IdentityCreated with correct args", async function () {
      const id = await registry.idOf(alice.address);
      await expect(registry.createIdentity(alice.address, refHash))
        .to.emit(registry, "IdentityCreated")
        .withArgs(alice.address, id, refHash, (v) => v > 0);
    });

    it("emits IdentityDeactivated on deactivation", async function () {
      await registry.createIdentity(alice.address, refHash);
      const id = await registry.idOf(alice.address);
      await expect(registry.deactivateIdentity(alice.address))
        .to.emit(registry, "IdentityDeactivated")
        .withArgs(alice.address, id, (v) => v > 0);
    });

    it("emits IdentityReactivated and IdentityRefUpdated", async function () {
      await registry.createIdentity(alice.address, refHash);
      await registry.deactivateIdentity(alice.address);
      await expect(registry.activateIdentity(alice.address))
        .to.emit(registry, "IdentityReactivated");
      const newRef = ethers.keccak256(ethers.toUtf8Bytes("rotated-ref"));
      await expect(registry.updateReference(alice.address, newRef))
        .to.emit(registry, "IdentityRefUpdated")
        .withArgs(alice.address, (await registry.idOf(alice.address)), newRef, (v) => v > 0);
      const rec = await registry.getIdentity(alice.address);
      expect(rec.refHash).to.equal(newRef);
    });

    it("duplicate create reverts and emits no event (staticCall pre-check)", async function () {
      await registry.createIdentity(alice.address, refHash);
      // A reverted tx cannot emit events; assert revert explicitly plus confirm
      // the duplicate call would not produce a second IdentityCreated via static simulation guard.
      await expect(registry.createIdentity(alice.address, refHash))
        .to.be.revertedWithCustomError(registry, "IdentityAlreadyExists");
      expect(await registry.identityCount()).to.equal(1); // no phantom record/event
    });
  });

  describe("enumeration", function () {
    it("lists created identities in order", async function () {
      await registry.createIdentity(alice.address, refHash);
      await registry.createIdentity(bob.address, ethers.keccak256(ethers.toUtf8Bytes("ref-bob")));
      expect(await registry.identityCount()).to.equal(2);
      expect(await registry.identityAt(0)).to.equal(alice.address);
      expect(await registry.identityAt(1)).to.equal(bob.address);
      await expect(registry.identityAt(2)).to.be.reverted;
    });
  });
});
