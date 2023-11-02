const axios = require('axios');
const fs = require('fs');

const OUTPUT_FILE = 'tweets.txt';

async function getBinanceTopGainers() {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
        const data = response.data;

        // Filter to only include USDT pairs
        const usdtPairs = data.filter(pair => pair.symbol.endsWith('USDT'));

        // Sort the USDT pairs based on price change percentage
        const sortedData = usdtPairs.sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));
        return sortedData.slice(0, 5);  // Get top 5 USDT gainers
    } catch (error) {
        console.error('Error fetching data from Binance:', error);
    }
}


async function getGateTopGainers() {
    try {
        const response = await axios.get('https://data.gateapi.io/api2/1/tickers');
        const data = response.data;

        // Filter only USDT pairs and format the result
        const usdtPairs = Object.keys(data)
            .filter(pair => pair.endsWith('_usdt'))
            .map(pair => {
                return {
                    symbol: pair.toUpperCase().replace('_USDT', 'USDT'), // Adjusting the symbol format
                    priceChangePercent: data[pair].percentChange, // Renaming the key to match formatForTweet
                    ...data[pair]
                };
            });

        // Sort the USDT pairs based on percentage change
        const sortedData = usdtPairs.sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));
        return sortedData.slice(0, 5);  // Get top 5 USDT gainers
    } catch (error) {
        console.error('Error fetching data from Gate:', error);
    }
}


async function getKuCoinTopGainers() {
    try {
        const response = await axios.get('https://api.kucoin.com/api/v1/market/allTickers');
        const data = response.data.data.ticker;

        // Filter only USDT pairs
        const usdtPairs = data.filter(pair => pair.symbol.endsWith('USDT'))
            .map(pair => {
                return {
                    symbol: pair.symbol.replace('-', ''),  // Adjusting the symbol format
                    priceChangePercent: (parseFloat(pair.changeRate) * 100).toFixed(2), // Calculating percentage and formatting it
                    result: 'true', // Assuming true for all; adjust as necessary
                    last: pair.last,
                    lowestAsk: pair.sell, // Using the 'sell' for lowestAsk
                    highestBid: pair.buy, // Using the 'buy' for highestBid
                    percentChange: (parseFloat(pair.changeRate) * 100).toFixed(2), // Same as priceChangePercent; included for clarity
                    baseVolume: pair.vol,
                    quoteVolume: pair.volValue,
                    high24hr: pair.high,
                    low24hr: pair.low
                };
            });

        // Sort the USDT pairs based on percentage change
        const sortedData = usdtPairs.sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));
        return sortedData.slice(0, 5);  // Get top 5 USDT gainers
    } catch (error) {
        console.error('Error fetching data from Kucoin:', error);
    }
}

async function getOkxTopGainers() {
    try {
        const response = await axios.get('https://www.okex.com/api/spot/v3/instruments/ticker');
        const data = response.data;
        const sortedData = data.sort((a, b) => parseFloat(b.last_24h_change_rate) - parseFloat(a.last_24h_change_rate));
        return sortedData.slice(0, 24);
    } catch (error) {
        console.error('Error fetching data from OKX:', error);
    }
}

async function getMexCTopGainers() {
    try {
        const response = await axios.get('https://www.mexc.com/open/api/v2/market/ticker');
        const data = response.data.data;
        const sortedData = data.sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));
        return sortedData.slice(0, 24);
    } catch (error) {
        console.error('Error fetching data from MEXC:', error);
    }
}

function formatForTweet(coins, exc) {
    // Format the header
    let tweet = `Top Gainers in ${exc} Last 24 Hours 🚀\n`;

    // Append each coin's formatted data
    for (let coin of coins) {
        const percentageChange = parseFloat(coin.priceChangePercent || coin.changeRate || coin.last_24h_change_rate || coin.rate);
        tweet += `$${coin.symbol}: +${percentageChange}%\n`;
    }

    return tweet;
}

async function main() {
    const binanceGainers = await getBinanceTopGainers();
    const gateGainers = await getGateTopGainers();
    const kuCoinGainers = await getKuCoinTopGainers();
    // const okxGainers = await getOkxTopGainers();
    // const mexCGainers = await getMexCTopGainers();

    console.log('Binance gainers:', binanceGainers);
    console.log('Gate gainers:', gateGainers);

    const binanceTweet = formatForTweet(binanceGainers, "Binance");
    const gateTweet = formatForTweet(gateGainers, "Gate");
    const kucoinTweet = formatForTweet(kuCoinGainers, "Kucoin");



    const allTweets = [binanceTweet, gateTweet, kucoinTweet].join('\n');


    fs.writeFileSync(OUTPUT_FILE, allTweets);
    console.log(`Tweets saved to ${OUTPUT_FILE}`);
}

main();

main();
