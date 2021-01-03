require('dotenv').config();
const binanceAPI = require('./binance');
const OrderModel = require('../model/order');
const SYMBOL = process.env.SYMBOL.replace('/', '');
const AMOUNT = process.env.AMOUNT;

const BUYSELLSYMBOL = process.env.SYMBOL.split('/');

const Candle = require('./candle');

const LIMIT_ATTEMPT = process.env.LIMIT_ATTEMPT;

const threshold = 2;
const PROFIT_RATE = 2;
const STOP_RATE = 10;
let timeOffset = 0;

// const ORDER_DATA = {
//   symbol: SYMBOL,
//   side: "SELL",
//   type: "LIMIT",
//   quantity: "",
//   recvWindow: "60000",
//   newOrderRespType: "FULL",
//   timestamp: (Date.now() + timeOffset)
// }

const TYPES = {
  LIMIT: 'LIMIT',
  MARKET: 'MARKET',
  STOP_LOSS: 'STOP_LOSS',
  STOP_LOSS_LIMIT: 'STOP_LOSS_LIMIT',
  TAKE_PROFIT: 'TAKE_PROFIT',
  TAKE_PROFIT_LIMIT: 'TAKE_PROFIT_LIMIT',
  LIMIT_MAKER: 'LIMIT_MAKER'
}

const getCurrentPrice = async (symbol) => {
  let params = {
    symbol: symbol
  }
  let priceObj = await binanceAPI.getCurrentPrice(params);
  return priceObj;
}

const calculateAmount = async (buysellsymbol ,price, type = 'BUY') => {
  // let fee = await getFeeTrading();
  let symbol = (type == 'BUY') ? buysellsymbol[1] : buysellsymbol[0];
  let balance = await getBalance(symbol);
  let amount = 0;
  if (type == 'BUY') {
    let totalAmount = parseFloat(balance)/parseFloat(price);
    amount = totalAmount * parseFloat(AMOUNT) / 100;
  } else {
    amount = balance;
  }
  // console.log(totalAmount);
  // console.log(balance);
  // console.log(price);
  // console.log(amount);
  // if (fee > 0) {
  //   amount += amount * fee;
  // }
  return amount;
}

const calculateProfit = (currentPrice, type = 'BUY') => {
  let profit = (parseFloat(currentPrice) * PROFIT_RATE) / 100;
  let stop = (parseFloat(profit) * STOP_RATE) / 100;
  let price = parseFloat(currentPrice), stopPrice = parseFloat(currentPrice);
  // console.log(profit);
  // console.log(price);
  // console.log(stopPrice);
  if (type == 'BUY') {
    price -= profit;
    stopPrice = price - stop;
  } else {
    price += profit;
    stopPrice = price + stop;
  }
  // console.log(price);
  // console.log(stopPrice);

  return {price: price, stopPrice: stopPrice};
}

const getLengthOfDecimalNumber = (num) => {
  return parseFloat(num).toString().split('.')[1].length || 0;
}

const getPriceFilter = async (symbol) => {
  let marketInfo = await binanceAPI.exchangeInfo(symbol);
  let retData = {};
  let filters = marketInfo.filters;
  filters.forEach((elm) => {
    if (elm.filterType == 'PRICE_FILTER') {
      retData.PRICE_FILTER = {
        minPrice: elm.minPrice,
        maxPrice: elm.maxPrice,
        tickSize: elm.tickSize
      }
    } else if (elm.filterType == 'LOT_SIZE') {
      retData.LOT_SIZE = {
        minQty: elm.minQty,
        maxQty: elm.maxQty,
        stepSize: elm.stepSize
      }
    }
  });
  return retData;
}

const formatPrice = (priceData, priceFilter) => {
  if (priceData.hasOwnProperty('price'))
  {
    priceData.price = parseFloat(priceData.price).toFixed(getLengthOfDecimalNumber(priceFilter.PRICE_FILTER.minPrice));
  }
  if (priceData.hasOwnProperty('stopPrice'))
  {
    priceData.stopPrice = parseFloat(priceData.stopPrice).toFixed(getLengthOfDecimalNumber(priceFilter.PRICE_FILTER.minPrice));
  }
  let qty = Math.floor(parseFloat(priceData.quantity)*100)/100
  priceData.quantity = qty.toFixed(getLengthOfDecimalNumber(priceFilter.LOT_SIZE.minQty));

  return priceData
}

