require('dotenv').config();
var crypto = require('crypto');
const request = require('./request')

const SECRET_KEY = process.env.H_SECRET_KEY;

const endpoints = {
  exchange: 'exchangeInfo',
  orderbook: 'depth',
  order: 'order',
  openorders: 'openOrders',
  avgprice: 'avgPrice',
  price: 'ticker/price',
  pricehour: 'ticker/24hr',
  time: 'time',
  account: 'account',
  klines: 'klines',
  feetrading: 'tradeFee.html',
  assetdetail: 'assetDetail.html'
}

sign = (params) => {
  let query = '';
  for (let key in params) {
    if (params.hasOwnProperty(key)) {
      if (query.length > 0) {
        query += '&';
      }
      query += key+'='+params[key];
    }
  }

  // console.log(query);

  let signature = crypto.createHmac("sha256", SECRET_KEY).update(query).digest("hex");

  return signature;
}

module.exports.getAccountInfo = async (params) => {
  let data;
  try {
    params.signature = sign(params);
    let response = await request.get(endpoints.account, params);
    data = response.data
  } catch (err) {
    console.log(err)
    throw new Error(err)
  }
  return data;
}

module.exports.getkKLines = async (params) => {
  let data;
  try {
    let response = await request.get(endpoints.klines, params);
    data = response.data
  } catch (err) {
    console.log(err);
    throw new Error(err)
  }
  return data;
}

module.exports.exchangeInfo = async (symbol) => {
  let data;
  try {
    let response = await request.get(endpoints.exchange, {});
    let symbols = response.data;
    // console.log(symbols);
    if (symbol.length > 0) {
      symbols.symbols.forEach((elm) => {
        if (elm.symbol == symbol)
        {
          data = elm;
        }
      })
    } else {
      data = symbols.symbol;
    }
  } catch (err) {
    throw new Error(err)
  }
  return data;
}

module.exports.orderBook = async (params) => {
  let data;
  try {
    let response = await request.get(endpoints.orderbook, params);
    data = response.data
  } catch (err) {
    throw new Error(err)
  }
  return data;
}

module.exports.newOrder = async (params) => {
  let data;
  try {
    params.signature = sign(params);
    // console.log(params);
    let response = await request.post(endpoints.order, params);
    data = response.data
  } catch (err) {
    console.log(err)
    throw new Error(err)
  }
  return data;
}

module.exports.queryOrder = async (params) => {
  let data;
  try {
    params.signature = sign(params);
    // console.log(params);
    // return false;
    let response = await request.get(endpoints.order, params);
    data = response.data
  } catch (err) {
    console.log(err)
    throw new Error(err)
  }
  return data;
}

module.exports.cancelOrder = async (params) => {
  let data;
  try {
    params.signature = sign(params);
    let response = await request.delete(endpoints.order, params);
    data = response.data
  } catch (err) {
    console.log(err);
    throw new Error(err)
  }
  return data;
}

module.exports.cancelAllOrders = async (params) => {
  let data;
  try {
    params.signature = sign(params);
    let response = await request.delete(endpoints.openorders, params);
    data = response.data
  } catch (err) {
    console.log(err);
    throw new Error(err)
  }
  return data;
}

module.exports.openOrders = async (params) => {
  let data;
  try {
    let response = await request.get(endpoints.openorders, params);
    data = response.data
  } catch (err) {
    throw new Error(err)
  }
  return data;
}

module.exports.getAvPrice = async (params) => {
  let data;
  try {
    let response = await request.get(endpoints.avgprice, params);
    data = response.data
  } catch (err) {
    throw new Error(err)
  }
  return data;
}

module.exports.getCurrentPrice = async (params) => {
  let data;
  try {
    let response = await request.get(endpoints.price, params);
    data = response.data
  } catch (err) {
    throw new Error(err)
  }
  return data;
}

module.exports.getFeeTrading = async (params) => {
  let data;
  try {
    params.signature = sign(params);
    let response = await request.getW(endpoints.feetrading, params);
    data = response.data
  } catch (err) {
    console.log(err);
    throw new Error(err)
  }
  return data;
}

module.exports.getAssetDetail = async (params) => {
  let data;
  try {
    params.signature = sign(params);
    let response = await request.getW(endpoints.assetdetail, params);
    data = response.data
  } catch (err) {
    throw new Error(err)
  }
  return data;
}

module.exports.getPrice24h = async (params) => {
  let data;
  try {
    let response = await request.get(endpoints.pricehour, params);
    data = response.data
  } catch (err) {
    throw new Error(err)
  }
  return data;
}

module.exports.getServerTime = async () => {
  let data;
  try {
    let response = await request.get(endpoints.time, {});
    data = response.data
  } catch (err) {
    throw new Error(err)
  }
  return data;
}





