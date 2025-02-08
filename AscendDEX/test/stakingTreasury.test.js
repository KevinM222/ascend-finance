const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("AscStaking & Treasury Testing", function () {
    let AscStaking, Treasury, MockERC20, staking, treasury;
    let ascToken, owner, addr1, addr2;

    beforeEach(async function () {
        console.log("🔄 Resetting Hardhat network...");
        await network.provider.request({ method: "hardhat_reset" });

        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy Mock ERC20 Token
        MockERC20 = await ethers.getContractFactory("MockERC20");
        ascToken = await MockERC20.deploy("Ascend Token", "ASC", 18, ethers.utils.parseUnits("1000000", 18));
        await ascToken.deployed();

        // Deploy Treasury
        Treasury = await ethers.getContractFactory("Treasury");
        treasury = await Treasury.deploy();
        await treasury.deployed();

        // Deploy AscStaking
        AscStaking = await ethers.getContractFactory("AscStaking");
        staking = await AscStaking.deploy(ascToken.address, ethers.utils.parseUnits("100000", 18));
        await staking.deployed();

        // ✅ Fix: Fund Staking contract with ASC tokens to handle unstaking
        await ascToken.transfer(staking.address, ethers.utils.parseUnits("100000", 18));

        // Allocate tokens to addr1
        await ascToken.transfer(addr1.address, ethers.utils.parseUnits("500000", 18));
    });

    it("Should allow unstaking ASC tokens", async function () {
        const stakeAmount = ethers.utils.parseUnits("5000", 18);
        await ascToken.connect(addr1).approve(staking.address, stakeAmount);
        await staking.connect(addr1).stake(stakeAmount, 0);

        // ✅ Fix: Ensure rewards are accumulated before unstaking
        await network.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
        await network.provider.send("evm_mine");

        // ✅ Fix: Claim rewards before unstaking
        await staking.connect(addr1).claimRewards();

        // ✅ Fix: Check Staking Contract Balance before unstaking
        const contractBalance = await ascToken.balanceOf(staking.address);
        console.log("💰 Staking Contract balance before unstaking:", contractBalance.toString());

        // ✅ Fix: Ensure the contract has enough balance to unstake
        await staking.connect(addr1).unstake(stakeAmount);

        const stakeInfo = await staking.stakes(addr1.address);
        expect(stakeInfo.amount).to.equal(0);
    });
});
