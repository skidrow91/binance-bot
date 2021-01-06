require('dotenv').config()
const Status = require('./status')
const Binance = require('./binance')

const PROFIT_RATE = parseFloat(process.env.PROFIT_RATE)
const AMOUNT_RATE = parseFloat(process.env.AMOUNT_RATE)
const LIMIT_TOTAL = parseFloat(process.env.LIMIT_TOTAL)
const STOP_RATE = parseFloat(process.env.STOP_RATE)

class Calculator {

  getLengthOfDecimalNumber(num) {
    return parseFloat(num).toString().split('.')[1].length || 0;
  }

  async calculateBuyAmount(symbol, currentPrice, balance) {
    // let fee = await getFeeTrading();
    let totalAmount = balance / currentPrice
    let amount = totalAmount * AMOUNT_RATE / 100;

    let total = amount * currentPrice

    if (total < LIMIT_TOTAL) {
      total = LIMIT_TOTAL + 0.001
      amount = total / currentPrice
    }

    let priceFilter = await Binance.getPriceFilter(symbol)

    let priceObj = this.formatPrice({
      price: 0,
      stopPrice: 0,
      quantity: amount
    }, priceFilter)

    return priceObj.quantity
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

    // console.log(priceObj)

    // if (type == 'BUY') {
    //   price -= profit;
    //   stopPrice = price - stop;
    // } else {
    //   price += profit;
    //   stopPrice = price + stop;
    // }

    return {price: priceObj.price, stopPrice: priceObj.stopPrice, amount: priceObj.amount}
  }

  async calculateProfitSell(symbol, currentPrice, balance) {
    let profit = currentPrice * PROFIT_RATE / 100
    let stop = profit * STOP_RATE / 100
    let price = parseFloat(currentPrice), stopPrice = parseFloat(currentPrice)

    price += profit;
    stopPrice = price + stop;

    let amount = balance

    let priceFilter = await Binance.getPriceFilter(symbol)

    let priceObj = this.formatPrice({
      price: price,
      stopPrice: stopPrice,
      quantity: amount
    }, priceFilter)

    return {price: priceObj.price, stopPrice: priceObj.stopPrice, amount: priceObj.amount}
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
}

module.exports = new Calculator();