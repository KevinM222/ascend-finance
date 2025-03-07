// test/AscSale.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AscSale", function () {
  let AscSale, ascSale, MockToken, ascToken, usdcToken;
  let owner, buyer, treasury, devWallet;

  const initialSupply = ethers.utils.parseEther("1000000");
  const ascPerPol = 50;
  const ascPerUsdc = 50;

  beforeEach(async function () {
    [owner, buyer, treasury, devWallet] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    MockToken = await ethers.getContractFactory("MockERC20");
    ascToken = await MockToken.deploy("Ascend", "ASC", initialSupply);
    usdcToken = await MockToken.deploy("USDC", "USDC", initialSupply);
    await ascToken.deployed();
    await usdcToken.deployed();

    // Deploy AscSale contract
    AscSale = await ethers.getContractFactory("AscSale");
    ascSale = await AscSale.deploy(
      ascToken.address,
      usdcToken.address,
      treasury.address,
      devWallet.address
    );
    await ascSale.deployed();

    // Transfer some ASC tokens to the sale contract
    await ascToken.transfer(ascSale.address, ethers.utils.parseEther("10000"));
    
    // Approve USDC spending
    await usdcToken.connect(buyer).approve(ascSale.address, ethers.utils.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set the right parameters", async function () {
      expect(await ascSale.ascToken()).to.equal(ascToken.address);
      expect(await ascSale.usdc()).to.equal(usdcToken.address);
      expect(await ascSale.treasury()).to.equal(treasury.address);
      expect(await ascSale.devWallet()).to.equal(devWallet.address);
      expect(await ascSale.ascPerPol()).to.equal(ascPerPol);
      expect(await ascSale.ascPerUsdc()).to.equal(ascPerUsdc);
    });
  });

  describe("Buy with POL", function () {
    it("Should allow buying with POL", async function () {
      const polAmount = ethers.utils.parseEther("1");
      const expectedAsc = polAmount.mul(ascPerPol);

      await expect(() =>
        ascSale.connect(buyer).buyWithPol({ value: polAmount })
      ).to.changeEtherBalances(
        [buyer, treasury, devWallet],
        [polAmount.mul(-1), polAmount.mul(80).div(100), polAmount.mul(20).div(100)]
      );

      expect(await ascToken.balanceOf(buyer.address)).to.equal(expectedAsc);
    });
  });

  describe("Buy with USDC", function () {
    it("Should allow buying with USDC", async function () {
      const usdcAmount = ethers.utils.parseEther("1");
      const expectedAsc = usdcAmount.mul(ascPerUsdc);

      await usdcToken.transfer(buyer.address, usdcAmount);
      await ascSale.connect(buyer).buyWithUsdc(usdcAmount);

      expect(await ascToken.balanceOf(buyer.address)).to.equal(expectedAsc);
      expect(await usdcToken.balanceOf(treasury.address)).to.equal(usdcAmount.mul(80).div(100));
      expect(await usdcToken.balanceOf(devWallet.address)).to.equal(usdcAmount.mul(20).div(100));
    });
  });
});

// Mock ERC20 for testing
// contracts/MockERC20.sol
const { writeFileSync } = require('fs');

const mockERC20 = `
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }
}
`;
writeFileSync('contracts/MockERC20.sol', mockERC20);