'use strict';
const fs = require('fs');

const httpsRateLimit = require('https-rate-limit');
const index = require('./index.js');

const DEBUG = false;
const VERBOSE = true;

const run = async () => {
  console.log('banano-distribution-stats');
  if (process.argv.length < 4) {
    console.log('#usage:');
    console.log('npm start <histogram-outfile> <whalewatch-outfile> <url>');
  } else {
    let historyChunkSize = 1000;
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
          knownAccountTypeMap.set(account, 'exchange');
          break;
        case 'burn':
          knownAccountTypeMap.set(account, 'burn');
        case 'team-member':
          knownAccountTypeMap.set(account, `distributed-to-${type}`);
          break;
        case 'representative':
        case 'service':
        case 'donation':
        case 'gambling':
          knownAccountTypeMap.set(account, 'distributed-to-unknown');
          break;
        default:
          console.log('unknown account type', type, knownAccountElt);
      }
    });

    knownAccountTypeMap.set('ban_1boompow14irck1yauquqypt7afqrh8b6bbu5r93pc6hgbqs7z6o99frcuym', 'source-boompow');
    knownAccountTypeMap.set('ban_3fo1d1ng6mfqumfoojqby13nahaugqbe5n6n3trof4q8kg5amo9mribg4muo', 'source-folding');
    knownAccountTypeMap.set('ban_1d59mzcc7yyuixyzc7femupc76yjsuoko79mm7y8td461opcpgiphjxjcje7', 'source-cfc');
    knownAccountTypeMap.set('ban_1bun4a6xbrawe1ugqspyx9zf7wy7kurrmsgr9sodmyatp74xdx6qwki4fwx8', 'source-cfc');
    knownAccountTypeMap.set('ban_3eg7hsqtt84sr6fyfgpemazhqdj5gnir7q7gxrmt4mozndehnt6un73y51u9', 'source-bananochan');


    // for (const [account, type] of knownAccountTypeMap) {
    //   console.log('known account type', account, type);
    // }
    const histogramOutFileNm = process.argv[2];
    const whalewatchOutFileNm = process.argv[3];
    const url = process.argv[4];
    // console.log('url', url);
    httpsRateLimit.setUrl(url);

    const knownAccountTypeList = [];
    for (const [account, type] of knownAccountTypeMap) {
      knownAccountTypeList.push({account: account, type: type});
    }

    if (DEBUG) {
      knownAccountTypeList.length = 3;
      historyChunkSize = 1000;
    }

    const amountByTimeChunkAndSrcDestTypeMap = new Map();
    const whalewatch = [];

    console.log('distribution calculation STARTING');
    let knownAccountTypeNbr = 1;
    for (const knownAccountType of knownAccountTypeList) {
      const account = knownAccountType.account;
      const type = knownAccountType.type;
      console.log('distribution calculation STARTING', account, knownAccountTypeNbr, 'of', knownAccountTypeList.length);
      if (type != 'distributed-to-known') {
        await index.getDistributionOverTime(httpsRateLimit, historyChunkSize, timeChunkFn, knownAccountTypeMap, account, amountByTimeChunkAndSrcDestTypeMap, whalewatch, DEBUG, VERBOSE);
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
    const histogramOutFilePtr = fs.openSync(histogramOutFileNm, 'w');
    fs.writeSync(histogramOutFilePtr, JSON.stringify(histogram, null, 2));
    fs.closeSync(histogramOutFilePtr);

    const whalewatchOutFilePtr = fs.openSync(whalewatchOutFileNm, 'w');
    fs.writeSync(whalewatchOutFilePtr, JSON.stringify(whalewatch, null, 2));
    fs.closeSync(whalewatchOutFilePtr);
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
