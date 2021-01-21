const client = require('./client');
const { logger } = require('./logger');
const unpaywallIndex = require('../index/unpaywall.json');
const taskIndex = require('../index/task.json');

const pingElastic = async () => {
  let elasticStatus;
  while (elasticStatus?.statusCode !== 200) {
    try {
      elasticStatus = await client.ping();
    } catch (err) {
      logger.error(`Error in elastic ping : ${err}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return true;
}

const isIndexExist = async (name) => {
  let res;
  try {
    res = await client.indices.exists({
      index: name,
    });
  } catch (err) {
    logger.error(`Error in indices.exists in isIndexExist: ${err}`);
  }
  return res.body;
};

const createIndex = async (name, index) => {
  const exist = await isIndexExist(name);
  if (!exist) {
    try {
      await client.indices.create({
        index: name,
        body: index,
      });
    } catch (err) {
      logger.error(`Error in indices.create in createIndex: ${err}`);
    }
  }
};

const initalizeIndex = async () => {
  const up = await pingElastic();
  if (up) {
    await createIndex('unpaywall', unpaywallIndex);
    await createIndex('task', taskIndex);
  }
}

module.exports = {
  initalizeIndex,
};
