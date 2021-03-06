const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const cors = require('cors');

// start server
const server = express();

const RouterSnapshots = require('./routers/snapshots');

server.use('/snapshots', cors());
server.use(bodyParser.json());

server.get('/', (req, res) => {
  res.status(200).json({ message: 'fakeUnpaywall Up' });
});

server.use(RouterSnapshots);

// TODO rewrite this but i don't know why express.static doesn't work

server.get('/snapshots/changefiles.json', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'snapshots', 'changefiles.json'));
});

server.get('/snapshots/fake1.jsonl.gz', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'snapshots', 'fake1.jsonl.gz'));
});
server.get('/snapshots/fake2.jsonl.gz', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'snapshots', 'fake2.jsonl.gz'));
});
server.get('/snapshots/fake3.jsonl.gz', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'snapshots', 'fake3.jsonl.gz'));
});

server.get('/ping', (req, res) => {
  res.status(200).json({ data: 'pong' });
});

/* Errors and unknown routes */
server.use((req, res) => res.status(404).json({ message: `Cannot ${req.method} ${req.originalUrl}` }));
server.use((error, req, res) => res.status(500).json({ message: error.message }));

server.listen('12000', () => {
  console.log('fakeUnpaywall listening on 12000');
});

module.exports = server;
