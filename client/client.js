const { Client } = require('@elastic/elasticsearch');
const { URL } = require('url');
const { elasticsearch } = require('config');

module.exports = new Client({
  node: {
    url: new URL(`http://${elasticsearch.host}:${elasticsearch.port}`),
    auth: {
      username: elasticsearch.username,
      password: elasticsearch.password,
    },
  },
  maxRetries: 5,
  requestTimeout: 60000,
  sniffOnStart: true,
});
