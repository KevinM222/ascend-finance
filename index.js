document.addEventListener('DOMContentLoaded', async () => {
    let provider;
    const connectWalletButton = document.getElementById('connectWalletButton');
    const disconnectWalletButton = document.getElementById('disconnectWalletButton');
    const balanceDisplay = document.getElementById('ascBalance'); 
    const priceDisplay = document.getElementById('ascPrice');

    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);

        connectWalletButton.addEventListener('click', async () => {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });

                provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const address = await signer.getAddress();

                connectWalletButton.style.display = 'none';
                disconnectWalletButton.style.display = 'block';
                disconnectWalletButton.style.backgroundColor = 'red';

                // Get current network
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                if (chainId !== "0x89") {
                    await switchToPolygon();
                }

                await fetchASCBalance(signer, address);

            } catch (error) {
                console.error("Error:", error);
            }
        });

        disconnectWalletButton.addEventListener('click', () => {
            connectWalletButton.style.display = 'block';
            disconnectWalletButton.style.display = 'none';
            balanceDisplay.innerText = "N/A";
            console.log("Wallet disconnected");
        });

        async function switchToPolygon() {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x89' }], 
                });
                console.log("Switched to Polygon Network");
            } catch (error) {
                console.error("Failed to switch network:", error);
            }
        }

        async function fetchASCBalance(signer, userAddress) {
            try {
                const ascContract = new ethers.Contract(
                    '0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a',
                    ["function balanceOf(address owner) view returns (uint256)"],
                    provider
                );

                const balance = await ascContract.balanceOf(userAddress);
                const formattedBalance = ethers.utils.formatUnits(balance, 18);
                balanceDisplay.innerText = `${formattedBalance} ASC`;

                if (balance.gt(0)) {
                    await addASCToWallet();
                }

            } catch (error) {
                console.error("Error fetching balance:", error);
                balanceDisplay.innerText = "N/A";
            }
        }

        async function addASCToWallet() {
            try {
                await window.ethereum.request({
                    method: 'wallet_watchAsset',
                    params: {
                        type: 'ERC20',
                        options: {
                            address: '0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a',
                            symbol: 'ASC',
                            decimals: 18,
                            image: 'https://ascend.finance/logo.png'
                        },
                    },
                });
            } catch (error) {
                console.error('Error adding ASC to wallet:', error);
            }
        }
    } else {
        console.error("Non-Ethereum browser detected. Install MetaMask.");
    }

    // Fetch ASC Price from PolygonScan
    async function fetchASCPrice() {
        try {
            const POL_USD_FEED = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"; // Chainlink MATIC/USD Price Feed
            const ascPOLPoolAddress = "0xeF85494A8d24ED93cC0f7a405Bb5616BFF18C235"; // Verified LP Contract
    
            // Initialize provider
            const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com"); 
    
            // Fetch POL price from Chainlink
            const priceFeed = new ethers.Contract(
                POL_USD_FEED,
                ["function latestAnswer() view returns (int256)"],
                provider
            );
            const polPriceRaw = await priceFeed.latestAnswer();
            const polPrice = parseFloat(ethers.utils.formatUnits(polPriceRaw, 8)); // Chainlink uses 8 decimals
    
            // Fetch price data from Uniswap V3 LP
            const lpContract = new ethers.Contract(
                ascPOLPoolAddress,
                ["function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"],
                provider
            );
    
            // Get sqrtPriceX96
            const slot0 = await lpContract.slot0();
            const sqrtPriceX96 = slot0[0];
    
            // Convert sqrtPriceX96 to normal price
            const priceRatio = (sqrtPriceX96 / (2 ** 96)) ** 2; // Convert Uniswap V3 format
    
            // Get ASC price in USD
            const ascPriceUSD = priceRatio * polPrice;
    
            // Update UI
            const priceDisplay = document.getElementById('ascPrice');
            if (priceDisplay) {
                priceDisplay.innerText = `$${ascPriceUSD.toFixed(6)} per ASC`;
            }
        } catch (error) {
            console.error("Error fetching ASC price:", error);
            const priceDisplay = document.getElementById('ascPrice');
            if (priceDisplay) {
                priceDisplay.innerText = "Price unavailable";
            }
        }
    }
    
    // Fetch price on page load
    fetchASCPrice();

});


    
