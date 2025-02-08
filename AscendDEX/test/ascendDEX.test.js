const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("AscendDEX & Rewards Testing", function () {
    let ModularDEX, AscRewards, dex, rewards, MockERC20, Treasury;
    let token1, token2_POL, token2_USDC, treasury, owner, addr1, addr2;
    
    const provider = ethers.provider; // ✅ Fix: Use Hardhat's built-in provider

    beforeEach(async function () {
        console.log("🔄 Resetting Hardhat network...");
        await network.provider.request({ method: "hardhat_reset" }); // ✅ Ensures fresh state

        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy Mock ERC20 Tokens
        MockERC20 = await ethers.getContractFactory("MockERC20");
        token1 = await MockERC20.deploy("Mock Token 1", "MT1", 18, ethers.utils.parseUnits("100000", 18));
        token2_POL = await MockERC20.deploy("Mock Token 2", "MT2", 18, ethers.utils.parseUnits("100000", 18));
        token2_USDC = await MockERC20.deploy("Mock Token 3", "MT3", 6, ethers.utils.parseUnits("100000", 6));
        
        await token1.deployed();
        await token2_POL.deployed();
        await token2_USDC.deployed();

        // Deploy Treasury Contract
        Treasury = await ethers.getContractFactory("Treasury");
        treasury = await Treasury.deploy(owner.address);
        await treasury.deployed();

        // ✅ FIXED: Correct ModularDEX Constructor Arguments
        ModularDEX = await ethers.getContractFactory("ModularDEX");
        dex = await ModularDEX.deploy(owner.address, owner.address, treasury.address, owner.address); // ✅ Fix
        await dex.deployed();

        // Deploy AscRewards
        AscRewards = await ethers.getContractFactory("AscRewards");
        rewards = await AscRewards.deploy(token1.address, ethers.utils.parseUnits("50000", 18)); // Reward pool 50,000 ASC
        await rewards.deployed();
    });

    it("Should deploy contracts successfully", async function () {
        expect(dex.address).to.properAddress;
        expect(rewards.address).to.properAddress;
    });

    it("Should allow fee updates", async function () {
        await dex.setFee(50); // 0.5%
        expect(await dex.fee()).to.equal(50);
    });

    it("Should allow adding & removing liquidity", async function () {
        const amount1 = ethers.utils.parseUnits("100", 18);
        const amount2 = ethers.utils.parseUnits("50", 18);

        await token1.connect(addr1).approve(dex.address, amount1);
        await token2_POL.connect(addr1).approve(dex.address, amount2);

        await dex.connect(addr1).addLiquidity("MT1", "MT2", amount1, amount2);

        const pair = await dex.pairs(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MT1MT2")));
        expect(pair.reserve1).to.equal(amount1);
        expect(pair.reserve2).to.equal(amount2);

        await dex.connect(addr1).removeLiquidity("MT1", "MT2", ethers.utils.parseUnits("20", 18));

        const updatedPair = await dex.pairs(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MT1MT2")));
        expect(updatedPair.reserve1).to.be.lt(pair.reserve1);
        expect(updatedPair.reserve2).to.be.lt(pair.reserve2);
    });

    it("Should swap tokens", async function () {
        const amount1 = ethers.utils.parseUnits("100", 18);
        const amount2 = ethers.utils.parseUnits("50", 18);

        await token1.connect(addr1).approve(dex.address, amount1);
        await token2_POL.connect(addr1).approve(dex.address, amount2);
        await dex.connect(addr1).addLiquidity("MT1", "MT2", amount1, amount2);

        await token2_POL.connect(addr1).approve(dex.address, ethers.utils.parseUnits("10", 18));
        await dex.connect(addr1).swap("MT2", "MT1", ethers.utils.parseUnits("10", 18), 1, 2);

        const balance1 = await token1.balanceOf(addr1.address);
        expect(balance1).to.be.gt(ethers.utils.parseUnits("0", 18));
    });

    it("Should allocate and claim rewards", async function () {
        const rewardAmount = ethers.utils.parseUnits("100", 18);
        const liquidityAmount = ethers.utils.parseUnits("500", 18);
        const pairId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MT1MT2"));

        await rewards.allocateRewardsAndLiquidity(addr1.address, pairId, rewardAmount, liquidityAmount);
        expect(await rewards.rewardBalances(addr1.address)).to.equal(rewardAmount);

        await rewards.connect(addr1).claimRewards();
        const balanceAfter = await token1.balanceOf(addr1.address);
        expect(balanceAfter).to.equal(rewardAmount);
    });

    it("Should collect fees in the treasury", async function () {
        const depositAmount = ethers.utils.parseUnits("20", 18);

        await token1.connect(owner).approve(treasury.address, depositAmount);
        await treasury.deposit(token1.address, depositAmount);

        const treasuryBalance = await token1.balanceOf(treasury.address);
        expect(treasuryBalance).to.equal(depositAmount);
    });
});
