const BinanceAPI = require('./binance_api');

class Candle {
  // 17-09-2013 10:08
  convertToTimestamp(datetime) {
    let dateTimeParts = datetime.split(' ');
    let dateParts = dateTimeParts[0].split('-'), timeParts = dateTimeParts[1].split(':');
    console.log(dateParts[2]+' - '+(parseInt(dateParts[1], 10) - 1)+' - '+dateParts[0]+' - '+timeParts[0]+' - '+timeParts[1]);
    let date = new Date(dateParts[2], parseInt(dateParts[1], 10) - 1, dateParts[0], timeParts[0], timeParts[1]);
    // console.log(date.toGMTString());
    // console.log(date.toTimeString());
    // console.log(Date.now());
    return date.getTime();
  }

  addHours(now, hour) {
    return now + (hour*60*60*1000);
  }

  getCandlesAvrPrice(candles) {
    let avrPrice = 0;
    let avrHighPrice = 0;
    let avrLowPrice = 0;
    let count = 0;
    let self = this;
    candles.forEach((candle) => {
      candle = self.parseCandle(candle);
      let price = (parseFloat(candle.open) + parseFloat(candle.close)) / 2;
      avrHighPrice += parseFloat(candle.high);
      avrLowPrice += parseFloat(candle.low);
      avrPrice += price;
      count++;
    });
    avrPrice = avrPrice / count;
    avrHighPrice = avrHighPrice / count;
    avrLowPrice = avrLowPrice / count;

    return {
      avrPrice: avrPrice,
      avrLowPrice: avrLowPrice,
      avrHighPrice: avrHighPrice
    };
  }

  parseCandle(candle) {
    return {
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
    }
  }

  async getCandles(symbol, from, to) {
    let params = {
      symbol: symbol,
      interval: '30m',
      startTime: from,
      endTime: to
    }
    let data = await BinanceAPI.getkKLines(params);
    return data;
  }
}

module.exports = new Candle();