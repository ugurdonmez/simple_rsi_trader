// import * as Mexc from 'mexc-sdk';
const talib = require('talib')
const axios = require('axios')
const winston = require('winston')
const fs = require('fs')
const path = require('path')


require('dotenv').config()

const mexcAccessKey = process.env.mexcAccessKey
const mexcSecretKey = process.env.mexcSecretKey

// read setting file which located in the parent folder
let settings
try {
    const settingsPath = path.resolve(__dirname, '../settings.json')
    const rawData = fs.readFileSync(settingsPath)
    settings = JSON.parse(rawData)
} catch (error) {
    console.error('Error reading settings.json:', error)
    return
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }))
}

const base = 'https://api.mexc.com'
const futureBase = 'https://contract.mexc.com'


async function placeOrder(trade) {

    if (trade.exchange !== 'mexc') {
        return
    }

    logger.info("testing")
    logger.info(JSON.stringify(trade))

    try {
        const response = await axios.get(`${base}/api/v3/time`);

        

        
        if (response.data && response.status === 200) {
            logger.info(JSON.stringify(response.data))
            return response.data;
        } else {
            console.error('Failed to fetch data');
            return [];
        }
    } catch (error) {
        console.error('Error:', error);
        return [];
    }

}

async function getRsiValue(ticker) {

    const url = `https://contract.mexc.com/api/v1/contract/kline/${trade.ticker}?interval=Min15&start=1609992674&end=1609992694`

    const response = await axios.get(url);
    if (response.data && response.status === 200) {
        const closes = response.data.map(d => Number(d[4]))
        const rsi = await talib.execute({
            name: 'RSI',
            startIdx: 0,
            endIdx: closes.length - 1,
            inReal: closes,
            optInTimePeriod: 14,
        })
        return rsi.result.outReal[rsi.result.outReal.length - 1]
    } else {
        console.error('Failed to fetch data');
        return 0;
    }
}

settings.trades.forEach(trade => {
    placeOrder(trade);
    setInterval(() => placeOrder(trade), 5 * 60 * 1000);
});
