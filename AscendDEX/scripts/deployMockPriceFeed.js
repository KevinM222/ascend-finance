async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");

    // Set initial parameters for the MockPriceFeed
    const decimals = 8; // Match Chainlink standard
    const description = "POL/USD Mock Price Feed"; // Description
    const version = 1; // Mock version
    const initialPrice = ethers.utils.parseUnits("0.5", decimals); // $0.50

    const mockPriceFeed = await MockPriceFeed.deploy(decimals, description, version, initialPrice);

    await mockPriceFeed.deployed();

    console.log("MockPriceFeed deployed to:", mockPriceFeed.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
