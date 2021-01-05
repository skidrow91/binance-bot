require('dotenv').config();
var crypto = require('crypto');
const Request = require('./request');

class BinanceAPI {

  constructor()
  {
    this.endpoints = {
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
    this.request = Request
    this.SECRET_KEY = process.env.H_SECRET_KEY;
  }

  sign (params) {
    let query = '';
    for (let key in params) {
      if (params.hasOwnProperty(key)) {
        if (query.length > 0) {
          query += '&'
        }
        query += key+'='+params[key]
      }
    }

    // console.log(query);

    let signature = crypto.createHmac("sha256", this.SECRET_KEY).update(query).digest("hex")

    return signature
  }

  async getAccountInfo (params) {
    let data
    try {
      params.signature = this.sign(params)
      let response = await this.request.get(this.endpoints.account, params)
      data = response.data
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }
    return data;
  }

  async getkKLines (params) {
    let data;
    try {
      let response = await this.request.get(this.endpoints.klines, params);
      data = response.data
    } catch (err) {
      console.log(err);
      throw new Error(err)
    }
    return data;
  }

  async exchangeInfo (symbol) {
    let data;
    try {
      let response = await this.request.get(this.endpoints.exchange, {});
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

  async orderBook (params) {
    let data;
    try {
      let response = await this.request.get(this.endpoints.orderbook, params);
      data = response.data
    } catch (err) {
      throw new Error(err)
    }
    return data;
  }

  async newOrder (params) {
    let data;
    try {
      params.signature = this.sign(params);
      // console.log(params);
      let response = await this.request.post(this.endpoints.order, params);
      data = response.data
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }
    return data;
  }

  async queryOrder (params) {
    let data;
    try {
      params.signature = this.sign(params);
      // console.log(params);
      // return false;
      let response = await this.request.get(this.endpoints.order, params);
      data = response.data
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }
    return data;
  }

  async cancelOrder (params) {
    let data;
    try {
      params.signature = this.sign(params);
      let response = await this.request.delete(this.endpoints.order, params);
      data = response.data
    } catch (err) {
      console.log(err);
      throw new Error(err)
    }
    return data;
  }

  async cancelAllOrders (params) {
    let data;
    try {
      params.signature = this.sign(params);
      let response = await this.request.delete(this.endpoints.openorders, params);
      data = response.data
    } catch (err) {
      console.log(err);
      throw new Error(err)
    }
    return data;
  }

  async openOrders (params) {
    let data;
    try {
      let response = await this.request.get(this.endpoints.openorders, params);
      data = response.data
    } catch (err) {
      throw new Error(err)
    }
    return data;
  }

  async getAvPrice (params) {
    let data;
    try {
      let response = await this.request.get(this.endpoints.avgprice, params);
      data = response.data
    } catch (err) {
      throw new Error(err)
    }
    return data;
  }

  async getCurrentPrice (params) {
    let data;
    try {
      let response = await this.request.get(this.endpoints.price, params);
      data = response.data
    } catch (err) {
      throw new Error(err)
    }
    return data;
  }

  async getFeeTrading (params) {
    let data;
    try {
      params.signature = this.sign(params);
      let response = await this.request.getW(this.endpoints.feetrading, params);
      data = response.data
    } catch (err) {
      console.log(err);
      throw new Error(err)
    }
    return data;
  }

  async getAssetDetail (params) {
    let data;
    try {
      params.signature = this.sign(params);
      let response = await this.request.getW(this.endpoints.assetdetail, params);
      data = response.data
    } catch (err) {
      throw new Error(err)
    }
    return data;
  }

  async getPrice24h (params) {
    let data;
    try {
      let response = await this.request.get(this.endpoints.pricehour, params);
      data = response.data
    } catch (err) {
      throw new Error(err)
    }
    return data;
  }

  async getServerTime () {
    let data;
    try {
      let response = await this.request.get(this.endpoints.time, {});
      data = response.data
    } catch (err) {
      throw new Error(err)
    }
    return data;
  }
}

module.exports = new BinanceAPI()