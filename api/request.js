require('dotenv').config();
const axios = require('axios');

const URL = process.env.API_URL;
const WURL = process.env.WAPI_URL;
const API_KEY = process.env.H_API_KEY;

module.exports.getW = async (endpoint, data) => {
  let url = WURL + endpoint;
  console.log(url);
  let response = await axios.get(url, {
    headers: {
      'X-MBX-APIKEY': API_KEY
    },
    params: data
  });
  return response;
}

module.exports.get = async (endpoint, data) => {
  let url = URL + endpoint;
  let response = await axios.get(url, {
    headers: {
      'X-MBX-APIKEY': API_KEY
    },
    params: data
  });
  return response;
}

module.exports.post = (endpoint, data) => {
  let url = URL + endpoint;
  return axios.post(url, null, {
    headers: {
      'X-MBX-APIKEY': API_KEY
    },
    params: data
  })
}

module.exports.delete = (endpoint, data) => {
  let url = URL + endpoint;
  return axios.delete(url, {
    headers: {
      'X-MBX-APIKEY': API_KEY
    },
    params: data
  })
}