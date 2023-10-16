const axios = require('axios');
const fs = require('fs');

const csvFilePath = 'gainers.csv';

const fetchAndSaveGainers = async () => {
  try {
    // Fetch daily gainers from Binance Spot API
    const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
    const usdtGainers = response.data
      .filter((ticker) => {
        // Filter tickers with USDT trading pairs
        return (
          parseFloat(ticker.priceChange) > 0 &&
          ticker.symbol.endsWith('USDT')
        );
      })
      .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent)) // Sort by descending priceChangePercent
      .slice(0, 10); // Get the top 10 gainers

    const currentTime = new Date().toISOString();
    const formattedData = usdtGainers.map((ticker) => ({
      symbol: ticker.symbol,
      priceChange: parseFloat(ticker.priceChange),
      priceChangePercent: parseFloat(ticker.priceChangePercent),
    }));

    // Append the data to the CSV file
    const csvData = formattedData.map((item) => `${item.symbol},${item.priceChange},${item.priceChangePercent}`).join(',');
    fs.appendFileSync(csvFilePath, `${currentTime},${csvData}\n`);

    console.log('Data appended to CSV.');
  } catch (error) {
    console.error(error);
  }
};

// Run the function initially when the script starts
fetchAndSaveGainers();

// Set an interval to run the function daily (in milliseconds)
const intervalInMilliseconds = 24 * 60 * 60 * 1000; // 24 hours
setInterval(fetchAndSaveGainers, intervalInMilliseconds);
