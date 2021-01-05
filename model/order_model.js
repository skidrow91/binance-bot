const Order = require('./order')

class OrderModel {

  async addOrder(orderData) {
    let ret
    try {
      ret = await Order.find(orderData)
      if (ret.length > 0) {
        //
      } else {
        ret = await Order.create(orderData)
        // console.log(ret)
      }
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }

    return ret
  }

  async getOrder(orderData) {
    let ret = []
    try {
      ret = await Order.findOne({symbol: orderData.symbol, side: orderData.side, localStatus: orderData.localStatus}).sort({"_id": -1})
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }

    return ret
  }
}

module.exports = new OrderModel();