const buy = async (symbol, price, qty, type = TYPES.LIMIT, stopPrice = 0) => {
  try {
    let orderData = {
      symbol: symbol,
      side: "BUY",
      type: "LIMIT",
      quantity: "",
      recvWindow: "60000",
      newOrderRespType: "FULL",
      timestamp: (Date.now() + timeOffset)
    };
    orderData.side = "BUY";
    orderData.type = type;

    if (type != TYPES.MARKET) {
      orderData.timeInForce = 'GTC';
    }
    orderData.quantity = parseFloat(qty);
    // orderData.price = parseFloat(price);

    if (type != TYPES.MARKET) {
      orderData.price = parseFloat(price);
    }

    if (type == TYPES.TAKE_PROFIT_LIMIT) {
      orderData.stopPrice = parseFloat(stopPrice);
    }

    orderData.timestamp = (Date.now() + timeOffset);

    // console.log(orderData);
    let response = await binanceAPI.newOrder(orderData);
    return response;
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
}

const sell = async (symbol, price, qty, type = TYPES.LIMIT, stopPrice = 0) => {
  try {
    // let orderData = ORDER_DATA;
    let orderData = {
      symbol: symbol,
      side: "SELL",
      type: "LIMIT",
      quantity: "",
      recvWindow: "60000",
      newOrderRespType: "FULL",
      timestamp: (Date.now() + timeOffset)
    };
    orderData.side = "SELL";
    orderData.type = type;

    if (type != TYPES.MARKET) {
      orderData.timeInForce = 'GTC';
    }
    orderData.quantity = qty;
    // orderData.price = parseFloat(price);

    if (type != TYPES.MARKET) {
      orderData.price = price;
    }

    if (type == TYPES.TAKE_PROFIT_LIMIT) {
      orderData.stopPrice = stopPrice;
    }

    orderData.timestamp = (Date.now() + timeOffset);

    // console.log(orderData);
    // return false;

    let response = await binanceAPI.newOrder(orderData);
    return response;
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
}

const addOrder = async (data) => {
  let ret
  try {
    ret = await OrderModel.find(data)
    if (ret.length > 0) {
      //
    } else {
      ret = await OrderModel.create(data)
      console.log(ret)
    }
  } catch (err) {
    console.log(err)
    throw new Error(err)
  }

  return ret
}

const getOrder = async (symbol) => {
  let ret = []
  try {
    ret = await OrderModel.findOne({symbol: symbol, side: 'BUY', localStatus: 'OPEN'}).sort({"_id": -1})
  } catch (err) {
    console.log(err)
    throw new Error(err)
  }

  return ret
}

const cancelOrder = async (data) => {
  try {
    let params = {
      symbol: data.symbol,
      orderId: data.orderId,
      recvWindow: "60000",
      timestamp: Date.now()
    }

    let retData = await binanceAPI.cancelOrder(params);
    return retData;
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
}

const makeDecision = async (symbol) => {
  let order = await getOrder(symbol);
  // console.log(order);
  // return false;
  let orderObj = {
    decision: 'BUY',
    type: TYPES.TAKE_PROFIT_LIMIT,
    currentPrice: 0,
    orderQty: 0,
    orderPrice: 0
  };
  if (order) {
    if (order.symbol == symbol) {
      let params = {
        symbol: symbol,
        orderId: order.orderId,
        recvWindow: "60000",
        timestamp: Date.now()
      }
      orderBinance = await binanceAPI.queryOrder(params);
      // console.log(orderBinance);
      if (orderBinance.status != order.status) {
        order.status = orderBinance.status;
        await order.save();
      }
      if (orderBinance.status == "FILLED") {
        orderObj.orderPrice = order.price
        orderObj.orderQty = orderBinance.origQty
        orderObj.decision = 'SELL';

        order.status = orderBinance.status;

        await order.save();


        let currentPriceObj = await getCurrentPrice(symbol);

        let decisionObj = shouldSell(parseFloat(orderObj.orderPrice), parseFloat(currentPriceObj.price));

        orderObj.type = decisionObj.type;

        // console.log(currentPriceObj);
        // console.log(decisionObj);
        // return false;

        if (decisionObj.decision == 'SKIPPED') {
          orderObj.decision = decisionObj.decision;
        }

      } else if (orderBinance.status == "NEW") {
        let currentPriceObj = await getCurrentPrice(symbol);
        let rate = ((parseFloat(currentPriceObj.price) - parseFloat(order.price)) / parseFloat(order.price)) * 100
        if (rate >= 1) {
          // console.log(rate);
          // console.log(order);
          if (order.limitAttempt >= LIMIT_ATTEMPT) {
            orderBinance = await cancelOrder(order);
            order.status = orderBinance.status;
            order.localStatus = orderBinance.status;
          } else {
            order.limitAttempt += 1;
          }
          await order.save();
        }
        orderObj.decision = 'SKIPPED';
      }
    }
  } else {
    let now = Date.now();
    let from = Candle.addHours(now, -10);
    let candles = await Candle.getCandles(symbol, from, now);
    let currentPriceObj = await getCurrentPrice(symbol);
    let avrPriceObj = Candle.getCandlesAvrPrice(candles);
    // if (!(parseFloat(currentPriceObj.price) <= parseFloat(avrPriceObj.avrPrice) )) {
    //   orderObj.decision = 'SKIPPED';
    // }

    let decisionObj = shouldBuy(parseFloat(currentPriceObj.price), parseFloat(avrPriceObj.avrPrice));
    orderObj.decision = decisionObj.decision;
    if (decisionObj.decision == 'BUY') {
      orderObj.type = decisionObj.type;
      orderObj.currentPrice = currentPriceObj.price;
    }
    // console.log(decisionObj);

    // console.log(priceObj.avrLowPrice);
    // console.log(priceObj.avrHighPrice);
    // console.log(priceObj.avrPrice);
  }

  return orderObj;
}

const shouldBuy = (currentPrice, comparePrice) => {
  let decisionObj = {
    decision: 'BUY',
    type: TYPES.TAKE_PROFIT_LIMIT
  }
  if (currentPrice <= comparePrice) {
    decisionObj.type = TYPES.MARKET
  } else {
    let rate = ((currentPrice - comparePrice) / currentPrice) * 100
    if (rate >= 1) {
      // skipped
      decisionObj.decision = 'SKIPPED'
    } else {
      // buy take profit limit
      decisionObj.type = TYPES.TAKE_PROFIT_LIMIT
    }
  }

  return decisionObj;
}

const shouldSell = (orderPrice, currentPrice) => {
  let profitRate = PROFIT_RATE;
  let decisionObj = {
    decision: 'SELL',
    type: TYPES.TAKE_PROFIT_LIMIT
  }
  if (orderPrice >= currentPrice) {
    decisionObj.decision = 'SKIPPED'
  } else {
    let rate = ((currentPrice - orderPrice) / currentPrice) * 100
    if (rate >= parseFloat(profitRate)) {
      decisionObj.type = TYPES.MARKET
    } else if ((parseFloat(profitRate)-rate) <= 1) {
      // buy take profit limit
      decisionObj.type = TYPES.TAKE_PROFIT_LIMIT
    } else {
      // skipped
      decisionObj.decision = 'SKIPPED';
    }
  }
  return decisionObj;
}

const updateTimeOffset = async () => {
  try {
    let timeObj = await binanceAPI.getServerTime();
    if (timeObj.hasOwnProperty('serverTime')) {
      timeOffset = timeObj.serverTime - Date.now();
    }
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
}

getFeeTrading = async (symbol) => {
  try {
    let params = {
      symbol: symbol,
      recvWindow: "60000",
      timestamp: Date.now()
    }
    // console.log(params);
    let tradeFeeObj = await binanceAPI.getFeeTrading(params);
    // console.log(tradeFeeObj);
    let fee = 0;
    if (tradeFeeObj.hasOwnProperty('tradeFee')) {
      tradeFeeObj.tradeFee.forEach((elm) => {
        if (elm.symbol == symbol) {
          fee = elm.maker;
        }
      })
    }
    /*console.log(fee);*/
    return fee;
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
}

getBalance = async (symbol) => {
  try {
    let params = {
      recvWindow: "60000",
      timestamp: Date.now()
    }
    let balance = 0;
    let accountInfo = await binanceAPI.getAccountInfo(params);
    if (accountInfo.hasOwnProperty('balances')) {
      accountInfo.balances.forEach((elm, idx) => {
        if (elm.asset == symbol) {
          balance = elm.free;
        }
      });
    }
    return balance;
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
}

module.exports.placeOrder = async (rawSymbol) => {
  // let now = Date.now();
  // let from = Candle.addHours(now, -10);
  // let candles = await Candle.getCandles(SYMBOL, from, now);
  // candles.forEach((candle) => {
  //   console.log(Candle.parseCandle(candle));
  // });
  // let priceObj = Candle.getCandlesAvrPrice(candles);
  // console.log(priceObj.avrLowPrice);
  // console.log(priceObj.avrHighPrice);
  // console.log(priceObj.avrPrice);
  // return false;

  let symbol = rawSymbol.replace('/', '');
  let buysellsymbol = rawSymbol.split('/');


  await updateTimeOffset();
  let orderObj = await makeDecision(symbol);

  // console.log(orderObj);
  // return false;

  if (orderObj.decision == 'BUY') {
    // console.log(timeOffset);
    // let fixed = 4/1000;
    // let finalPrice = 1/100;
    // let priceObj = await getCurrentPrice();
    // let price = parseFloat(priceObj.price)+fixed;

    let orderData = [];

    if (orderObj.type == TYPES.MARKET) {
      let priceFilter = await getPriceFilter(symbol);
      let amount = await calculateAmount(buysellsymbol, orderObj.currentPrice, "BUY");

      let priceData = {
        quantity: amount
      };

      priceData = formatPrice(priceData, priceFilter);

      let buyData = await buy(symbol, 0, priceData.quantity, TYPES.MARKET, 0);
      buyData.localStatus = 'OPEN';
      buyData.price = orderObj.currentPrice;
      buyData.limitAttempt = 0;

      orderData = await addOrder(buyData);
    } else {

      let profitObj = calculateProfit(orderObj.currentPrice, "BUY");

      // console.log(profitObj);
      let price = profitObj.price;
      let stopPrice = profitObj.stopPrice;

      // let price = calculateProfit(priceObj.price, "BUY")
      // let stopPrice = parseFloat(priceObj.price)+finalPrice;
      // console.log(price);
      // return;
      // let amount = ((parseFloat(AMOUNT)/price)).toFixed(3);
      let priceFilter = await getPriceFilter(symbol);
    // console.log(priceFilter);
      let amount = await calculateAmount(buysellsymbol, price, "BUY");
      let priceData = {
        price: price,
        stopPrice: stopPrice,
        quantity: amount
      };
      priceData = formatPrice(priceData, priceFilter);
      console.log(priceData);
      // return false;
      // return amount;
      // get db with symbol and status open
      let buyData = await buy(symbol, priceData.price, priceData.quantity, orderObj.type, priceData.stopPrice);
      buyData.localStatus = 'OPEN';
      buyData.limitAttempt = 0;
      // console.log(buyData)
      orderData = await addOrder(buyData);
    }

    return orderData;

  } else if (orderObj.decision == 'SELL') {

    let orderData = [];

    if (orderObj.type == TYPES.MARKET) {

      let amount = await calculateAmount(buysellsymbol, 0, "SELL");

      let priceFilter = await getPriceFilter(symbol);

      let priceData = {
        quantity: amount
      };

      priceData = formatPrice(priceData, priceFilter);

      // console.log(amount);
      // console.log(priceData);
      // return false;

      let sellData = await sell(symbol, 0, priceData.quantity, orderObj.type, 0);

      orderData = await addOrder(sellData);

    } else {

      let profitObj = calculateProfit(orderObj.orderPrice, "SELL");
      // console.log(profitObj);
      // return false;
      let price = profitObj.price;
      let stopPrice = profitObj.stopPrice;

      let priceFilter = await getPriceFilter(symbol);

      let amount = await calculateAmount(buysellsymbol, price, "SELL");
      let priceData = {
        price: price,
        stopPrice: stopPrice,
        quantity: amount
      };
      priceData = formatPrice(priceData, priceFilter);
      // console.log(priceData);
      // return false;

      let sellData = await sell(symbol, priceData.price, priceData.quantity, orderObj.type, priceData.stopPrice);
      // console.log(sellData)
      // return false;

      orderData = await addOrder(sellData);

    }

    return orderData;

  } else {
    return [];
  }

  // check price with current price
  // if >= threshold => sell
  // else => buy


}