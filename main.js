'use strict';

const httpsRateLimit = require('https-rate-limit');
const index = require('./index.js');

const run = async () => {
  console.log('banano-distribution-stats');
  if (process.argv.length < 2) {
    console.log('#usage:');
    console.log('npm start <url>');
  } else {
    const genesis = 'ban_1bananobh5rat99qfgt1ptpieie5swmoth87thi74qgbfrij7dcgjiij94xr';
    const historyChunkSize = 1000;
    // chunk into days
    const timeChunkSizeMs = 1000 * 60 * 60 * 24 * 365;

    const url = process.argv[2];
    console.log('url', url);
    httpsRateLimit.setUrl(url);

    const distributionOverTime = await index.getDistributionOverTime(httpsRateLimit, historyChunkSize, timeChunkSizeMs, genesis);
    console.log('distributionOverTime', distributionOverTime);
  }
};

run();
