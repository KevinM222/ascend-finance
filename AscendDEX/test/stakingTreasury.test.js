const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("AscStaking & Treasury Testing", function () {
    let AscStaking, Treasury, MockERC20, staking, treasury;
    let ascToken, owner, addr1, addr2;

    beforeEach(async function () {
        console.log("🔄 Resetting Hardhat network...");
        await network.provider.request({ method: "hardhat_reset" });

        [owner, addr1, addr2] = await ethers.getSigners();

        // ✅ Deploy Mock ERC20 Token (ASC Token)
        MockERC20 = await ethers.getContractFactory("MockERC20");
        ascToken = await MockERC20.deploy("Ascend Token", "ASC", 18, ethers.utils.parseUnits("1000000", 18));
        await ascToken.deployed();

        // ✅ Deploy Treasury
        Treasury = await ethers.getContractFactory("Treasury");
        treasury = await Treasury.deploy();
        await treasury.deployed();

        // ✅ Deploy AscStaking with Initial Reward Pool
        AscStaking = await ethers.getContractFactory("AscStaking");
        staking = await AscStaking.deploy(ascToken.address, ethers.utils.parseUnits("100000", 18));
        await staking.deployed();

        // ✅ Ensure Staking Contract Has Enough Tokens
        await ascToken.transfer(staking.address, ethers.utils.parseUnits("100000", 18));
        await ascToken.transfer(addr1.address, ethers.utils.parseUnits("500000", 18));
    });

    it("Should allow staking ASC tokens", async function () {
        const stakeAmount = ethers.utils.parseUnits("2000", 18);

        await ascToken.connect(addr1).approve(staking.address, stakeAmount);
        await staking.connect(addr1).stake(stakeAmount, 0);

        const stakeInfo = await staking.stakes(addr1.address);
        expect(stakeInfo.amount).to.equal(stakeAmount);
    });

    it("Should allow unstaking ASC tokens", async function () {
        const stakeAmount = ethers.utils.parseUnits("5000", 18);
        await ascToken.connect(addr1).approve(staking.address, stakeAmount);
        await staking.connect(addr1).stake(stakeAmount, 0);

        // ✅ Ensure Contract Has Enough Balance for Unstaking
        console.log("💰 Contract balance before unstaking:", await ascToken.balanceOf(staking.address));

        // ✅ Increase time to allow rewards accumulation
        await network.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]); 
        await network.provider.send("evm_mine");

        await staking.connect(addr1).unstake(stakeAmount);
        const stakeInfo = await staking.stakes(addr1.address);
        expect(stakeInfo.amount).to.equal(0);
    });

    it("Should allow deposits to the treasury", async function () {
        const depositAmount = ethers.utils.parseUnits("10000", 18);

        await ascToken.connect(addr1).approve(treasury.address, depositAmount);
        await treasury.connect(addr1).deposit(ascToken.address, depositAmount);

        const balance = await ascToken.balanceOf(treasury.address);
        expect(balance).to.equal(depositAmount);
    });

    it("Should prevent non-owner from withdrawing from the treasury", async function () {
        await expect(
            treasury.connect(addr1).withdraw(ascToken.address, addr1.address, ethers.utils.parseUnits("10000", 18))
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });
});
