// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AscSale {
    IERC20 public ascToken; // ASC token address
    IERC20 public usdc;     // USDC: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
    address public treasury;
    address public devWallet = 0x274af9bd0fEe424e2cd0Fed72cc3f2cA49B751F1;
    uint256 public ascPerPol = 50;  // 1 POL = 50 ASC
    uint256 public ascPerUsdc = 50; // 1 USDC = 50 ASC
    
    event AscPurchased(address buyer, uint256 ascAmount, uint256 paidAmount, string currency);
    
    constructor(address _ascToken, address _usdc, address _treasury) {
        ascToken = IERC20(_ascToken);
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }
    
    function buyWithPol() external payable {
        uint256 polAmount = msg.value;
        uint256 ascAmount = polAmount * ascPerPol;
        
        uint256 treasuryAmount = (polAmount * 80) / 100;
        uint256 devAmount = polAmount - treasuryAmount;
        
        require(ascToken.transfer(msg.sender, ascAmount), "ASC transfer failed");
        (bool sentTreasury, ) = treasury.call{value: treasuryAmount}("");
        require(sentTreasury, "Treasury transfer failed");
        (bool sentDev, ) = devWallet.call{value: devAmount}("");
        require(sentDev, "Dev transfer failed");
        
        emit AscPurchased(msg.sender, ascAmount, polAmount, "POL");
    }
    
    function buyWithUsdc(uint256 usdcAmount) external {
        uint256 ascAmount = usdcAmount * ascPerUsdc;
        
        uint256 treasuryAmount = (usdcAmount * 80) / 100;
        uint256 devAmount = usdcAmount - treasuryAmount;
        
        require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "USDC transfer failed");
        require(ascToken.transfer(msg.sender, ascAmount), "ASC transfer failed");
        require(usdc.transfer(treasury, treasuryAmount), "Treasury USDC failed");
        require(usdc.transfer(devWallet, devAmount), "Dev USDC failed");
        
        emit AscPurchased(msg.sender, ascAmount, usdcAmount, "USDC");
    }
    
    function setPrice(uint256 _ascPerPol, uint256 _ascPerUsdc) external {
        require(msg.sender == devWallet, "Only dev");
        ascPerPol = _ascPerPol;
        ascPerUsdc = _ascPerUsdc;
    }
    
    function depositAsc(uint256 amount) external {
        require(msg.sender == devWallet, "Only dev");
        require(ascToken.transferFrom(msg.sender, address(this), amount), "ASC deposit failed");
    }
    
    function withdrawAsc(uint256 amount) external {
        require(msg.sender == devWallet, "Only dev");
        require(ascToken.transfer(devWallet, amount), "ASC withdraw failed");
    }
    
    function withdrawPol() external {
        require(msg.sender == devWallet, "Only dev");
        uint256 balance = address(this).balance;
        (bool sent, ) = devWallet.call{value: balance}("");
        require(sent, "POL withdraw failed");
    }
    
    function withdrawUsdc(uint256 amount) external {
        require(msg.sender == devWallet, "Only dev");
        require(usdc.transfer(devWallet, amount), "USDC withdraw failed");
    }
    
    receive() external payable {}
}