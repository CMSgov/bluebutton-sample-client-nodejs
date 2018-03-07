const winston = require('winston');

// export a log instance
module.exports = new winston.Logger({
    level: 'info',
    transports: [
      new (winston.transports.Console)()
    ]});