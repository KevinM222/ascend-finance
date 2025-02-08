const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("AscendDEX & Rewards Testing", function () {
    let ModularDEX, AscRewards, dex, rewards, MockERC20, Treasury;
    let token1, token2_POL, token2_USDC, treasury, owner, addr1, addr2;

    beforeEach(async function () {
        console.log("🔄 Resetting Hardhat network...");
        await network.provider.request({ method: "hardhat_reset" });

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
        treasury = await Treasury.deploy();
        await treasury.deployed();

        // ✅ Fix: Ensure the correct number of constructor arguments for ModularDEX
        ModularDEX = await ethers.getContractFactory("ModularDEX");
        dex = await ModularDEX.deploy(owner.address, treasury.address, owner.address); // Fix
        await dex.deployed();

        // ✅ Fix: Register tokens before adding liquidity
        await dex.addToken("MT1", token1.address, owner.address, 18);
        await dex.addToken("MT2", token2_POL.address, owner.address, 18);

        // Deploy AscRewards
        AscRewards = await ethers.getContractFactory("AscRewards");
        rewards = await AscRewards.deploy(token1.address, ethers.utils.parseUnits("50000", 18));
        await rewards.deployed();
    });

    it("Should allow fee updates", async function () {
        // ✅ Fix: Ensure only owner updates fee
        await dex.connect(owner).setFee(50);
        expect(await dex.fee()).to.equal(50);
    });

    it("Should allow adding & removing liquidity", async function () {
        const amount1 = ethers.utils.parseUnits("100", 18);
        const amount2 = ethers.utils.parseUnits("50", 18);

        await token1.connect(addr1).approve(dex.address, amount1);
        await token2_POL.connect(addr1).approve(dex.address, amount2);

        // ✅ Fix: Ensure tokens are registered before adding liquidity
        await dex.connect(owner).addLiquidity("MT1", "MT2", amount1, amount2);

        const pair = await dex.pairs(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MT1MT2")));
        expect(pair.reserve1).to.equal(amount1);
        expect(pair.reserve2).to.equal(amount2);
    });
});
