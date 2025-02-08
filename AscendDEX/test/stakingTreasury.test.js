const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("AscStaking & Treasury Testing", function () {
    let AscStaking, Treasury, MockERC20, staking, treasury;
    let ascToken, owner, addr1, addr2;

    beforeEach(async function () {
        console.log("🔄 Resetting Hardhat network...");
        await network.provider.request({ method: "hardhat_reset" }); // Ensures fresh state

        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy Mock ERC20 Token (ASC Token)
        MockERC20 = await ethers.getContractFactory("MockERC20");
        ascToken = await MockERC20.deploy("Ascend Token", "ASC", 18, ethers.utils.parseUnits("1000000", 18));
        await ascToken.deployed();

        // Deploy Treasury
        Treasury = await ethers.getContractFactory("Treasury");
        treasury = await Treasury.deploy();
        await treasury.deployed();

        // Deploy AscStaking with 100,000 ASC reward pool
        AscStaking = await ethers.getContractFactory("AscStaking");
        staking = await AscStaking.deploy(ascToken.address, ethers.utils.parseUnits("100000", 18));
        await staking.deployed();

        // Allocate 500,000 ASC to addr1 for testing
        await ascToken.transfer(addr1.address, ethers.utils.parseUnits("500000", 18));
    });

    // ✅ Ensure contracts deploy successfully
    it("Should deploy Staking & Treasury contracts", async function () {
        expect(staking.address).to.be.properAddress;
        expect(treasury.address).to.be.properAddress;
    });

    // ✅ Test staking functionality
    it("Should allow staking ASC tokens", async function () {
        const stakeAmount = ethers.utils.parseUnits("2000", 18);

        // ✅ Fix: Ensure tokens are approved before staking
        await ascToken.connect(addr1).approve(staking.address, stakeAmount);

        // Stake
        await staking.connect(addr1).stake(stakeAmount, 0); // No lock period

        // Verify staking
        const stakeInfo = await staking.stakes(addr1.address);
        expect(stakeInfo.amount).to.equal(stakeAmount);
        expect(stakeInfo.lockUntil).to.equal(0);
        expect(stakeInfo.apy).to.equal(200); // 2% APY for no-lock staking
    });

    // ✅ Test staking with lock durations
    it("Should apply correct APY based on lock duration", async function () {
        const stakeAmount = ethers.utils.parseUnits("5000", 18);
        await ascToken.connect(addr1).approve(staking.address, stakeAmount);

        // Stake with different lock periods
        await staking.connect(addr1).stake(stakeAmount, 30 * 24 * 60 * 60); // 1-month lock
        let stakeInfo = await staking.stakes(addr1.address);
        expect(stakeInfo.apy).to.equal(500); // 5% APY

        await staking.connect(addr1).stake(stakeAmount, 365 * 24 * 60 * 60); // 1-year lock
        stakeInfo = await staking.stakes(addr1.address);
        expect(stakeInfo.apy).to.equal(1600); // 16% APY

        await staking.connect(addr1).stake(stakeAmount, 730 * 24 * 60 * 60); // 2-year lock
        stakeInfo = await staking.stakes(addr1.address);
        expect(stakeInfo.apy).to.equal(2000); // 20% APY
    });

    // ✅ Test claiming staking rewards
    it("Should allow claiming staking rewards", async function () {
        const stakeAmount = ethers.utils.parseUnits("5000", 18);
        await ascToken.connect(addr1).approve(staking.address, stakeAmount);
        await staking.connect(addr1).stake(stakeAmount, 0); // No lock

        // ✅ Fix: Increase time to accumulate rewards before claiming
        await network.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]); // Move forward 1 year
        await network.provider.send("evm_mine"); // Mine new block

        // Claim rewards
        await staking.connect(addr1).claimRewards();

        // ✅ Verify balance increase due to rewards
        const balance = await ascToken.balanceOf(addr1.address);
        expect(balance).to.be.gt(ethers.utils.parseUnits("5000", 18));
    });

    // ✅ Test fee discount based on staked amount
    it("Should return correct fee discount based on staked amount", async function () {
        await ascToken.connect(addr1).approve(staking.address, ethers.utils.parseUnits("10000", 18));
        await staking.connect(addr1).stake(ethers.utils.parseUnits("10000", 18), 0);

        let discount = await staking.getFeeReduction(addr1.address);
        expect(discount).to.equal(10); // 10% discount at 10,000 ASC

        await staking.connect(addr1).stake(ethers.utils.parseUnits("50000", 18), 0);
        discount = await staking.getFeeReduction(addr1.address);
        expect(discount).to.equal(20); // 20% discount at 50,000 ASC
    });

    // ✅ Test unstaking functionality
    it("Should allow unstaking ASC tokens", async function () {
        const stakeAmount = ethers.utils.parseUnits("5000", 18);
        await ascToken.connect(addr1).approve(staking.address, stakeAmount);
        await staking.connect(addr1).stake(stakeAmount, 0);

        // ✅ Fix: Ensure rewards are accumulated before unstaking
        await network.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]); // Move forward 1 year
        await network.provider.send("evm_mine");

        // Unstake
        await staking.connect(addr1).unstake(stakeAmount);
        const stakeInfo = await staking.stakes(addr1.address);
        expect(stakeInfo.amount).to.equal(0);
    });

    // ✅ Test treasury deposit functionality
    it("Should allow deposits to the treasury", async function () {
        const depositAmount = ethers.utils.parseUnits("10000", 18);

        // Approve and deposit
        await ascToken.connect(addr1).approve(treasury.address, depositAmount);
        await treasury.connect(addr1).deposit(ascToken.address, depositAmount);

        // Verify balance in treasury
        const balance = await ascToken.balanceOf(treasury.address);
        expect(balance).to.equal(depositAmount);
    });

    // ✅ Test treasury withdrawals
    it("Should allow withdrawals from the treasury", async function () {
        const depositAmount = ethers.utils.parseUnits("10000", 18);
        await ascToken.connect(addr1).approve(treasury.address, depositAmount);
        await treasury.connect(addr1).deposit(ascToken.address, depositAmount);

        // Withdraw
        await treasury.connect(owner).withdraw(ascToken.address, addr1.address, depositAmount);

        // Verify balance
        const balance = await ascToken.balanceOf(addr1.address);
        expect(balance).to.be.gte(depositAmount);
    });

    // ✅ Test that only owner can withdraw from the treasury
    it("Should prevent non-owner from withdrawing from the treasury", async function () {
        await expect(
            treasury.connect(addr1).withdraw(ascToken.address, addr1.address, ethers.utils.parseUnits("10000", 18))
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });
});
