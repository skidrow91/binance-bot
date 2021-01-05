const fs = require('fs')
const cron = require('node-cron')
const express = require('express')
const db = require('./database')

const exchange = require('./api/exchange')

// const app = express()

// const sleep = (ms) => {
//   return new Promise((resolve) => {
//     setTimeout(resolve, ms);
//   });
// }

cron.schedule('* * * * *', async function() {
  // console.log('Start Place Order');

  // let rawData = fs.readFileSync('./symbols.json');
  // let data = JSON.parse(rawData);
  // // console.log(data);
  // data.symbols.forEach(async (symbol) => {
  //   let orderData = await exchange.placeOrder(symbol);
  //   console.log(orderData);
  //   await sleep(20000);
  // })

  // console.log('End Place Order');

  exchange.run();
})


// app.listen(3000)