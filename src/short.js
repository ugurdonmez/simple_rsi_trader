const { RestClientV5 } = require('bybit-api')
const talib = require('talib')
const axios = require('axios')
require('dotenv').config();


const apiKey = process.env.apiKey
const apiSecret = process.env.apiSecret
const ticker = "WLDUSDT"
const size = 10
const discordWebhookUrl = process.env.discordWebhookUrl

const bybit = new RestClientV5({
    key: apiKey,
    secret: apiSecret,
});


async function placeOrder() {
    try {

        // get position info
        const positionInfo = await bybit.getPositionInfo({
            category: 'linear',
            symbol: ticker,
        });

        const positionSize = Number(positionInfo.result.list[0].size);

        // get rsi value
        const rsiValue = await getRsiValue();

        const notificationMessage = [
            '------------------',
            `Time: ${new Date()}`,
            `RSI: ${rsiValue}`,
            `Position size: ${positionSize}`,
        ].join('\n');

        console.log(notificationMessage);
        sendDiscordNotification(notificationMessage);

        // check close position
        if (positionSize > 0 && rsiValue < 30) {
            console.log('Close position');
            sendDiscordNotification('Close position');
            // close position
            closePosition(positionSize);
        }

        // open new position
        if (positionSize === 0 && rsiValue > 60) {
            console.log('Open position');
            sendDiscordNotification('Open position');
            addNewPosition();
        } else {
            console.log('No action');
        }

        // add to position
        if (positionSize > 0 && rsiValue > 70) {
            console.log('Add to position');
            sendDiscordNotification('Add to position');
            // TODO: implement version 2;
        }
    } catch (error) {
        console.error('Error:', error);
        sendDiscordNotification('Error: ' + error);
    }
}

async function closePosition(positionSize) {
    try {
        const response = await bybit.submitOrder({
            category: 'linear',
            symbol: ticker,
            side: 'Buy',
            orderType: 'Market',
            qty: positionSize.toString(),
        });
        console.log(JSON.stringify(response));
        sendDiscordNotification(JSON.stringify(response));
    } catch (error) {
        console.error('Error:', error);
        sendDiscordNotification('Error: ' + error);
    }
}

async function addNewPosition() {
    try {
        const response = await bybit.submitOrder({
            category: 'linear',
            symbol: ticker,
            side: 'Sell',
            orderType: 'Market',
            qty: size.toString(),
        });
        console.log(JSON.stringify(response));
        sendDiscordNotification(JSON.stringify(response));
    } catch (error) {
        console.error('Error:', error);
        sendDiscordNotification('Error: ' + error);
    }
}

async function getRsiValue() {
    try {
        const candles = await bybit.getKline({
            symbol: ticker,
            interval: '15',
            limit: 100,
        });

        const closePrices = candles.result.list.map(candle => parseFloat(candle[4]));

        const reversed = closePrices.reverse();

        const result = talib.execute({
            name: 'RSI',
            startIdx: 0,
            endIdx: reversed.length - 1,
            inReal: reversed,
            optInTimePeriod: 14,
        });

        rsiArray = result.result.outReal;

        return rsiArray[rsiArray.length - 1];
    } catch (error) {
        console.error('Error:', error);
        sendDiscordNotification('Error: ' + error);
    }
}

async function sendDiscordNotification(message) {
    try {
        await axios.post(discordWebhookUrl, {
            content: message,
        });
        console.log('Notification sent to Discord.');
    } catch (error) {
        console.error('Failed to send notification to Discord:', error);
    }
}

// Run the function immediately when the script starts
placeOrder();

// Then run the function every 15 minutes
setInterval(placeOrder, 15 * 60 * 1000);
