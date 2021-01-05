const Queue = require('./queue')

class QueueModel {

  async getQueue(symbol) {
    let ret = []
    try {
      ret = await Queue.findOne({symbol: symbol}).sort({"_id": -1})
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }

    return ret
  }

  async addQueue(queueData) {
    let ret
    try {
      ret = await Queue.find({symbol: queueData.symbol})
      if (ret.length > 0) {
        //
      } else {
        ret = await Queue.create(queueData)
        // console.log(ret)
      }
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }

    return ret
  }

  async delQueue(symbol) {
    let ret = []
    try {
      ret = await Queue.deleteOne({symbol: symbol})
    } catch (err) {
      console.log(err)
      throw new Error(err)
    }

    return ret
  }
}

module.exports = new QueueModel();