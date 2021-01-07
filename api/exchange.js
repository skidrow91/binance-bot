require('dotenv').config()
const fs = require('fs')
const Status = require('./status')
// const BinanceAPI = require('./binance_api')
const Binance = require('./binance')
const OrderModel = require('../model/order_model')
const QueueModel = require('../model/queue_model')
const Calculator = require('./calculator')
const Candle = require('./candle')

const PROFIT_RATE = parseFloat(process.env.PROFIT_RATE)
const AMOUNT_RATE = parseFloat(process.env.AMOUNT_RATE)
const LIMIT_TOTAL = parseFloat(process.env.LIMIT_TOTAL)
const LIMIT_ATTEMPT = parseFloat(process.env.LIMIT_ATTEMPT)
const TRADE_FEE = parseFloat(process.env.TRADE_FEE)

class Exchange {

  constructor() {
    this.symbols = this.loadSymbols()
    this.timeOffset = 0
  }

  loadSymbols() {
    let rawData = fs.readFileSync('./symbols.json')
    let symbols = JSON.parse(rawData)
    return symbols
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  run() {
    // console.log(this.symbols)
    let self = this
    try {
      this.symbols.symbols.forEach(async (symbol) => {
        console.log('Start #'+symbol)
        let orderData = await self.placeOrder(symbol);
        console.log(orderData);
        await self.sleep(20000);

        // console.log(symbol)
      })
    } catch (err) {
      console.log(err)
    }
  }

  async placeOrder(rawSymbol) {
    let symbol = rawSymbol.replace('/', '')
    let buysellsymbol = rawSymbol.split('/')

    let order = await this.checkOrder(symbol, Status.BUY, Status.NEW)

    if (!order) {
      order = await this.checkOrder(symbol, Status.SELL, Status.NEW)
    }

    // console.log(order)

    if (order) {

      if (order.side == Status.BUY) {
        let orderBinance = await Binance.getBinanceOrder(symbol, order.orderId);
        if (orderBinance.status == Status.FILLED) {

          await QueueModel.addQueue({symbol: symbol, price: order.price})

          order.status = orderBinance.status
          await order.save()

        } else if (orderBinance.status == Status.NEW) {
          let currentPrice = await Binance.getCurrentPrice(symbol)
          let rate = ((currentPrice - parseFloat(order.price)) / parseFloat(order.price)) * 100
          if (rate >= 1) {

            if (order.limitAttempt >= LIMIT_ATTEMPT) {
              orderBinance = await Binance.cancelOrder(symbol, order.orderId);
              order.status = orderBinance.status;
            } else {
              order.limitAttempt += 1;
            }
            await order.save();
          }

        } else {

          order.status = orderBinance.status
          await order.save()
        }

        return []

      } else {

        let orderBinance = await Binance.getBinanceOrder(symbol, order.orderId);
        if (orderBinance.status == Status.FILLED) {

          await QueueModel.delQueue(symbol)

          order.status = orderBinance.status
          await order.save()

        } else if (orderBinance.status == Status.NEW) {
          let currentPrice = await Binance.getCurrentPrice(symbol)
          let rate = ((currentPrice - parseFloat(order.price)) / parseFloat(order.price)) * 100
          if (rate >= 1) {

            if (order.limitAttempt >= LIMIT_ATTEMPT) {
              orderBinance = await Binance.cancelOrder(symbol, order.orderId);
              order.status = orderBinance.status;
            } else {
              order.limitAttempt += 1;
            }
            await order.save();
          }

        } else {

          order.status = orderBinance.status
          await order.save()
        }

        return []


      }

    // buy
    } else {

      let queue = await QueueModel.getQueue(symbol)
      // console.log(queue)

      // create sell
      if (queue) {
        let order = await this.checkOrder(symbol, Status.BUY, Status.FILLED)

        // sell
        if (order) {
          let balance = await Binance.getBalance(buysellsymbol, Status.SELL)

          let currentPrice = await Binance.getCurrentPrice(symbol)

          let ruleObj = await this.makeRule(symbol, Status.SELL, currentPrice, balance, order.price)

          if (ruleObj.type != Status.SKIPPED) {
            let orderObj = await this.sell(symbol, ruleObj.price, ruleObj.quantity, ruleObj.type, ruleObj.stopPrice)
            orderObj.price = currentPrice
            orderObj.limitAttempt = 0
            let order = await OrderModel.addOrder(orderObj)

            if (orderObj.status == Status.FILLED) {
              await QueueModel.delQueue(symbol)
            }

            return order
          }

        }

      // create buy
      } else {

        // get balance
        let balance = await Binance.getBalance(buysellsymbol, Status.BUY)
        // console.log(balance)
        // get current price
        let currentPrice = await Binance.getCurrentPrice(symbol)
        // console.log(currentPrice)
        // check trend (down / up)
        // if (down) --> //

        // if (up) ---> //

        // if (buy) ---> check rule buy
        // market

        // limit

        let ruleObj = await this.makeRule(symbol, Status.BUY, currentPrice, balance, 0)

        // console.log(ruleObj)
        // return false

        if (ruleObj.type != Status.SKIPPED) {
          let orderObj = await this.buy(symbol, ruleObj.price, ruleObj.quantity, ruleObj.type, ruleObj.stopPrice)
          orderObj.price = currentPrice
          orderObj.limitAttempt = 0
          console.log(orderObj)
          let order = await OrderModel.addOrder(orderObj)

          if (orderObj.status == Status.FILLED) {
            await QueueModel.addQueue({symbol: symbol, price: currentPrice})
          }

          return order
        }

        return []

      }
      // console.log(ruleObj)
    }
  }

  async checkOrder(symbol, side, status) {
    try {
      let orderData = {
        symbol: symbol,
        side: side,
        status: status
      }
      let order = await OrderModel.getOrder(orderData)
      return order
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }
  }

  getOrderDataPattern (symbol) {
    return {
      symbol: symbol,
      side: Status.BUY,
      type: Status.LIMIT,
      quantity: "",
      recvWindow: "60000",
      newOrderRespType: "FULL",
      timestamp: (Date.now() + this.timeOffset)
    }
  }

  async makeRule (symbol, side, currentPrice, balance, orderPrice = 0) {
    let now = Date.now();
    let from = Candle.addHours(now, -10);
    let candles = await Candle.getCandles(symbol, from, now);
    let avrPriceObj = Candle.getCandlesAvrPrice(candles);
    let avrPrice = parseFloat(avrPriceObj.avrPrice)

    let rules = {
      symbol: symbol,
      side: side,
      type: "",
      currentPrice: currentPrice,
      orderPrice: orderPrice,
      avrPrice: avrPrice,
      price: 0,
      stopPrice: 0,
      quantity: 0,
      balance: balance
    }

    // buy
    if (side == Status.BUY) {

      rules = await this.buyRule(rules)

    // sell
    } else {

      rules = await this.sellRule(rules)

    }

    return rules
  }


  async buyRule (rules) {

    let retRules = rules

    if (retRules.balance < LIMIT_TOTAL) {
      retRules.type = Status.SKIPPED
      return retRules
    }

    if (retRules.currentPrice <= retRules.avrPrice) {

      retRules.type = Status.MARKET

      let amount = await Calculator.calculateBuyAmount(retRules.symbol, retRules.currentPrice, retRules.balance)

      retRules.quantity = amount

    } else {

      let diffRate = (retRules.currentPrice - retRules.avrPrice) / retRules.avrPrice * 100

      if (diffRate <= 1) {

        retRules.type = Status.TAKE_PROFIT_LIMIT
        // calculate price, stopprice, profit, ....

        let obj = await Calculator.calculateProfitBuy(retRules.symbol, retRules.currentPrice, retRules.balance)

        // console.log(obj)

        retRules.price = obj.price
        retRules.stopPrice = obj.stopPrice
        retRules.quantity = obj.quantity

      } else {

        retRules.type = Status.SKIPPED

      }
    }

    return retRules
  }

  async sellRule (rules) {

    let retRules = rules

    if (retRules.currentPrice >= retRules.orderPrice) {

      let profitRate = (retRules.currentPrice - retRules.orderPrice) / retRules.orderPrice * 100

      // sell immediately
      if (profitRate >= PROFIT_RATE) {

        retRules.type = Status.MARKET

        let amount = retRules.balance - TRADE_FEE

        let priceFilter = await Binance.getPriceFilter(retRules.symbol)

        /*let priceObj = Calculator.formatPrice({
          price: 0,
          stopPrice: 0,
          quantity: amount
        }, priceFilter)*/

        amount = Calculator.formatQty(amount, priceFilter)

        retRules.quantity = amount
      // take profit or skipped
      } else {

        let diffRate = PROFIT_RATE - profitRate

        // take profit
        if (diffRate <= 1) {
          retRules.type = Status.TAKE_PROFIT_LIMIT
          // calculate price, stopprice, profit ...
          let obj = await Calculator.calculateProfitSell(retRules.symbol, retRules.currentPrice, retRules.balance)

          retRules.price = obj.price
          retRules.stopPrice = obj.stopPrice
          retRules.quantity = obj.quantity

        // skipped
        } else {
          retRules.type = Status.SKIPPED
        }
      }

    } else {

      // determine downtrend or uptrend

      retRules.type = Status.SKIPPED
    }

    return retRules
  }

  async buy (symbol, price, qty, type, stopPrice = 0) {
    try {
      let orderData = this.getOrderDataPattern(symbol)

      orderData.side = Status.BUY
      orderData.type = type

      if (type != Status.MARKET) {
        orderData.timeInForce = 'GTC'
      }
      orderData.quantity = parseFloat(qty);
      // orderData.price = parseFloat(price);

      if (type != Status.MARKET) {
        orderData.price = parseFloat(price)
      }

      if (type == Status.TAKE_PROFIT_LIMIT) {
        orderData.stopPrice = parseFloat(stopPrice)
      }

      orderData.timestamp = (Date.now() + this.timeOffset)

      // console.log(orderData);
      let response = await Binance.createOrder(orderData)
      return response
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }
  }

  async sell (symbol, price, qty, type, stopPrice = 0) {
    try {
      let orderData = this.getOrderDataPattern(symbol)

      orderData.side = Status.SELL
      orderData.type = type

      if (type != Status.MARKET) {
        orderData.timeInForce = 'GTC'
      }
      orderData.quantity = qty
      // orderData.price = parseFloat(price);

      if (type != Status.MARKET) {
        orderData.price = price
      }

      if (type == Status.TAKE_PROFIT_LIMIT) {
        orderData.stopPrice = stopPrice
      }

      orderData.timestamp = (Date.now() + this.timeOffset)

      // console.log(orderData);
      // return false;

      let response = await Binance.createOrder(orderData)
      return response
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }
  }

}

module.exports = new Exchange();