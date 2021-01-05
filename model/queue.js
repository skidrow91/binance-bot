const mongoose = require('mongoose')
const Schema = mongoose.Schema

const queueSchema = new Schema({
    symbol: String,
    price: String
})

module.exports = mongoose.model('Queue', queueSchema)