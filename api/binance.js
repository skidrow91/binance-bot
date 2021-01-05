require('dotenv').config();
const BinanceAPI = require('./binance_api');
const Status = require('./status')

class Binance {

  async getTimeOffset () {
    try {
      let timeObj = await BinanceAPI.getServerTime()
      if (timeObj.hasOwnProperty('serverTime')) {
        timeOffset = timeObj.serverTime - Date.now()
        return timeOffset
      }
      return 0
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }
  }

  // symbol = USDT / DOT / ...
  async getBalance (balanceSymbol, type) {
    try {
      let symbol = (type == Status.BUY) ? balanceSymbol[1] : balanceSymbol[0];
      let params = {
        recvWindow: "60000",
        timestamp: Date.now()
      }
      let balance = 0;
      let accountInfo = await BinanceAPI.getAccountInfo(params);
      if (accountInfo.hasOwnProperty('balances')) {
        accountInfo.balances.forEach((elm, idx) => {
          if (elm.asset == symbol) {
            balance = elm.free
          }
        });
      }
      return balance
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }
  }

  async getCurrentPrice (symbol) {
    try {
      let params = {
        symbol: symbol
      }
      let priceObj = await BinanceAPI.getCurrentPrice(params)
      return parseFloat(priceObj.price)
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }
  }

  async createOrder (orderData) {
    try {
      let response = await BinanceAPI.newOrder(orderData)
      return response
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }
  }

  async getPriceFilter (symbol) {
    let marketInfo = await BinanceAPI.exchangeInfo(symbol);
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

  async getOrder (symbol, orderId) {
    try {
      let params = {
        symbol: symbol,
        orderId: orderId,
        recvWindow: "60000",
        timestamp: Date.now()
      }
      orderBinance = await BinanceAPI.queryOrder(params);
      return orderBinance;
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }
  }

  async cancelOrder (symbol, orderId) {
    try {
      let params = {
        symbol: symbol,
        orderId: orderId,
        recvWindow: "60000",
        timestamp: Date.now()
      }

      let retData = await BinanceAPI.cancelOrder(params);
      return retData;
    } catch (err) {
      console.log(err);
      throw new Error(err);
    }
  }

}

module.exports = new Binance()