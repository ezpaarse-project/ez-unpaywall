const express = require('express');
const bodyParser = require('body-parser');
const graphqlHTTP = require('express-graphql');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs-extra');
const path = require('path');

const schema = require('./graphql/graphql');

// routers
const RouterManageDatabase = require('./updateManagement/routers/databaseInteraction');
const RouterHomePage = require('./updateManagement/routers/outFiles');
const RouterTasks = require('./updateManagement/routers/status');

const { apiLogger } = require('./lib/logger');

const outDir = path.resolve(__dirname, 'out');
// initiates all out dir
fs.ensureDir(path.resolve(outDir, 'logs'));
fs.ensureDir(path.resolve(outDir, 'download'));
fs.ensureDir(path.resolve(outDir, 'reports'));

// start server
const app = express();

// middleware
const isDev = process.env.NODE_ENV === 'development';
if (isDev) app.use(morgan('dev'));
if (!isDev) {
  app.use(morgan('combined', {
    stream: fs.createWriteStream(path.resolve(outDir, 'logs', 'access.log'), { flags: 'a+' }),
  }));
}

// routers
app.get('/', (req, res) => {
  res.sendFile(path.resolve('homepage.html'));
});
const corsOptions = {
  origin: '*',
  methods: 'GET, POST',
  allowedHeaders: ['Content-Type'],
};

// initialize API graphql
app.use('/graphql', cors(corsOptions), bodyParser.json(), (req, res) => {
  const graphqlQuery = graphqlHTTP({
    schema,
    graphiql: true,
  });
  return graphqlQuery(req, res);
});

// routers
app.use(RouterHomePage);
app.use(RouterTasks);
app.use(RouterManageDatabase);

/* Errors and unknown routes */
app.all('*', (req, res) => res.status(400).json({ message: 'bad request' }));

app.use((error, req, res) => res.status(500).json({ message: error.message }));

app.listen('8080', () => apiLogger.info('Server listening on 8080'));

module.exports = app;
