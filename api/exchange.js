require('dotenv').config();
const binanceAPI = require('./binance');
const OrderModel = require('../model/order');
const SYMBOL = process.env.SYMBOL.replace('/', '');
const AMOUNT = process.env.AMOUNT;

const BUYSELLSYMBOL = process.env.SYMBOL.split('/');

const threshold = 2;
const PROFIT_RATE = 10;
const STOP_RATE = 50;
let timeOffset = 0;

const ORDER_DATA = {
  symbol: SYMBOL,
  side: "SELL",
  type: "LIMIT",
  timeInForce: "GTC",
  quantity: "",
  price: "",
  recvWindow: "60000",
  newOrderRespType: "FULL",
  timestamp: (Date.now() + timeOffset)
}

const TYPES = {
  LIMIT: 'LIMIT',
  MARKET: 'MARKET',
  STOP_LOSS: 'STOP_LOSS',
  STOP_LOSS_LIMIT: 'STOP_LOSS_LIMIT',
  TAKE_PROFIT: 'TAKE_PROFIT',
  TAKE_PROFIT_LIMIT: 'TAKE_PROFIT_LIMIT',
  LIMIT_MAKER: 'LIMIT_MAKER'
}

const getCurrentPrice = async () => {
  let params = {
    symbol: SYMBOL
  }
  let priceObj = await binanceAPI.getCurrentPrice(params);
  return priceObj;
}

const calculateAmount = async (price, type = 'BUY') => {
  // let fee = await getFeeTrading();
  let symbol = (type == 'BUY') ? BUYSELLSYMBOL[1] : BUYSELLSYMBOL[0];
  let balance = await getBalance(symbol);
  let totalAmount = parseFloat(balance)/parseFloat(price);
  let amount = totalAmount * parseFloat(AMOUNT) / 100;
  // if (fee > 0) {
  //   amount += amount * fee;
  // }
  return amount;
}

const calculateProfit = (currentPrice, type = 'BUY') => {
  let profit = (parseFloat(currentPrice) * PROFIT_RATE) / 100;
  let stop = (parseFloat(profit) * STOP_RATE) / 100;
  let price = parseFloat(currentPrice), stopPrice = parseFloat(currentPrice);
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
  priceData.price = parseFloat(priceData.price).toFixed(getLengthOfDecimalNumber(priceFilter.PRICE_FILTER.minPrice));
  if (priceData.hasOwnProperty('stopPrice'))
  {
    priceData.stopPrice = parseFloat(priceData.stopPrice).toFixed(getLengthOfDecimalNumber(priceFilter.PRICE_FILTER.minPrice));
  }
  priceData.quantity = parseFloat(priceData.quantity).toFixed(getLengthOfDecimalNumber(priceFilter.LOT_SIZE.minQty));
  return priceData
}

const buy = async (price, qty, type = TYPES.LIMIT, stopPrice = 0) => {
  try {
    let orderData = ORDER_DATA;
    orderData.side = "BUY";
    orderData.type = type;
    orderData.quantity = parseFloat(qty);
    orderData.price = parseFloat(price);

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

const sell = async (price, qty, type = TYPES.LIMIT) => {
  let params = {
    symbol: SYMBOL,
    side: "SELL",
    type: type,
    timeInForce: "GTC",
    quantity: qty,
    price: price,
    recvWindow: "5000",
    timestamp: Date.now()
  }
  let response = await binanceAPI.newOrder(params);
  return response;
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
    ret = await OrderModel.findOne({symbol: symbol, status: "NEW"})
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
  let orderObj = {
    decision: 'BUY',
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
      if (orderBinance.status != order.status) {
        order.status = orderBinance.status;
        await order.save();
      }
      if (orderBinance.status == "FILLED") {
        orderObj.orderPrice = orderBinance.price
        orderObj.orderQty = orderBinance.origQty
        orderObj.decision = 'SELL';
      } else if (orderBinance.status == "NEW") {
        orderBinance = await cancelOrder(order);
        order.status = orderBinance.status;
        await order.save();
        orderObj.decision = 'SKIPPED';
      }
    }
  }

  return orderObj;
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

getFeeTrading = async () => {
  try {
    let params = {
      symbol: SYMBOL,
      recvWindow: "60000",
      timestamp: Date.now()
    }
    let tradeFeeObj = await binanceAPI.getFeeTrading(params);
    let fee = 0;
    if (tradeFeeObj.hasOwnProperty('tradeFee')) {
      tradeFeeObj.tradeFee.forEach((elm) => {
        if (elm.symbol == SYMBOL) {
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

module.exports.placeOrder = async () => {
  await updateTimeOffset();
  let orderObj = await makeDecision(SYMBOL);
  // console.log(orderObj);
  let priceFilter = await getPriceFilter(SYMBOL);
  // console.log(priceFilter);

  if (orderObj.decision == 'BUY') {
    // console.log(timeOffset);
    // let fixed = 4/1000;
    // let finalPrice = 1/100;
    let priceObj = await getCurrentPrice();
    // let price = parseFloat(priceObj.price)+fixed;

    let profitObj = calculateProfit(priceObj.price, "BUY");
    // console.log(profitObj);
    let price = profitObj.price;
    let stopPrice = profitObj.stopPrice;

    // let price = calculateProfit(priceObj.price, "BUY")
    // let stopPrice = parseFloat(priceObj.price)+finalPrice;
    // console.log(price);
    // return;
    // let amount = ((parseFloat(AMOUNT)/price)).toFixed(3);
    let amount = await calculateAmount(price, "BUY");
    let priceData = {
      price: price,
      stopPrice: stopPrice,
      quantity: amount
    };
    priceData = formatPrice(priceData, priceFilter);
    // console.log(priceData);
    // return amount;
    // get db with symbol and status open
    let buyData = await buy(priceData.price, priceData.quantity, TYPES.TAKE_PROFIT_LIMIT, priceData.stopPrice);
    // console.log(buyData)

    let orderData = await addOrder(buyData);

    return orderData;

  } else if (orderObj.decision == 'SELL') {
    let profitObj = calculateProfit(orderObj.orderPrice, "SELL");
    let price = profitObj.price;
    let stopPrice = profitObj.stopPrice;

    let amount = await calculateAmount(price, "SELL");
    // console.log(amount);

    let sellData = await sell(price, amount, TYPES.TAKE_PROFIT_LIMIT, stopPrice);
    // console.log(sellData)

    // let orderData = await addOrder(sellData);

    // return orderData;
  } else {
    return [];
  }




  // check price with current price
  // if >= threshold => sell
  // else => buy


}