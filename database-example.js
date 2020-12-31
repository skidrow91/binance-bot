const mongoose = require('mongoose');

const server = 'name_server';
const database = 'name_table';

class Database {
  constructor() {
    this._connect();
  }

  _connect() {
    mongoose.connect(`mongodb://${server}/${database}`)
    .then(() => {
      console.log("Database connect successful")
    })
    .catch((err) => {
      console.log(err)
    })
  }
}

module.exports = new Database();