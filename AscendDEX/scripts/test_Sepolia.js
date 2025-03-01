const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    console.log("Initial ETH balance:", hre.ethers.utils.formatEther(await deployer.getBalance()));

    const ascTokenAddress = "0xE6D3d358CB0A63C6B0851a2b4107Ed20387bB923";
    const usdcAddress = "0x176f5a08c4c4cfC364C35a309c093a8979344600";
    const wpolAddress = "0x05db234b00e782A8689E185A8A79E488CA070cC8";
    const saleAddress = "0x7C7beb9F164BFd6a61a2e1e044B759777Dc699Ce";
    const treasuryAddress = "0x1C99ff4b13E16a47072EEfDc8848AE6c3AAD7052";

    const ascToken = await hre.ethers.getContractAt("IERC20", ascTokenAddress, deployer);
    const usdc = await hre.ethers.getContractAt("IERC20", usdcAddress, deployer);
    const wpol = await hre.ethers.getContractAt("IERC20", wpolAddress, deployer);
    const sale = await hre.ethers.getContractAt("AscSale", saleAddress, deployer);
    const treasury = await hre.ethers.getContractAt("AscTreasury", treasuryAddress, deployer);

    // Test 1: Buy with ETH
    console.log("\nTest 1: Buying 5 ASC with 0.1 ETH...");
    const ethAmount = hre.ethers.utils.parseEther("0.1");
    await sale.buyWithPol({ value: ethAmount });
    console.log("Bought 5 ASC with 0.1 ETH");

    // Test 2: Buy with USDC
    console.log("\nTest 2: Buying 500 ASC with 10 USDC...");
    const usdcAmount = hre.ethers.utils.parseUnits("10", 6);
    console.log("Approving USDC...");
    const approveTx = await usdc.approve(saleAddress, usdcAmount);
    await approveTx.wait();
    console.log("USDC approved");
    await sale.buyWithUsdc(usdcAmount);
    console.log("Bought 500 ASC with 10 USDC");

    // Test 3: Set new price
    console.log("\nTest 3: Setting new price to 100 ASC/ETH, 100 ASC/USDC...");
    const initialEthPrice = await sale.ascPerPol();
    const initialUsdcPrice = await sale.ascPerUsdc();
    console.log("Before:", initialEthPrice.toString(), "ASC/ETH,", initialUsdcPrice.toString(), "ASC/USDC");
    const priceTx = await sale.setPrice(100, 100);
    await priceTx.wait();
    console.log("After:", (await sale.ascPerPol()).toString(), "ASC/ETH,", (await sale.ascPerUsdc()).toString(), "ASC/USDC");

    // Test 4: Auto-stake ETH in treasury
    console.log("\nTest 4: Sending 0.5 ETH to treasury and staking...");
    await deployer.sendTransaction({ to: treasuryAddress, value: hre.ethers.utils.parseEther("0.5") });
    await treasury.autoStake();
    console.log("Treasury balance:", hre.ethers.utils.formatEther(await hre.ethers.provider.getBalance(treasuryAddress)));
    console.log("Staked amount:", hre.ethers.utils.formatEther(await treasury.stakedAmount()));

    // Test 5: Wrap ETH to WPOL
    console.log("\nTest 5: Wrapping 0.01 ETH to WPOL...");
    await treasury.wrapPol(hre.ethers.utils.parseEther("0.01"));
    console.log("WPOL balance in treasury:", hre.ethers.utils.formatEther(await wpol.balanceOf(treasuryAddress)));

    // Test 6: Withdraw USDC from sale
    console.log("\nTest 6: Withdrawing 5 USDC from sale...");
    await sale.withdrawUsdc(hre.ethers.utils.parseUnits("5", 6));
    console.log("USDC balance in wallet:", hre.ethers.utils.formatUnits(await usdc.balanceOf(deployer.address), 6));

    // Test 7: Withdraw ETH from sale
    console.log("\nTest 7: Withdrawing 0.05 ETH from sale...");
    await sale.withdrawPol();
    console.log("ETH balance in wallet:", hre.ethers.utils.formatEther(await deployer.getBalance()));

    // Test 8: Withdraw ASC from sale
    console.log("\nTest 8: Withdrawing 1000 ASC from sale...");
    await sale.withdrawAsc(hre.ethers.utils.parseUnits("1000", 18));
    console.log("ASC balance in wallet:", hre.ethers.utils.formatUnits(await ascToken.balanceOf(deployer.address), 18));

    // Test 9: Withdraw WPOL from treasury
    console.log("\nTest 9: Withdrawing 0.01 WPOL from treasury...");
    await treasury.withdrawWpol(hre.ethers.utils.parseEther("0.01"));
    console.log("WPOL balance in wallet:", hre.ethers.utils.formatEther(await wpol.balanceOf(deployer.address)));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Test error:", error);
        process.exit(1);
    });