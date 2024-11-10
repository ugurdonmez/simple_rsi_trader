const { RestClientV5 } = require('bybit-api')
const axios = require('axios')
const winston = require('winston')
const fs = require('fs')
const path = require('path')
const { RSI } = require('technicalindicators')
require('dotenv').config()


const apiKey = process.env.apiKey
const apiSecret = process.env.apiSecret
const discordWebhookUrl = process.env.discordWebhookUrl

// read setting file which located in the parent folder
let settings
try {
    const settingsPath = path.resolve(__dirname, '../settings_long.json')
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

    console.log(JSON.stringify(trade) + "testing")

    if (trade.exchange !== 'bybit') {
        return
    }

    if (trade.side !== 'long') {
        return
    }

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
            `Side: ${trade.side}`,
        ].join('\n')

        logger.info(notificationMessage)
        sendDiscordNotification(notificationMessage)

        // check close position
        if (positionSize > 0 && rsiValue > 70 && unrealisedPnl > 0) {
            logger.info('Close position')
            sendDiscordNotification(trade.ticker + 'Close position ' + trade.side)
            // close position
            closePosition(trade.ticker, positionSize);
        }

        // open new position
        if (positionSize === 0 && rsiValue < 40) {
            logger.info('Open position')
            sendDiscordNotification(trade.ticker + 'Open position ' + trade.side)
            addNewPosition(trade.ticker, trade.size)
        }

        // add to position
        if (positionSize > 0 && rsiValue < 30 && positionSize < trade.maxSize) {
            logger.info('Add to position')
            sendDiscordNotification(trade.ticker + ' Add to position' + trade.side)
            addNewPosition(trade.ticker, trade.size)
        }
    } catch (error) {
        logger.error('Error:', error)
        sendDiscordNotification('Error: place order ' + error)
    }
}

async function closePosition(ticker, positionSize) {
    try {
        const response = await bybit.submitOrder({
            category: 'linear',
            symbol: ticker,
            side: 'Sell',
            orderType: 'Market',
            qty: positionSize.toString(),
        })
        logger.info(JSON.stringify(response))
        sendDiscordNotification(ticker + ' closePosition ' + JSON.stringify(response))
    } catch (error) {
        logger.error('Error:', error)
        sendDiscordNotification('Error:' + ' closePosition ' +  + error)
    }
}

async function addNewPosition(ticker, size) {
    try {
        const response = await bybit.submitOrder({
            category: 'linear',
            symbol: ticker,
            side: 'Buy',
            orderType: 'Market',
            qty: size.toString(),
        })
        logger.info(JSON.stringify(response))
        sendDiscordNotification(ticker + ' addNewPosition ' + JSON.stringify(response))
    } catch (error) {
        logger.error('Error:', error)
        sendDiscordNotification('Error:' + ' addNewPosition ' +  + error)
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

        const rsiArray = RSI.calculate({ values: closePrices.reverse(), period: 14 })

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
        logger.info('Sent notification to Discord ' + message)
    } catch (error) {
        logger.error('Error:', error + ' ' + message)
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
