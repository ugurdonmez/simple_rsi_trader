const { RestClientV5 } = require('bybit-api')
const talib = require('talib')

const apiKey = ''
const apiSecret = ''
const ticker = "WLDUSDT"
const size = 10

const bybit = new RestClientV5({
    key: apiKey,
    secret: apiSecret,
});


async function placeOrder() {

    

    // check positions

    // if no position
        // can we place order?
            // yes - place order
            // no - continue

    // if position
        // can we close the position?
            // yes - close position
            // no - continue
        
        // can we add more to the position?
            // yes - add to position
            // no - continue


    // get position info for ticker by using api call 


    try {

        // get position info
        const positionInfo = await bybit.getPositionInfo({
            category: 'linear',
            symbol: ticker,
        });

        const positionSize = positionInfo.result.list[0].size;

        // get rsi value
        const rsiValue = await getRsiValue();

        console.log('RSI:', rsiValue);
        console.log('Position size:', positionSize);

        // check close position
        if (positionSize > 0 && rsiValue < 30) {
            console.log('Close position');
            // close position
            closePosition(positionSize);
        }

        // open new position
        if (positionSize === 0 && rsiValue > 70) {
            console.log('Open position');
            addNewPosition();
        }

        // add to position
        if (positionSize > 0 && rsiValue > 70) {
            console.log('Add to position');
            // TODO: implement version 2;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function closePosition(positionSize) {
    try {
        const response = await bybit.submitOrder({
            category: 'linear',
            symbol: 'WLDUSDT',
            side: 'Buy',
            orderType: 'Market',
            qty: positionSize,
        });
        console.log(JSON.stringify(response));
    } catch (error) {
        console.error('Error:', error);
    }
}

async function addNewPosition() {
    try {
        const response = await bybit.submitOrder({
            category: 'linear',
            symbol: 'WLDUSDT',
            side: 'Sell',
            orderType: 'Market',
            qty: '1',
        });
        console.log(JSON.stringify(response));
    } catch (error) {
        console.error('Error:', error);
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
    }
}

// Run the function immediately when the script starts
placeOrder();

// Then run the function every 15 minutes
setInterval(placeOrder, 15 * 60 * 1000);

