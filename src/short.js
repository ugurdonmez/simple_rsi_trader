const { RestClientV5 } = require('bybit-api')
const talib = require('talib')
const axios = require('axios')
const winston = require('winston')
const fs = require('fs')
const path = require('path')
require('dotenv').config()


const apiKey = process.env.apiKey
const apiSecret = process.env.apiSecret
const discordWebhookUrl = process.env.discordWebhookUrl

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


const bybit = new RestClientV5({
    key: apiKey,
    secret: apiSecret,
})

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


async function placeOrder(trade) {
    try {
        // get position info
        const positionInfo = await bybit.getPositionInfo({
            category: 'linear',
            symbol: trade.ticker,
        })

        const positionSize = Number(positionInfo.result.list[0].size)
        const unrealisedPnl = Number(positionInfo.result.list[0].unrealisedPnl)

        // get rsi value
        const rsiValue = await getRsiValue(trade.ticker)

        const notificationMessage = [
            '------------------',
            `Ticker: ${trade.ticker}`,
            `Time: ${new Date()}`,
            `RSI: ${rsiValue}`,
            `Position size: ${positionSize}`,
        ].join('\n')

        logger.info(notificationMessage)
        sendDiscordNotification(notificationMessage)

        // check close position
        if (positionSize > 0 && rsiValue < 30 && unrealisedPnl > 0) {
            logger.info('Close position')
            sendDiscordNotification('Close position')
            // close position
            closePosition(trade.ticker, positionSize);
        }

        // open new position
        if (positionSize === 0 && rsiValue > 60) {
            logger.info('Open position')
            sendDiscordNotification('Open position')
            addNewPosition(trade.ticker, trade.size)
        }

        // add to position
        if (positionSize > 0 && rsiValue > 70 && positionSize < trade.maxSize) {
            logger.info('Add to position')
            sendDiscordNotification('Add to position');
            addNewPosition(trade.ticker, trade.size)
        }
    } catch (error) {
        logger.error('Error:', error)
        sendDiscordNotification('Error: ' + error)
    }
}

async function closePosition(ticker, positionSize) {
    try {
        const response = await bybit.submitOrder({
            category: 'linear',
            symbol: ticker,
            side: 'Buy',
            orderType: 'Market',
            qty: positionSize.toString(),
        })
        logger.info(JSON.stringify(response))
        sendDiscordNotification(JSON.stringify(response))
    } catch (error) {
        logger.error('Error:', error)
        sendDiscordNotification('Error: ' + error)
    }
}

async function addNewPosition(ticker, size) {
    try {
        const response = await bybit.submitOrder({
            category: 'linear',
            symbol: ticker,
            side: 'Sell',
            orderType: 'Market',
            qty: size.toString(),
        })
        logger.info(JSON.stringify(response))
        sendDiscordNotification(JSON.stringify(response))
    } catch (error) {
        logger.error('Error:', error)
        sendDiscordNotification('Error: ' + error)
    }
}

async function getRsiValue(ticker) {
    try {
        const candles = await bybit.getKline({
            symbol: ticker,
            interval: '15',
            limit: 100,
        })

        const closePrices = candles.result.list.map(candle => parseFloat(candle[4]))

        const reversed = closePrices.reverse()

        const result = talib.execute({
            name: 'RSI',
            startIdx: 0,
            endIdx: reversed.length - 1,
            inReal: reversed,
            optInTimePeriod: 14,
        })

        rsiArray = result.result.outReal

        return rsiArray[rsiArray.length - 1]
    } catch (error) {
        logger.error('Error:', error)
        sendDiscordNotification('Error: ' + error)
    }
}

async function sendDiscordNotification(message) {
    try {
        await axios.post(discordWebhookUrl, {
            content: message,
        });
        logger.info('Sent notification to Discord')
    } catch (error) {
        logger.error('Error:', error)
    }
}

settings.trades.forEach(trade => {
    placeOrder(trade);
    setInterval(() => placeOrder(trade), 5 * 60 * 1000);
});


// Run the function immediately when the script starts
// placeOrder();

// Then run the function every 15 minutes
// setInterval(placeOrder, 15 * 60 * 1000);
