document.addEventListener('DOMContentLoaded', async () => {
    let provider;
    const connectWalletButton = document.getElementById('connectWalletButton');
    const disconnectWalletButton = document.getElementById('disconnectWalletButton');
    
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);

        connectWalletButton.addEventListener('click', async () => {
            try {
                // Request accounts from MetaMask
                await window.ethereum.request({ method: 'eth_requestAccounts' });

                // Re-initialize provider and signer after connection
                provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const address = await signer.getAddress();

                // Hide connect button and show disconnect button
                connectWalletButton.style.display = 'none';
                disconnectWalletButton.style.display = 'block';
                disconnectWalletButton.style.backgroundColor = 'red';

                // Ensure user is on the correct network (Polygon)
                const { chainId } = await provider.getNetwork();
                if (chainId !== 137) {  // 137 is the chain ID for Polygon Mainnet
                    alert("Please switch to the Polygon network.");
                    return;
                }

                // ASC Token Contract
                const ascContract = new ethers.Contract(
                    '0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a', // ASC Token Address
                    ["function balanceOf(address owner) view returns (uint256)"], 
                    provider
                );

                // Fetch balance
                const balance = await ascContract.balanceOf(address);
                const formattedBalance = ethers.utils.formatUnits(balance, 18);
                console.log('ASC Balance:', formattedBalance);

                // If user has ASC but it is not visible, prompt them to add ASC
                if (balance.gt(0)) {
                    addASCToWallet();
                }

            } catch (error) {
                if (error.code === 4001) {
                    console.error("User denied account access");
                } else {
                    console.error("Error fetching balance:", error);
                }
            }
        });

        disconnectWalletButton.addEventListener('click', () => {
            connectWalletButton.style.display = 'block';
            disconnectWalletButton.style.display = 'none';
            console.log("Wallet disconnected");
        });

        async function addASCToWallet() {
            try {
                const wasAdded = await window.ethereum.request({
                    method: 'wallet_watchAsset',
                    params: {
                        type: 'ERC20',
                        options: {
                            address: '0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a', // ASC Token Address
                            symbol: 'ASC',
                            decimals: 18,
                            image: 'https://ascend.finance/logo.png' // Replace with your token's logo URL
                        },
                    },
                });

                if (wasAdded) {
                    console.log('ASC Token added to wallet!');
                } else {
                    console.log('User rejected adding ASC to wallet.');
                }
            } catch (error) {
                console.error('Error adding ASC to wallet:', error);
            }
        }

    } else {
        console.error("Non-Ethereum browser detected. Install MetaMask.");
    }
});
