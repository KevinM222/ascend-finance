document.addEventListener('DOMContentLoaded', async () => {
    let provider;
    const connectWalletButton = document.getElementById('connectWalletButton');
    const disconnectWalletButton = document.getElementById('disconnectWalletButton');
    const balanceDisplay = document.getElementById('tokenBalance'); 
    const priceDisplay = document.getElementById('tokenPrice');
    const totalValueDisplay = document.getElementById('totalValue');

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

                // Check Network
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                if (chainId !== "0x89") {
                    await switchToPolygon();
                }

                // Fetch ASC Balance and Price
                await fetchASCData(signer, address);

            } catch (error) {
                console.error("Error:", error);
            }
        });

        disconnectWalletButton.addEventListener('click', () => {
            connectWalletButton.style.display = 'block';
            disconnectWalletButton.style.display = 'none';
            balanceDisplay.innerText = "Your ASC Balance: N/A";
            totalValueDisplay.innerText = "Total Value: $0.00";
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

        async function fetchASCData(signer, userAddress) {
            try {
                // Fetch ASC Balance
                const ascContract = new ethers.Contract(
                    '0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a',
                    ["function balanceOf(address owner) view returns (uint256)"],
                    provider
                );

                const balance = await ascContract.balanceOf(userAddress);
                const formattedBalance = ethers.utils.formatUnits(balance, 18);
                balanceDisplay.innerText = `Your ASC Balance: ${formattedBalance}`;

                if (balance.gt(0)) {
                    await addASCToWallet();
                }

                // Fetch ASC Price and Update Total Value
                const ascPrice = await fetchASCPrice();
                const totalValue = formattedBalance * ascPrice;
                totalValueDisplay.innerText = `Total Value: $${totalValue.toFixed(2)}`;

            } catch (error) {
                console.error("Error fetching balance:", error);
                balanceDisplay.innerText = "Your ASC Balance: Unavailable";
                totalValueDisplay.innerText = "Total Value: $0.00";
            }
        }

        async function fetchASCPrice() {
            try {
                const POL_USD_FEED = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"; 
                const ascPOLPoolAddress = "0xeF85494A8d24ED93cC0f7a405Bb5616BFF18C235"; 
    
                // Initialize provider
                const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
    
                // 🔍 Fetch POL price from Chainlink
                const priceFeed = new ethers.Contract(
                    POL_USD_FEED,
                    ["function latestAnswer() view returns (int256)"],
                    provider
                );
                const polPriceRaw = await priceFeed.latestAnswer();
                const polPrice = parseFloat(ethers.utils.formatUnits(polPriceRaw, 8)); 
                console.log("✅ POL/USD Price:", polPrice);
    
                // 🔍 Fetch ASC price data from Uniswap V3 LP
                const lpContract = new ethers.Contract(
                    ascPOLPoolAddress,
                    ["function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint8, bool)"],
                    provider
                );
    
                const slot0 = await lpContract.slot0();
                const sqrtPriceX96 = slot0[0];
                console.log("✅ sqrtPriceX96 from LP:", sqrtPriceX96.toString());
    
                if (sqrtPriceX96 === 0) {
                    console.error("⚠️ No trades have happened yet.");
                    return 0;
                }
    
                const priceRatio = (sqrtPriceX96 / (2 ** 96)) ** 2;
                console.log("✅ ASC/POL Price Ratio:", priceRatio);
    
                const ascPriceUSD = priceRatio * polPrice;
                console.log("✅ ASC/USD Price:", ascPriceUSD);
    
                // ✅ Update UI with ASC price
                priceDisplay.innerText = `ASC Price: $${ascPriceUSD.toFixed(6)}`;
                return ascPriceUSD;
            } catch (error) {
                console.error("🚨 Error fetching ASC price:", error);
                priceDisplay.innerText = "ASC Price: Unavailable";
                return 0;
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

    // Fetch price on page load
    fetchASCPrice();
});
