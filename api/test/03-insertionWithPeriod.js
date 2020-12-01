const { expect } = require('chai');
const chai = require('chai');
const chaiHttp = require('chai-http');

const api = require('../app');
//const fakeUnpaywall = require('../../fakeUnpaywall/app');

const client = require('../lib/client');
const {
  createIndexUnpaywall,
  createIndexTask,
  deleteIndexUnpaywall,
  deleteIndexTask,
  countIndexUnpaywall,
  isTaskEnd,
  getTask,
  deleteFile,
  initializeDate,
} = require('./utils');

chai.should();
chai.use(chaiHttp);

describe('test insertion between a period', () => {

  const now = Date.now();
  const oneDay = (1 * 24 * 60 * 60 * 1000);

  // create date in a format (YYYY-mm-dd) to be use by ezunpaywall
  const dateNow = new Date(now).toISOString().slice(0, 10);
  // yersteday
  const date1 = new Date(now - (1 * oneDay)).toISOString().slice(0, 10);
  // yersteday - one week
  const date2 = new Date(now - (8 * oneDay)).toISOString().slice(0, 10);
  // yersteday - two weeks
  const date3 = new Date(now - (15 * oneDay)).toISOString().slice(0, 10);
  // theses dates are for test between a short period
  const date4 = new Date(now - (4 * oneDay)).toISOString().slice(0, 10);
  const date5 = new Date(now - (5 * oneDay)).toISOString().slice(0, 10);
  const tomorrow = new Date(now + (1 * oneDay)).toISOString().slice(0, 10);

  before(async () => {
    // wait elastic started
    let response;
    while (response?.statusCode !== 200) {
      try {
        response = await client.ping();
      } catch (err) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        processLogger.error(`Error in before: ${err}`);
      }
    }
    await deleteFile('fake1.jsonl.gz');
    await deleteFile('fake2.jsonl.gz')
    await deleteFile('fake3.jsonl.gz')
  });

  describe(`/update?startDate=${date2} download and insert files between a period with startDate`, async () => {
    before(async () => {
      await createIndexUnpaywall();
      await createIndexTask();
    });
    
    // test return message
    it('should return the process start', async () => {
      const server = 'http://localhost:8080';
      const response = await chai.request(server)
        .post(`/update?startDate=${date2}`)
        .set('Access-Control-Allow-Origin', '*')
        .set('Content-Type', 'application/json')
      response.should.have.status(200);
      response.body.should.have.property('message');
      response.body.message.should.be.equal(`insert snapshot beetween ${date2} and ${dateNow} has begun, list of task has been created on elastic`);
    });

    // test insertion
    it('should insert 2100 datas', async () => {
      let taskEnd;
      while (!taskEnd) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        taskEnd = await isTaskEnd()
      }
      count = await countIndexUnpaywall();
      expect(count).to.equal(2100)
    });

    // test task
    it('should get task with all informations', async () => {
      let task = await getTask();

      task.should.have.property('done');
      task.should.have.property('currentTask');
      task.should.have.property('steps');
      task.should.have.property('createdAt');
      task.should.have.property('endAt');
      task.should.have.property('took');

      task.steps[0].should.have.property('task');
      task.steps[0].should.have.property('took');
      task.steps[0].should.have.property('status');

      task.steps[1].should.have.property('task');
      task.steps[1].should.have.property('file');
      task.steps[1].should.have.property('percent');
      task.steps[1].should.have.property('took');
      task.steps[1].should.have.property('status');

      task.steps[2].should.have.property('task');
      task.steps[2].should.have.property('file');
      task.steps[2].should.have.property('percent');
      task.steps[2].should.have.property('lineRead');
      task.steps[2].should.have.property('took');
      task.steps[2].should.have.property('status');

      task.steps[3].should.have.property('task');
      task.steps[3].should.have.property('file');
      task.steps[3].should.have.property('percent');
      task.steps[3].should.have.property('took');
      task.steps[3].should.have.property('status');

      task.steps[4].should.have.property('task');
      task.steps[4].should.have.property('file');
      task.steps[4].should.have.property('percent');
      task.steps[4].should.have.property('lineRead');
      task.steps[4].should.have.property('took');
      task.steps[4].should.have.property('status');

      task.done.should.be.equal(true);
      task.currentTask.should.be.equal('end');
      task.steps[0].task.should.be.equal('fetchUnpaywall');
      task.steps[0].status.should.be.equal('success');

      task.steps[1].task.should.be.equal('download');
      task.steps[1].file.should.be.equal('fake2.jsonl.gz');
      task.steps[1].percent.should.be.equal(100);
      task.steps[1].status.should.be.equal('success');

      task.steps[2].task.should.be.equal('insert');
      task.steps[2].file.should.be.equal('fake2.jsonl.gz');
      task.steps[2].percent.should.be.equal(100);
      task.steps[2].lineRead.should.be.equal(100);
      task.steps[2].status.should.be.equal('success');

      task.steps[3].task.should.be.equal('download');
      task.steps[3].file.should.be.equal('fake1.jsonl.gz');
      task.steps[3].percent.should.be.equal(100);
      task.steps[3].status.should.be.equal('success');

      task.steps[4].task.should.be.equal('insert');
      task.steps[4].file.should.be.equal('fake1.jsonl.gz');
      task.steps[4].percent.should.be.equal(100);
      task.steps[4].lineRead.should.be.equal(2000);
      task.steps[4].status.should.be.equal('success');
    });

    // TODO test Report

    after(async () => {
      await deleteIndexUnpaywall();
      await deleteIndexTask();
      await deleteFile('fake1.jsonl.gz');
      await deleteFile('fake2.jsonl.gz')
    });
  });

  describe(`/update?startDate=${date3}&endDate=${date2} download and insert files between a period with startDate and endDate`, () => {
    before(async () => {
      await createIndexUnpaywall();
      await createIndexTask();
    });

    // test return message
    it('should return the process start', async () => {
      const server = 'http://localhost:8080';
      const response = await chai.request(server)
        .post(`/update?startDate=${date3}&endDate=${date2}`)
        .set('Access-Control-Allow-Origin', '*')
        .set('Content-Type', 'application/json')
      response.should.have.status(200);
      response.body.should.have.property('message');
      response.body.message.should.be.equal(`insert snapshot beetween ${date3} and ${date2} has begun, list of task has been created on elastic`);
    });

    // test insertion
    it('should insert 150 datas', async () => {
      let taskEnd;
      while (!taskEnd) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        taskEnd = await isTaskEnd()
      }
      count = await countIndexUnpaywall();
      expect(count).to.equal(150)
    });

    // test task
    it('should get task with all informations', async () => {
      let task = await getTask();

      task.should.have.property('done');
      task.should.have.property('currentTask');
      task.should.have.property('steps');
      task.should.have.property('createdAt');
      task.should.have.property('endAt');
      task.should.have.property('took');

      task.steps[0].should.have.property('task');
      task.steps[0].should.have.property('took');
      task.steps[0].should.have.property('status');

      task.steps[1].should.have.property('task');
      task.steps[1].should.have.property('file');
      task.steps[1].should.have.property('percent');
      task.steps[1].should.have.property('took');
      task.steps[1].should.have.property('status');

      task.steps[2].should.have.property('task');
      task.steps[2].should.have.property('file');
      task.steps[2].should.have.property('percent');
      task.steps[2].should.have.property('lineRead');
      task.steps[2].should.have.property('took');
      task.steps[2].should.have.property('status');

      task.steps[3].should.have.property('task');
      task.steps[3].should.have.property('file');
      task.steps[3].should.have.property('percent');
      task.steps[3].should.have.property('took');
      task.steps[3].should.have.property('status');

      task.steps[4].should.have.property('task');
      task.steps[4].should.have.property('file');
      task.steps[4].should.have.property('percent');
      task.steps[4].should.have.property('lineRead');
      task.steps[4].should.have.property('took');
      task.steps[4].should.have.property('status');

      task.done.should.be.equal(true);
      task.currentTask.should.be.equal('end');
      task.steps[0].task.should.be.equal('fetchUnpaywall');
      task.steps[0].status.should.be.equal('success');

      task.steps[1].task.should.be.equal('download');
      task.steps[1].file.should.be.equal('fake3.jsonl.gz');
      task.steps[1].percent.should.be.equal(100);
      task.steps[1].status.should.be.equal('success');

      task.steps[2].task.should.be.equal('insert');
      task.steps[2].file.should.be.equal('fake3.jsonl.gz');
      task.steps[2].percent.should.be.equal(100);
      task.steps[2].lineRead.should.be.equal(50);
      task.steps[2].status.should.be.equal('success');

      task.steps[3].task.should.be.equal('download');
      task.steps[3].file.should.be.equal('fake2.jsonl.gz');
      task.steps[3].percent.should.be.equal(100);
      task.steps[3].status.should.be.equal('success');

      task.steps[4].task.should.be.equal('insert');
      task.steps[4].file.should.be.equal('fake2.jsonl.gz');
      task.steps[4].percent.should.be.equal(100);
      task.steps[4].lineRead.should.be.equal(100);
      task.steps[4].status.should.be.equal('success');
    });

    // TODO test Report

    after(async () => {
      await deleteIndexUnpaywall();
      await deleteIndexTask();
      await deleteFile('fake2.jsonl.gz');
      await deleteFile('fake3.jsonl.gz');
    });
  });

  describe(`/update?startDate=${date5}&endDate=${date4} try to download and insert files between a short period with startDate and endDate`, () => {
    before(async () => {
      await createIndexUnpaywall();
      await createIndexTask();
    });

    // test return message
    it('should return the process start', async () => {
      const server = 'http://localhost:8080';
      const response = await chai.request(server)
        .post(`/update?startDate=${date5}&endDate=${date4}`)
        .set('Access-Control-Allow-Origin', '*')
        .set('Content-Type', 'application/json')
      response.should.have.status(200);
      response.body.should.have.property('message');
      response.body.message.should.be.equal(`insert snapshot beetween ${date5} and ${date4} has begun, list of task has been created on elastic`);
    });

    // test insertion
    it('should insert nothing', async () => {
      let taskEnd;
      while (!taskEnd) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        taskEnd = await isTaskEnd()
      }
      count = await countIndexUnpaywall();
      expect(count).to.equal(null)
    });

    // test task
    it('should get task with all informations', async () => {
      let task = await getTask();

      task.should.have.property('done');
      task.should.have.property('currentTask');
      task.should.have.property('steps');
      task.should.have.property('createdAt');
      task.should.have.property('endAt');
      task.should.have.property('took');

      task.steps[0].should.have.property('task');
      task.steps[0].should.have.property('took');
      task.steps[0].should.have.property('status');

      task.done.should.be.equal(true);
      task.currentTask.should.be.equal('end');
      task.steps[0].task.should.be.equal('fetchUnpaywall');
      task.steps[0].status.should.be.equal('success');
    });

    after(async () => {
      await deleteIndexUnpaywall();
      await deleteIndexTask();
    });
  });

  describe(`/update?endDate=${date1} try to download and insert snapshot with only a endDate`, () => {
    // test return message
    it('should return a error message', async () => {
      const server = 'http://localhost:8080';
      const response = await chai.request(server)
        .post(`/update?endDate=${date1}`)
        .set('Access-Control-Allow-Origin', '*')
        .set('Content-Type', 'application/json')
      response.should.have.status(400);
      response.body.should.have.property('message');
      response.body.message.should.be.equal('start date is missing');
    });
  });

  describe('/update?startDate="WrongDate" try to download and insert snapshot with a date in bad format', () => {
    // test return message
    it('should return a error message', async () => {
      const server = 'http://localhost:8080';
      const response = await chai.request(server)
        .post('/update?startDate=LookAtMyDab')
        .set('Access-Control-Allow-Origin', '*')
        .set('Content-Type', 'application/json')
      response.should.have.status(400);
      response.body.should.have.property('message');
      response.body.message.should.be.equal('startDate are in bad format, date need to be in format YYYY-mm-dd');
    });

    // test return message
    it('should return a error message', async () => {
      const server = 'http://localhost:8080';
      const response = await chai.request(server)
        .post('/update?startDate=01-01-2000')
        .set('Access-Control-Allow-Origin', '*')
        .set('Content-Type', 'application/json')
      response.should.have.status(400);
      response.body.should.have.property('message');
      response.body.message.should.be.equal('startDate are in bad format, date need to be in format YYYY-mm-dd');
    });

    // test return message
    it('should return a error message', async () => {
      const server = 'http://localhost:8080';
      const response = await chai.request(server)
        .post('/update?startDate=2000-50-50')
        .set('Access-Control-Allow-Origin', '*')
        .set('Content-Type', 'application/json')
      response.should.have.status(400);
      response.body.should.have.property('message');
      response.body.message.should.be.equal('startDate are in bad format, date need to be in format YYYY-mm-dd');
    });
  });

  describe(`/update?startDate=${date2}&endDate=${date3} try to download and insert files between a period with endDate < startDate`, () => {
    // test return message
    it('should return a error message', async () => {
      const server = 'http://localhost:8080';
      const response = await chai.request(server)
        .post(`/update?startDate=${date2}&endDate=${date3}`)
        .set('Access-Control-Allow-Origin', '*')
        .set('Content-Type', 'application/json')
      response.should.have.status(400);
      response.body.should.have.property('message');
      response.body.message.should.be.equal(`endDate is lower than startDate`);
    });
  });

  describe(`/update?startDate=${tomorrow} try to download and insert files with a startDate in the futur`, () => {
    // test return message
    it('should return a error message', async () => {
      const server = 'http://localhost:8080';
      const response = await chai.request(server)
        .post(`/update?startDate=${tomorrow}`)
        .set('Access-Control-Allow-Origin', '*')
        .set('Content-Type', 'application/json')
      response.should.have.status(400);
      response.body.should.have.property('message');
      response.body.message.should.be.equal('startDate is in the futur');
    });
  });
});
