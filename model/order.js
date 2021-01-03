const mongoose = require('mongoose')
const Schema = mongoose.Schema

const orderSchema = new Schema({
    symbol: String,
    orderId: String,
    clientOrderId: String,
    transactTime: String,
    price: String,
    qty: String,
    status: String,
    timeInForce: String,
    type: String,
    side: String,
    localStatus: String,
    limitAttempt: Number
})

module.exports = mongoose.model('Order', orderSchema)