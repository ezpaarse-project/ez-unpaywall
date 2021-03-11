/* eslint-disable no-await-in-loop */
const chai = require('chai');
const { expect } = require('chai');
const chaiHttp = require('chai-http');
const fs = require('fs-extra');
const path = require('path');
const { Readable } = require('stream');

chai.use(chaiHttp);

const { logger } = require('../lib/logger');

const indexUnpawall = require('../index/unpaywall.json');
const indexTask = require('../index/task.json');

const {
  downloadFile,
  deleteFile,
  binaryParser,
  compareFile,
} = require('./utils/file');

const {
  createIndex,
  isTaskEnd,
  deleteIndex,
} = require('./utils/elastic');

const {
  ping,
} = require('./utils/ping');

const ezunpaywallURL = 'http://localhost:8080';

const enrichDir = path.resolve(__dirname, 'enrich');

describe('Test: enrichment with a json file (command ezu)', () => {
  before(async () => {
    await ping();
    await downloadFile('fake1.jsonl.gz');
    await createIndex('task', indexTask);
    await createIndex('unpaywall', indexUnpawall);

    // test insertion
    await chai.request(ezunpaywallURL)
      .post('/update/fake1.jsonl.gz')
      .set('Access-Control-Allow-Origin', '*')
      .set('Content-Type', 'application/json');

    let taskEnd;
    while (!taskEnd) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      taskEnd = await isTaskEnd();
    }
  });

  describe('Do a enrichment of a json file with all unpaywall attributes', () => {
    it('Should enrich the file on 3 lines with all unpaywall attributes and download it', async () => {
      const file = fs.readFileSync(path.resolve(enrichDir, 'mustBeEnrich', 'file1.jsonl'), 'utf8');
      const res1 = await chai
        .request(ezunpaywallURL)
        .post('/enrich/json')
        .send(file)
        .set('Content-Type', 'application/x-ndjson')
        .buffer()
        .parse(binaryParser);

      expect(res1).have.status(200);

      const filename = JSON.parse(res1.body.toString()).file;

      const res2 = await chai
        .request(ezunpaywallURL)
        .get(`/enrich/${filename}`)
        .buffer()
        .parse(binaryParser);

      expect(res2).have.status(200);

      try {
        const writer = fs.createWriteStream(path.resolve(enrichDir, 'enriched', 'enriched.jsonl'));
        Readable.from(res2.body.toString()).pipe(writer);
      } catch (err) {
        logger.error(`createWriteStream: ${err}`);
      }

      const reference = path.resolve(enrichDir, 'enriched', 'jsonl', 'file1.jsonl');
      const fileEnriched = path.resolve(enrichDir, 'enriched', 'enriched.jsonl');

      const same = await compareFile(reference, fileEnriched);
      expect(same).to.be.equal(true);
    });

    it('Should enrich the file on 2 lines with all unpaywall attributes and download it', async () => {
      const file = fs.readFileSync(path.resolve(enrichDir, 'mustBeEnrich', 'file2.jsonl'));
      const res1 = await chai
        .request(ezunpaywallURL)
        .post('/enrich/json')
        .send(file)
        .set('Content-Type', 'application/x-ndjson')
        .buffer()
        .parse(binaryParser);

      const filename = JSON.parse(res1.body.toString()).file;

      const res2 = await chai
        .request(ezunpaywallURL)
        .get(`/enrich/${filename}`)
        .buffer()
        .parse(binaryParser);

      expect(res2).have.status(200);

      try {
        const writer = fs.createWriteStream(path.resolve(enrichDir, 'enriched', 'enriched.jsonl'));
        Readable.from(res2.body.toString()).pipe(writer);
      } catch (err) {
        logger.error(`createWriteStream: ${err}`);
      }

      const reference = path.resolve(enrichDir, 'enriched', 'jsonl', 'file2.jsonl');
      const fileEnriched = path.resolve(enrichDir, 'enriched', 'enriched.jsonl');

      const same = await compareFile(reference, fileEnriched);
      expect(same).to.be.equal(true);
    });
  });

  describe('Do a enrichment of a file already installed and enrich a json file with some unpaywall attributes (is_oa, best_oa_location.license, z_authors.family)', () => {
    it('Should enrich the file on 3 lines with is_oa attributes and download it', async () => {
      const file = fs.readFileSync(path.resolve(enrichDir, 'mustBeEnrich', 'file1.jsonl'), 'utf8');
      const res1 = await chai
        .request(ezunpaywallURL)
        .post('/enrich/json')
        .query({ args: 'is_oa' })
        .send(file)
        .set('Content-Type', 'application/x-ndjson')
        .buffer()
        .parse(binaryParser);

      expect(res1).have.status(200);

      const filename = JSON.parse(res1.body.toString()).file;

      const res2 = await chai
        .request(ezunpaywallURL)
        .get(`/enrich/${filename}`)
        .buffer()
        .parse(binaryParser);

      expect(res2).have.status(200);

      try {
        const writer = fs.createWriteStream(path.resolve(enrichDir, 'enriched', 'enriched.jsonl'));
        Readable.from(res2.body.toString()).pipe(writer);
      } catch (err) {
        logger.error(`createWriteStream: ${err}`);
      }

      const reference = path.resolve(enrichDir, 'enriched', 'jsonl', 'file3.jsonl');
      const fileEnriched = path.resolve(enrichDir, 'enriched', 'enriched.jsonl');

      const same = await compareFile(reference, fileEnriched);
      expect(same).to.be.equal(true);
    });

    it('Should enrich the file on 3 lines with best_oa_location.license attributes and download it', async () => {
      const file = fs.readFileSync(path.resolve(enrichDir, 'mustBeEnrich', 'file1.jsonl'), 'utf8');
      const res1 = await chai
        .request(ezunpaywallURL)
        .post('/enrich/json')
        .query({ args: 'best_oa_location.license' })
        .send(file)
        .set('Content-Type', 'application/x-ndjson')
        .buffer()
        .parse(binaryParser);

      expect(res1).have.status(200);

      const filename = JSON.parse(res1.body.toString()).file;

      const res2 = await chai
        .request(ezunpaywallURL)
        .get(`/enrich/${filename}`)
        .buffer()
        .parse(binaryParser);

      expect(res2).have.status(200);

      try {
        const writer = fs.createWriteStream(path.resolve(enrichDir, 'enriched', 'enriched.jsonl'));
        Readable.from(res2.body.toString()).pipe(writer);
      } catch (err) {
        logger.error(`createWriteStream: ${err}`);
      }

      const reference = path.resolve(enrichDir, 'enriched', 'jsonl', 'file4.jsonl');
      const fileEnriched = path.resolve(enrichDir, 'enriched', 'enriched.jsonl');

      const same = await compareFile(reference, fileEnriched);
      expect(same).to.be.equal(true);
    });

    it('Should enrich the file on 3 lines with z_authors.family attributes and download it', async () => {
      const file = fs.readFileSync(path.resolve(enrichDir, 'mustBeEnrich', 'file1.jsonl'), 'utf8');
      const res1 = await chai
        .request(ezunpaywallURL)
        .post('/enrich/json')
        .query({ args: 'z_authors.family' })
        .send(file)
        .set('Content-Type', 'application/x-ndjson')
        .buffer()
        .parse(binaryParser);

      expect(res1).have.status(200);

      const filename = JSON.parse(res1.body.toString()).file;

      const res2 = await chai
        .request(ezunpaywallURL)
        .get(`/enrich/${filename}`)
        .buffer()
        .parse(binaryParser);

      expect(res2).have.status(200);

      try {
        const writer = fs.createWriteStream(path.resolve(enrichDir, 'enriched', 'enriched.jsonl'));
        Readable.from(res2.body.toString()).pipe(writer);
      } catch (err) {
        logger.error(`createWriteStream: ${err}`);
      }

      const reference = path.resolve(enrichDir, 'enriched', 'jsonl', 'file5.jsonl');
      const fileEnriched = path.resolve(enrichDir, 'enriched', 'enriched.jsonl');

      const same = await compareFile(reference, fileEnriched);
      expect(same).to.be.equal(true);
    });

    it('Should enrich the file on 3 lines with is_oa, best_oa_location.license, z_authors.family attributes and download it', async () => {
      const file = fs.readFileSync(path.resolve(enrichDir, 'mustBeEnrich', 'file1.jsonl'), 'utf8');
      const res1 = await chai
        .request(ezunpaywallURL)
        .post('/enrich/json')
        .query({ args: 'is_oa,best_oa_location.license,z_authors.family' })
        .send(file)
        .set('Content-Type', 'application/x-ndjson')
        .buffer()
        .parse(binaryParser);

      expect(res1).have.status(200);

      const filename = JSON.parse(res1.body.toString()).file;

      const res2 = await chai
        .request(ezunpaywallURL)
        .get(`/enrich/${filename}`)
        .buffer()
        .parse(binaryParser);

      expect(res2).have.status(200);

      try {
        const writer = fs.createWriteStream(path.resolve(enrichDir, 'enriched', 'enriched.jsonl'));
        Readable.from(res2.body.toString()).pipe(writer);
      } catch (err) {
        logger.error(`createWriteStream: ${err}`);
      }

      const reference = path.resolve(enrichDir, 'enriched', 'jsonl', 'file6.jsonl');
      const fileEnriched = path.resolve(enrichDir, 'enriched', 'enriched.jsonl');

      const same = await compareFile(reference, fileEnriched);
      expect(same).to.be.equal(true);
    });
  });

  describe('Don\'t do a enrichment of a json file because the arguments doesn\'t exist on ezunpaywall index', () => {
    it('Should return a error message', async () => {
      const file = fs.readFileSync(path.resolve(enrichDir, 'mustBeEnrich', 'file1.jsonl'), 'utf8');
      const res = await chai
        .request(ezunpaywallURL)
        .post('/enrich/json')
        .query({ args: 'don\'t exist' })
        .send(file)
        .set('Content-Type', 'application/x-ndjson')
        .set('Content-Type', 'application/json')
        .buffer()
        .parse(binaryParser);

      expect(res).have.status(401);
      expect(JSON.parse(res.body).message).be.equal('args incorrect');
    });
  });

  after(async () => {
    await deleteIndex('unpaywall');
    await deleteIndex('task');
    await deleteFile('fake1.jsonl.gz');
  });
});
