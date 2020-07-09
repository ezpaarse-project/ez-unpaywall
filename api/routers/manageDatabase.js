const router = require('express').Router();
const fs = require('fs');
const readline = require('readline');
const zlib = require('zlib');
const axios = require('axios');
const config = require('config');
const UnPayWallModel = require('../graphql/unpaywall/model');
const logger = require('../../logs/logger');


async function getTotalLine() {
  return UnPayWallModel.count({});
}

function saveDataOrUpdate(file, offset, limit, lineInitial) {
  let counterLine = 0;
  // UnPayWall attributes
  const metadata = [
    'best_oa_location',
    'data_standard',
    'doi_url',
    'genre',
    'is_paratext',
    'is_oa',
    'journal_is_in_doaj',
    'journal_is_oa',
    'journal_issns',
    'journal_issn_l',
    'journal_name',
    'oa_locations',
    'oa_status',
    'published_date',
    'publisher',
    'title',
    'updated',
    'year',
    'z_authors',
    'createdAt',
  ];
  // upsert
  function updateUPW(data) {
    logger.info(`${counterLine}th Lines processed`);
    UnPayWallModel.bulkCreate(data, { updateOnDuplicate: metadata })
      .catch((error) => {
        logger.error(`ERROR IN UPSERT : ${error}`);
      });
  }
  // stream initialization
  const readStream = fs.createReadStream(file).pipe(zlib.createGunzip());
  async function processLineByLineUpdate() {
    const start = new Date();
    let tab = [];
    let countBulk = 0;
    const rl = readline.createInterface({
      input: readStream,
      crlfDelay: Infinity,
    });
    // eslint-disable-next-line no-restricted-syntax
    for await (const line of rl) {
      // test limit
      if (counterLine === limit) {
        break;
      }
      // test offset
      if (counterLine >= offset) {
        countBulk += 1;
        const data = JSON.parse(line);
        tab.push(data);
      }
      counterLine += 1;
      if ((countBulk % 1000) === 0 && countBulk !== 0) {
        await updateUPW(tab);
        tab = [];
      }
    }
    // if have stays data to insert
    if (countBulk > 0) {
      await updateUPW(tab);
    }
    const lineFinal = await getTotalLine();
    const total = (new Date() - start) / 1000;
    logger.info('============= FINISH =============');
    logger.info(`${total} seconds`);
    logger.info(`Number of treated lines : ${countBulk}`);
    logger.info(`Number of insert lines : ${lineFinal - lineInitial}`);
    logger.info(`Number of update lines : ${counterLine - (lineFinal - lineInitial + offset)}`);
    logger.info(`Number of errors : ${counterLine - (countBulk + offset)}`);
  }
  processLineByLineUpdate();
}

/**
 * @api {get} /firstInitialization initialize database with a compressed file
 * @apiName InitiateDatabaseWithCompressedFile
 * @apiGroup ManageDatabase
 *
 * @apiParam (QUERY) {Number} [offset=0] first line insertion, by default, we start with the first
 * @apiParam (QUERY) {Number} [limit=0] last line insertion by default, we have no limit
 */
router.get('/firstInitialization', async (req, res) => {
  let { offset, limit } = req.query;
  if (!offset) { offset = 0; }
  if (!limit) { limit = -1; }
  const file = './download/unpaywall_snapshot.jsonl.gz';
  const lineInitial = await getTotalLine();
  saveDataOrUpdate(file, Number(offset), Number(limit), lineInitial);
  res.json({ name: 'first initialization with file compressed' });
});


/**
 * // TODO voir pour automatisé le lancement de ce script avec un
 * téléchargement automatique des mise à jour
 * @api {get} /updateDatabase update database with weekly snapshot
 * @apiName UpdateDatabaseWithCompressedFile
 * @apiGroup ManageDatabase
 *
 * @apiParam (QUERY) {Number} [offset=0] first line insertion, by default, we start with the first
 * @apiParam (QUERY) {Number} [limit=0] last line insertion by default, we have no limit
 *
 */
router.get('/updateDatabase', async (req, res) => {
  let { offset, limit } = req.query;
  const { file } = req.query;
  if (!offset) { offset = 0; }
  if (!limit) { limit = -1; }
  const lineInitial = await getTotalLine();
  saveDataOrUpdate(file, Number(offset), Number(limit), lineInitial);
  res.json({ name: 'update database ...' });
});

/**
 * @api {get} /databaseStatus get informations of content database
 * @apiName GetDatabaseStatus
 * @apiGroup ManageDatabase
 */
router.get('/databaseStatus', (req, res) => {
  const status = {};
  async function databaseStatus() {
    status.doi = await UnPayWallModel.count({});
    status.is_oa = await UnPayWallModel.count({
      where: {
        is_oa: true,
      },
    });
    status.journal_issn_l = await UnPayWallModel.count({
      col: 'journal_issn_l',
      distinct: true,
    });
    status.publisher = await UnPayWallModel.count({
      col: 'publisher',
      distinct: true,
    });
    status.gold = await UnPayWallModel.count({
      where: {
        oa_status: 'gold',
      },
    });
    status.hybrid = await UnPayWallModel.count({
      where: {
        oa_status: 'hybrid',
      },
    });
    status.bronze = await UnPayWallModel.count({
      where: {
        oa_status: 'bronze',
      },
    });
    status.green = await UnPayWallModel.count({
      where: {
        oa_status: 'green',
      },
    });
    status.closed = await UnPayWallModel.count({
      where: {
        oa_status: 'closed',
      },
    });
    logger.info(`Databse status - doi:${status.doi}, is_oa ${status.is_oa}, journal_issn_l: ${status.journal_issn_l}, publisher: ${status.publisher}, gold: ${status.gold}, hybrid: ${status.hybrid}, bronze: ${status.bronze}, green: ${status.green}, closed: ${status.closed}`);
    res.status(200).json({
      doi: status.doi,
      is_oa: status.is_oa,
      journal_issn_l: status.journal_issn_l,
      publisher: status.publisher,
      gold: status.gold,
      hybrid: status.hybrid,
      bronze: status.bronze,
      green: status.green,
      closed: status.closed,
    });
  }
  databaseStatus();
});

/**
 * @api {get} /databaseStatus get informations of content database
 * @apiName GetDatabaseStatus
 * @apiGroup ManageDatabase
 */
router.get('/dowloadUpdate', async (req, res) => {
  let response;
  try {
    response = await axios({
      method: 'get',
      url: `https://api.unpaywall.org/feed/changefiles?api_key=${config.get('API_KEY_UPW')}`,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    res.status(500).json(error);
  }
  if (response && response.data) {
    try {
      const compressedFile = await axios({
        method: 'get',
        url: response.data.list[4].url,
        responseType: 'stream',
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      if (compressedFile && compressedFile.data) {
        const writeStream = compressedFile.data.pipe(fs.createWriteStream(`./download/${response.data.list[4].filename}`));
        writeStream.on('finish', () => {
          axios({
            method: 'get',
            url: `http://localhost:${config.get('API_PORT')}/updateDatabase?file=./download/${response.data.list[4].filename}`,
          });
          res.status(200).json({ type: 'succes', status: 200, msg: 'dowload update snapshot finish' });
        });
        writeStream.on('error', (error) => {
          res.status(500).json(error);
        });
      }
    } catch (error) {
      res.status(500).json(error);
    }
  }
});

module.exports = router;
