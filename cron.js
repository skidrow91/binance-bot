const cron = require('node-cron')
const express = require('express')
const db = require('./database')

const exchange = require('./api/exchange')

const app = express()

cron.schedule('* * * * *', function() {
  // console.log('test cron')
  exchange.placeOrder()
})


app.listen(3000)