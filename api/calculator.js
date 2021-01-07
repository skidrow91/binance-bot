require('dotenv').config()
const Status = require('./status')
const Binance = require('./binance')

const PROFIT_RATE = parseFloat(process.env.PROFIT_RATE)
const AMOUNT_RATE = parseFloat(process.env.AMOUNT_RATE)
const LIMIT_TOTAL = parseFloat(process.env.LIMIT_TOTAL)
const STOP_RATE = parseFloat(process.env.STOP_RATE)
const TRADE_FEE = parseFloat(process.env.TRADE_FEE)

class Calculator {

  getLengthOfDecimalNumber(num) {
    return parseFloat(num).toString().split('.')[1].length || 0;
  }

  generateNumber(num) {
    let n = 1
    return parseFloat(n.toString().padEnd((num+1), 0))
  }

  async calculateBuyAmount(symbol, currentPrice, balance) {
    // let fee = await getFeeTrading();
    let totalAmount = balance / currentPrice
    let amount = totalAmount * AMOUNT_RATE / 100;

    let total = amount * currentPrice

    if (total < LIMIT_TOTAL) {
      total = LIMIT_TOTAL
      amount = total / currentPrice
    }

    let priceFilter = await Binance.getPriceFilter(symbol)

    amount = this.formatQty(amount, priceFilter)

    /*let priceObj = this.formatPrice({
      price: 0,
      stopPrice: 0,
      quantity: amount
    }, priceFilter)

    return priceObj.quantity*/

    return amount
  }

  async calculateProfitBuy(symbol, currentPrice, balance) {
    let profit = currentPrice * PROFIT_RATE / 100
    let stop = profit * STOP_RATE / 100
    let price = parseFloat(currentPrice), stopPrice = parseFloat(currentPrice)

    price -= profit
    stopPrice = price - stop

    let amount = await this.calculateBuyAmount(symbol, price, balance)

    let priceFilter = await Binance.getPriceFilter(symbol)

    // console.log(priceFilter)

    let priceObj = this.formatPrice({
      price: price,
      stopPrice: stopPrice,
      quantity: amount
    }, priceFilter)

    priceObj.quantity = this.formatQty(amount, priceFilter)


    // console.log(priceObj)

    // if (type == 'BUY') {
    //   price -= profit;
    //   stopPrice = price - stop;
    // } else {
    //   price += profit;
    //   stopPrice = price + stop;
    // }

    return {price: priceObj.price, stopPrice: priceObj.stopPrice, quantity: priceObj.quantity}
  }

  async calculateProfitSell(symbol, currentPrice, balance) {
    let profit = currentPrice * PROFIT_RATE / 100
    let stop = profit * STOP_RATE / 100
    let price = parseFloat(currentPrice), stopPrice = parseFloat(currentPrice)

    price += profit;
    stopPrice = price + stop;

    let amount = balance - TRADE_FEE

    let priceFilter = await Binance.getPriceFilter(symbol)

    let priceObj = this.formatPrice({
      price: price,
      stopPrice: stopPrice,
      quantity: amount
    }, priceFilter)

    priceObj.quantity = this.formatQty(amount, priceFilter)

    return {price: priceObj.price, stopPrice: priceObj.stopPrice, quantity: priceObj.quantity}
  }

  formatPrice(priceData, priceFilter) {
    if (priceData.hasOwnProperty('price'))
    {
      priceData.price = parseFloat(priceData.price).toFixed(this.getLengthOfDecimalNumber(priceFilter.PRICE_FILTER.minPrice));
    }
    if (priceData.hasOwnProperty('stopPrice'))
    {
      priceData.stopPrice = parseFloat(priceData.stopPrice).toFixed(this.getLengthOfDecimalNumber(priceFilter.PRICE_FILTER.minPrice));
    }
    let qty = Math.floor(parseFloat(priceData.quantity)*100)/100
    priceData.quantity = qty.toFixed(this.getLengthOfDecimalNumber(priceFilter.LOT_SIZE.minQty));

    return priceData
  }

  formatQty(qty, priceFilter) {
    let number = this.generateNumber(this.getLengthOfDecimalNumber(priceFilter.LOT_SIZE.minQty))
    return Math.floor((qty*number)) / number
  }
}

module.exports = new Calculator();