'use strict';
const fs = require('fs');
const path = require('path');

const httpsRateLimit = require('https-rate-limit');
const index = require('./index.js');

const DEBUG = true;
const VERBOSE = true;

const NON_APHANUMERIC_REGEX = new RegExp('[^a-zA-Z0-9]+', 'g');

const run = async () => {
  console.log('banano-distribution-stats');
  if (process.argv.length < 6) {
    console.log('#usage:');
    console.log('npm start <known-account-url> <add-hardcoded-accounts> <histogram-outfile> <whalewatch-outfile> <known-account-outfile> <url>');
  } else {
    let knownAccountsUrl = process.argv[2];
    const addHardcodedAccounts = process.argv[3];
    const histogramOutFileNm = process.argv[4];
    const whalewatchOutFileNm = process.argv[5];
    const knownAccountOutFileNm = process.argv[6];
    const url = process.argv[7];

    let historyChunkSize = 1000;
    // chunk into days
    const timeChunkFn = (ts) => {
      const isoStr = new Date(ts)
          .toISOString();
      const yearMonth = isoStr.substring(0, 7);
      return yearMonth;
    };
    const knownAccountTypeMap = new Map();

    // console.log('knownAccountsUrl', knownAccountsUrl);
    if (!knownAccountsUrl.startsWith('http')) {
      knownAccountsUrl=new URL(`file://${path.resolve(knownAccountsUrl)}`).href;
    }
    httpsRateLimit.setUrl(knownAccountsUrl);
    if (httpsRateLimit.getModuleRef() == undefined) {
      const fileRequest = {};
      fileRequest.request = (options, response) => {
        // console.log('options', options);
        const retval = fs.readFileSync(options.path, 'UTF8');
        const req = {};
        req.headers = {};
        req.statusCode = 200;
        const onFns = {};
        req.on = (fnName, fn) => {
          onFns[fnName] = fn;
        };
        req.write = (body) => {
          // console.log('write', 'onFns', onFns);
          const fn = onFns['data'];
          if (fn) {
            fn(retval);
          }
        };
        req.end = () => {
          // console.log('end', 'onFns', onFns);
          const fn = onFns['end'];
          if (fn) {
            fn();
          }
        };
        response(req);
        return req;
      };
      httpsRateLimit.setModuleRef(fileRequest);
    }
    const knownAccountsResponse = await httpsRateLimit.sendRequest({includeType: true});
    // console.log('knownAccountsResponse', knownAccountsResponse);
    knownAccountsResponse.forEach((knownAccountElt) => {
      const account = knownAccountElt.address;
      const type = knownAccountElt.type;
      const alias = knownAccountElt.alias.replaceAll(NON_APHANUMERIC_REGEX, ' ').toLowerCase().trim().replaceAll(' ', '-');
      // console.log('knownAccountElt', account, type, alias);
      // console.log(`alias:'${alias}'`);
      if (knownAccountTypeMap.has(account)) {
        const oldType = knownAccountTypeMap.get(type);
        throw Error(`account '${account}' listed twice as '${type}' and '${oldType}'`);
      }
      switch (type) {
        case 'distribution':
          knownAccountTypeMap.set(account, 'source');
          break;
        case 'exchange':
          knownAccountTypeMap.set(account, 'exchange');
          break;
        case 'faucet':
          knownAccountTypeMap.set(account, `distributed-to-${type}-${alias}`);
          break;
        case 'event':
        case 'burn':
        case 'team-member':
        case 'intermediate':
          knownAccountTypeMap.set(account, `distributed-to-${type}`);
          break;
        case 'inactive-team-member':
        case 'representative':
        case 'service':
        case 'donation':
        case 'gambling':
          knownAccountTypeMap.set(account, 'distributed-to-known');
          break;
        default:
          console.log('unknown account type', type, knownAccountElt);
      }
    });

    if (addHardcodedAccounts == 'true') {
      knownAccountTypeMap.set('ban_1boompow14irck1yauquqypt7afqrh8b6bbu5r93pc6hgbqs7z6o99frcuym', 'distributed-to-boompow');
      knownAccountTypeMap.set('ban_3fo1d1ng6mfqumfoojqby13nahaugqbe5n6n3trof4q8kg5amo9mribg4muo', 'distributed-to-fo1d1ng');
      knownAccountTypeMap.set('ban_1d59mzcc7yyuixyzc7femupc76yjsuoko79mm7y8td461opcpgiphjxjcje7', 'source');
      knownAccountTypeMap.set('ban_1bun4a6xbrawe1ugqspyx9zf7wy7kurrmsgr9sodmyatp74xdx6qwki4fwx8', 'source');
      knownAccountTypeMap.set('ban_3eg7hsqtt84sr6fyfgpemazhqdj5gnir7q7gxrmt4mozndehnt6un73y51u9', 'source');
      knownAccountTypeMap.set('ban_3bonus9fwjnwjoyawbdbokze51iucgqwtdyk6e4kqdu39rw8nyzmew5ptxoj', 'source');
    }


    // for (const [account, type] of knownAccountTypeMap) {
    //   console.log('known account type', account, type);
    // }
    // console.log('url', url);
    httpsRateLimit.setUrl(url);

    const knownAccountTypeList = [];
    for (const [account, type] of knownAccountTypeMap) {
      // exchanges aren't distribution, so don't trace the transactions.
      // if (type != 'exchange') {
      knownAccountTypeList.push({account: account, type: type});
      // }
    }

    if (DEBUG) {
      knownAccountTypeList.length = 3;
      historyChunkSize = 1000;
    }

    const amountSentByTimeChunkAndSrcDestTypeMap = new Map();
    const amountReceivedByTimeChunkAndSrcDestTypeMap = new Map();
    const whalewatch = [];

    console.log('distribution calculation STARTING');
    let knownAccountTypeNbr = 1;
    for (const knownAccountType of knownAccountTypeList) {
      const account = knownAccountType.account;
      const type = knownAccountType.type;
      console.log('distribution calculation STARTING', knownAccountTypeNbr, 'of', knownAccountTypeList.length, type, account);
      await index.getDistributionOverTime(httpsRateLimit, historyChunkSize,
          timeChunkFn, knownAccountTypeMap, account,
          amountSentByTimeChunkAndSrcDestTypeMap,
          amountReceivedByTimeChunkAndSrcDestTypeMap,
          whalewatch, DEBUG, VERBOSE,
          knownAccountTypeNbr, knownAccountTypeList.length, 'unknown-tier-01');
      // console.log('distributionOverTime', distributionOverTime);
      console.log('distribution calculation FINISHED', knownAccountTypeNbr, 'of', knownAccountTypeList.length, type, account);
      knownAccountTypeNbr++;
    }

    /*
    const unknownAccountTypeTierTwoList = [];

    for (const [account, type] of knownAccountTypeMap) {
      // console.log('knownAccountTypeMap', account, type);
      if (type == 'distributed-to-unknown-tier-01') {
        unknownAccountTypeTierTwoList.push({
          account: account,
          type: type,
        });
      }
    }

    if (DEBUG) {
      unknownAccountTypeTierTwoList.length = 3;
    }

    let unknownAccountTypeTierTwoNbr = 1;
    for (const unknownAccountTypeTierTwo of unknownAccountTypeTierTwoList) {
      // console.log('unknownAccountTypeTierTwo', unknownAccountTypeTierTwo);
      const account = unknownAccountTypeTierTwo.account;
      const type = unknownAccountTypeTierTwo.type;
      console.log('distribution calculation STARTING', unknownAccountTypeTierTwoNbr, 'of', unknownAccountTypeTierTwoList.length, type, account);
      await index.getDistributionOverTime(httpsRateLimit, historyChunkSize,
          timeChunkFn, knownAccountTypeMap, account,
          amountSentByTimeChunkAndSrcDestTypeMap,
          amountReceivedByTimeChunkAndSrcDestTypeMap,
          whalewatch, DEBUG, VERBOSE,
          knownAccountTypeNbr, knownAccountTypeList.length, 'unknown-tier-02');
      // console.log('distributionOverTime', distributionOverTime);
      console.log('distribution calculation FINISHED', unknownAccountTypeTierTwoNbr, 'of', unknownAccountTypeTierTwoList.length, type, account);
      unknownAccountTypeTierTwoNbr++;
    }
    */

    console.log('distribution calculation FINISHED');
    // console.log('amountSentByTimeChunkAndSrcDestTypeMap', amountSentByTimeChunkAndSrcDestTypeMap);

    const histogram = [];

    for (const [timeChunk, amountBySrcDestTypeMap] of amountSentByTimeChunkAndSrcDestTypeMap) {
      for (const [srcType, amountByDestTypeMap] of amountBySrcDestTypeMap) {
        for (const [destType, amount] of amountByDestTypeMap) {
          histogram.push({
            timeChunk: timeChunk,
            srcType: srcType,
            destType: destType,
            amount: amount.toFixed(2),
            direction: 'sent',
          });
        }
      }
    }

    for (const [timeChunk, amountBySrcDestTypeMap] of amountReceivedByTimeChunkAndSrcDestTypeMap) {
      for (const [srcType, amountByDestTypeMap] of amountBySrcDestTypeMap) {
        for (const [destType, amount] of amountByDestTypeMap) {
          histogram.push({
            timeChunk: timeChunk,
            srcType: srcType,
            destType: destType,
            amount: amount.toFixed(2),
            direction: 'received',
          });
        }
      }
    }

    const knownAccount = [];
    for (const [account, type] of knownAccountTypeMap) {
      knownAccount.push({
        address: account,
        type: type,
      });
    }

    // console.log('distribution', distribution);
    const histogramOutFilePtr = fs.openSync(histogramOutFileNm, 'w');
    fs.writeSync(histogramOutFilePtr, JSON.stringify(histogram, null, 2));
    fs.closeSync(histogramOutFilePtr);

    const whalewatchOutFilePtr = fs.openSync(whalewatchOutFileNm, 'w');
    fs.writeSync(whalewatchOutFilePtr, JSON.stringify(whalewatch, null, 2));
    fs.closeSync(whalewatchOutFilePtr);

    const knownAccountOutFilePtr = fs.openSync(knownAccountOutFileNm, 'w');
    fs.writeSync(knownAccountOutFilePtr, JSON.stringify(knownAccount, null, 2));
    fs.closeSync(knownAccountOutFilePtr);
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
