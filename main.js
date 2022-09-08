'use strict';
const fs = require('fs');

const httpsRateLimit = require('https-rate-limit');
const index = require('./index.js');

const run = async () => {
  console.log('banano-distribution-stats');
  if (process.argv.length < 3) {
    console.log('#usage:');
    console.log('npm start <outfile> <url>');
  } else {
    const historyChunkSize = 1000;
    // chunk into days
    const timeChunkFn = (ts) => {
      const isoStr = new Date(ts)
          .toISOString();
      const yearMonth = isoStr.substring(0, 7);
      return yearMonth;
    };
    const knownAccountTypeMap = new Map();

    const knownAccountsUrl = 'https://api.creeper.banano.cc/banano/v1/known/accounts';
    // console.log('knownAccountsUrl', knownAccountsUrl);
    httpsRateLimit.setUrl(knownAccountsUrl);
    const knownAccountsResponse = await httpsRateLimit.sendRequest({includeType: true});
    // console.log('knownAccountsResponse', knownAccountsResponse);
    knownAccountsResponse.forEach((knownAccountElt) => {
      const account = knownAccountElt.address;
      const type = knownAccountElt.type;
      switch (type) {
        case 'distribution':
        case 'faucet':
        case 'event':
          knownAccountTypeMap.set(account, 'source');
          break;
        case 'exchange':
        case 'burn':
        case 'donation':
        case 'gambling':
        case 'service':
          knownAccountTypeMap.set(account, 'sink');
          break;
        case 'representative':
        case 'team-member':
          knownAccountTypeMap.set(account, 'distributed-to-known');
          break;
        default:
          console.log('unknown account type', type, knownAccountElt);
      }
    });
    // for (const [account, type] of knownAccountTypeMap) {
    //   console.log('known account type', account, type);
    // }
    const url = process.argv[3];
    // console.log('url', url);
    httpsRateLimit.setUrl(url);

    const knownAccountTypeList = [];
    for (const [account, type] of knownAccountTypeMap) {
      knownAccountTypeList.push({account: account, type: type});
    }

    knownAccountTypeList.length = 2;

    const amountByTimeChunkAndSrcDestTypeMap = new Map();

    console.log('distribution calculation STARTING');
    let knownAccountTypeNbr = 1;
    for (const knownAccountType of knownAccountTypeList) {
      const account = knownAccountType.account;
      const type = knownAccountType.type;
      console.log('distribution calculation STARTING', account, knownAccountTypeNbr, 'of', knownAccountTypeList.length);
      if (type != 'distributed-to-known') {
        await index.getDistributionOverTime(httpsRateLimit, historyChunkSize, timeChunkFn, knownAccountTypeMap, account, amountByTimeChunkAndSrcDestTypeMap);
        // console.log('distributionOverTime', distributionOverTime);
      }
      console.log('distribution calculation FINISHED', account, knownAccountTypeNbr, 'of', knownAccountTypeList.length);
      knownAccountTypeNbr++;
    }
    console.log('distribution calculation FINISHED');
    // console.log('amountByTimeChunkAndSrcDestTypeMap', amountByTimeChunkAndSrcDestTypeMap);

    const histogram = [];
    for (const [timeChunk, amountBySrcDestTypeMap] of amountByTimeChunkAndSrcDestTypeMap) {
      for (const [srcType, amountByDestTypeMap] of amountBySrcDestTypeMap) {
        for (const [destType, amount] of amountByDestTypeMap) {
          histogram.push({
            timeChunk: timeChunk,
            srcType: srcType,
            destType: destType,
            amount: amount.toFixed(2),
          });
        }
      }
    }

    // console.log('distribution', distribution);
    const outFileNm = process.argv[2];
    const outFilePtr = fs.openSync(outFileNm, 'w');
    fs.writeSync(outFilePtr, JSON.stringify(histogram, null, 2));
    fs.closeSync(outFilePtr);
  }
};

const runOrError = async () => {
  try {
    await run();
  } catch (error) {
    console.trace(error);
  }
};

runOrError();
