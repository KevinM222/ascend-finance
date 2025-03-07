// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol"; // Add this

contract AscSale is ReentrancyGuard { // Inherit ReentrancyGuard
    IERC20 public immutable ascToken; // Make immutable where possible
    IERC20 public immutable usdc;
    address public immutable treasury;
    address public immutable devWallet; // Consider making this upgradable
    uint256 public ascPerPol = 50;
    uint256 public ascPerUsdc = 50;
    
    bool public paused; // Add circuit breaker
    
    event AscPurchased(address indexed buyer, uint256 ascAmount, uint256 paidAmount, string currency);
    
    modifier onlyDev() {
        require(msg.sender == devWallet, "Only dev");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    constructor(address _ascToken, address _usdc, address _treasury, address _devWallet) {
        require(_ascToken != address(0), "Invalid ASC address");
        require(_usdc != address(0), "Invalid USDC address");
        require(_treasury != address(0), "Invalid treasury address");
        require(_devWallet != address(0), "Invalid dev address");
        
        ascToken = IERC20(_ascToken);
        usdc = IERC20(_usdc);
        treasury = _treasury;
        devWallet = _devWallet;
    }
    
    function buyWithPol() external payable nonReentrant whenNotPaused { // Add modifiers
        require(msg.value > 0, "No POL sent");
        uint256 polAmount = msg.value;
        uint256 ascAmount = polAmount * ascPerPol / 1 ether; // Adjust for decimals
        
        uint256 treasuryAmount = (polAmount * 80) / 100;
        uint256 devAmount = polAmount - treasuryAmount;
        
        require(ascToken.transfer(msg.sender, ascAmount), "ASC transfer failed");
        (bool sentTreasury, ) = treasury.call{value: treasuryAmount}("");
        require(sentTreasury, "Treasury transfer failed");
        (bool sentDev, ) = devWallet.call{value: devAmount}("");
        require(sentDev, "Dev transfer failed");
        
        emit AscPurchased(msg.sender, ascAmount, polAmount, "POL");
    }
    
    function buyWithUsdc(uint256 usdcAmount) external nonReentrant whenNotPaused {
        require(usdcAmount > 0, "No USDC amount");
        uint256 ascAmount = usdcAmount * ascPerUsdc; // Consider decimal adjustment
        
        uint256 treasuryAmount = (usdcAmount * 80) / 100;
        uint256 devAmount = usdcAmount - treasuryAmount;
        
        require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "USDC transfer failed");
        require(ascToken.transfer(msg.sender, ascAmount), "ASC transfer failed");
        require(usdc.transfer(treasury, treasuryAmount), "Treasury USDC failed");
        require(usdc.transfer(devWallet, devAmount), "Dev USDC failed");
        
        emit AscPurchased(msg.sender, ascAmount, usdcAmount, "USDC");
    }
    
    function setPrice(uint256 _ascPerPol, uint256 _ascPerUsdc) external onlyDev {
        require(_ascPerPol > 0 && _ascPerUsdc > 0, "Invalid price");
        ascPerPol = _ascPerPol;
        ascPerUsdc = _ascPerUsdc;
    }
    
    // Add pause functionality
    function setPaused(bool _paused) external onlyDev {
        paused = _paused;
    }

    // Add these functions
    function getContractAscBalance() public view returns (uint256) {
        return ascToken.balanceOf(address(this));
    }

    function getContractUsdcBalance() public view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    // Before transfers in buy functions
    require(ascToken.balanceOf(address(this)) >= ascAmount, "Insufficient ASC balance");
    
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