const router = require('express').Router();
const fs = require('fs');
const readline = require('readline');
const zlib = require('zlib');
const UnpaywallModel = require('../api/unpaywall/model');
const logger = require('../logs/logger');


router.get('firstInitializationWithFileCompressed', (req, res) => {
  const file = './dataUPW/unpaywall_snapshot.jsonl.gz';

  let counterLimit = 10100;
  let counterError = 0;
  let counterLine = 0;
  function saveUPWWithBulk(tab) {
    UnpaywallModel.bulkCreate(tab, { ignoreDuplicate: true })
      .catch((error) => {
        counterError += 1;
        logger.error(`BULK ERROR : ${error}`);
      });
  }
  function total() {
    return UnpaywallModel.count({
      distinct: true,
    });
  }

  // initialisation du stream du le fichier compréssé
  const readStream = fs.createReadStream(file).pipe(zlib.createGunzip());

  async function process() {
    const start = new Date();
    let tab = [];
    let countBulk = 0;
    const rl = readline.createInterface({
      input: readStream,
      crlfDelay: Infinity,
    });
    // eslint-disable-next-line no-restricted-syntax
    for await (const line of rl) {
      if (counterLimit === 0) {
        break;
      }
      counterLine += 1;
      const data = JSON.parse(line);
      tab.push(data);
      countBulk += 1;
      if (countBulk === 1000) {
        await saveUPWWithBulk(tab);
        countBulk = 0;
        tab = [];
      }
      counterLimit -= 1;
    }
    // if have stays data to insert
    if (countBulk !== 0) {
      await saveUPWWithBulk(tab);
    }
    // processing time
    const time = (new Date() - start) / 1000;

    logger.info(`${time} secondes`);
    logger.info(`Nombre d'erreur : ${counterError}`);
    logger.info(`Nombre de ligne lu : ${counterLine}`);
    const nbtotal = await total();
    logger.info(`Nombre de ligne inséré : ${nbtotal}`);
  };
  res.json({ name: 'first initialization' });
});


const file = './dataUPW/extract.jsonl';

let counterLimit = 10000;
let counterError = 0;
let counterLine = 0;

function saveUPWWithBulk(tab) {
  UnpaywallModel.bulkCreate(tab, { ignoreDuplicate: true })
    .catch((error) => {
      counterError += 1;
      logger.error(`BULK ERROR : ${error}`);
    });
}

async function total() {
  const res = await UnpaywallModel.count({
    distinct: true,
  });
  return res;
}


module.exports = async function processLineByLine() {
  // temps du début de la méthode
  const start = new Date();
  const fileStream = fs.createReadStream(file);

  let tab = [];
  let countBulk = 0;

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  // eslint-disable-next-line no-restricted-syntax
  for await (const line of rl) {
    if (counterLimit === 0) {
      break;
    }
    counterLine += 1;
    const data = JSON.parse(line);
    tab.push(data);
    countBulk += 1;
    if (countBulk === 1000) {
      await saveUPWWithBulk(tab);
      countBulk = 0;
      tab = [];
    }
    counterLimit -= 1;
  }
  // if have stays data to insert
  if (countBulk !== 0) {
    await saveUPWWithBulk(tab);
  }

  // temps de fin
  const time = (new Date() - start) / 1000;
  // indication du temps de traitement et du nombre d'erreur
  logger.info(`${time} secondes`);
  logger.info(`Nombre d'erreur : ${counterError}`);
  logger.info(`Nombre de ligne lu : ${counterLine}`);
  await total().then((nbtotal) => { logger.info(`Nombre de ligne inséré : ${nbtotal}`); });
};
