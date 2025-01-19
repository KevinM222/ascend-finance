const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AscendDEX Contract", function () {
    let AscendDEX, ascendDEX, MockERC20, MockPriceFeed;
    let token1, token2_POL, token2_USDC, priceFeed_POL, priceFeed_USDC;
    let owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy Mock Tokens
        MockERC20 = await ethers.getContractFactory("MockERC20");
        token1 = await MockERC20.deploy("Mock Token 1", "MT1", ethers.utils.parseUnits("100000", 18));
        await token1.deployed();
        token2_POL = await MockERC20.deploy("Mock Token 2", "MT2", ethers.utils.parseUnits("100000", 18));
        await token2_POL.deployed();
        token2_USDC = await MockERC20.deploy("Mock Token 3", "MT3", ethers.utils.parseUnits("100000", 18));
        await token2_USDC.deployed();

        // Distribute tokens to addr1
        await token1.transfer(addr1.address, ethers.utils.parseUnits("10000", 18));
        await token2_POL.transfer(addr1.address, ethers.utils.parseUnits("5000", 18));
        await token2_USDC.transfer(addr1.address, ethers.utils.parseUnits("5000", 18));

        // Deploy Mock Price Feeds
        MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        priceFeed_POL = await MockPriceFeed.deploy(8, "Mock POL/USD Price Feed", 1, ethers.utils.parseUnits("1", 8));
        await priceFeed_POL.deployed();
        priceFeed_USDC = await MockPriceFeed.deploy(8, "Mock USDC/USD Price Feed", 1, ethers.utils.parseUnits("1", 8));
        await priceFeed_USDC.deployed();

        // Deploy AscendDEX Contract
        AscendDEX = await ethers.getContractFactory("AscendDEX");
        ascendDEX = await AscendDEX.deploy(
            token1.address,
            token2_POL.address,
            token2_USDC.address,
            priceFeed_POL.address,
            priceFeed_USDC.address,
            owner.address
        );
        await ascendDEX.deployed();
    });

    it("Should deploy the contract successfully", async function () {
        expect(ascendDEX.address).to.properAddress;
    });

    it("Should add liquidity and handle swaps correctly", async function () {
        const amount1 = ethers.utils.parseUnits("100", 18); // ASC liquidity
        const amount2 = ethers.utils.parseUnits("50", 18); // POL liquidity

        // Approve tokens for adding liquidity
        await token1.connect(addr1).approve(ascendDEX.address, amount1);
        await token2_POL.connect(addr1).approve(ascendDEX.address, amount2);

        console.log("Adding liquidity...");
        // Add liquidity
        await ascendDEX.connect(addr1).addLiquidity(token2_POL.address, amount1, amount2);

        // Assert reserves updated
        const pair = await ascendDEX.pairs(token2_POL.address);
        console.log("Reserves after adding liquidity:", {
            reserve1: pair.reserve1.toString(),
            reserve2: pair.reserve2.toString(),
        });
        expect(pair.reserve1).to.equal(amount1);
        expect(pair.reserve2).to.equal(amount2);

        const amountIn = ethers.utils.parseUnits("10", 18); // POL swap input
        const amountOutMin = ethers.utils.parseUnits("1", 18); // Minimum ASC output

        // Approve tokens for swap
        await token2_POL.connect(addr1).approve(ascendDEX.address, amountIn);

        // Capture reserves before swap
        const pairBefore = await ascendDEX.pairs(token2_POL.address);
        console.log("Reserves before swap:", {
            reserve1: pairBefore.reserve1.toString(),
            reserve2: pairBefore.reserve2.toString(),
        });

        console.log("Performing swap...");
        // Perform swap
        await ascendDEX.connect(addr1).swap(token2_POL.address, amountIn, token1.address, amountOutMin);

        // Capture reserves after swap
        const pairAfter = await ascendDEX.pairs(token2_POL.address);
        console.log("Reserves after swap:", {
            reserve1: pairAfter.reserve1.toString(),
            reserve2: pairAfter.reserve2.toString(),
        });

        // Validate reserve changes
        expect(pairAfter.reserve1).to.be.lt(pairBefore.reserve1); // Reserve1 should decrease
        expect(pairAfter.reserve2).to.be.gt(pairBefore.reserve2); // Reserve2 should increase
   });
});
