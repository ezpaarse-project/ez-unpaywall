const {
  createLogger,
  transports,
  format,
} = require('winston');

const {
  combine,
  timestamp,
  printf,
  colorize,
} = format;

require('winston-daily-rotate-file');

const path = require('path');

const myFormat = printf(({ level, message, timestamp: currentTime }) => `${currentTime} ${level}: ${message}`);

// logger configuration
const processConfiguration = [
  new transports.DailyRotateFile({
    name: 'file',
    filename: path.resolve(__dirname, '..', 'out', 'logs', '%DATE%.log'),
    datePattern: 'yyyy-MM-DD',
    level: 'info',
  }),
  new (transports.Console)(),
];

const apiConfiguration = [
  new transports.File({
    filename: path.resolve(__dirname, '..', 'out', 'logs', 'combined.log'),
  }),
  new transports.File({ filename: path.resolve(__dirname, '..', 'out', 'logs', 'errors.log'), level: 'error' }),
  new (transports.Console)(),
];

const logger = createLogger({
  format: combine(colorize(), timestamp(), myFormat),
  transports: processConfiguration,
});

const apiLogger = createLogger({
  format: combine(colorize(), timestamp(), myFormat),
  transports: apiConfiguration,
});

// create the logger
module.exports = {
  logger,
  apiLogger,
};
