document.addEventListener('DOMContentLoaded', () => {
    const rocket = document.querySelector('.rocket');
    const sections = document.querySelectorAll('.timeline-section');

    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        rocket.style.transform = `translateY(-${scrollPosition}px)`;
    });
});


const axios = require('axios');

const API_KEY = 'NPH7FU3VNPQYJ1GQD8B8SPS88XCHC1URX1';
const TOKEN_CONTRACT_ADDRESS = '0x4456b0f017f6bf9b0aa7a0ac3d3f224902a1937a';

const getTokenPrice = async () => {
    try {
        const response = await axios.get(`https://api.polygon.io/v1/token/${TOKEN_CONTRACT_ADDRESS}/price`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        console.log('Token Price:', response.data);
    } catch (error) {
        console.error('Error fetching token price:', error);
    }
};

getTokenPrice();
