'use strict';

const httpsRateLimit = require('https-rate-limit');
const index = require('./index.js');

const run = async () => {
  console.log('banano-distribution-stats');
  if (process.argv.length < 2) {
    console.log('#usage:');
    console.log('npm start <url>');
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
          knownAccountTypeMap.set(account, 'gray');
          break;
        default:
          console.log('unknown account type', type, knownAccountElt);
      }
    });
    // for (const [account, type] of knownAccountTypeMap) {
    //   console.log('known account type', account, type);
    // }

    const url = process.argv[2];
    // console.log('url', url);
    httpsRateLimit.setUrl(url);

    const distribution = [];

    const knownAccountTypeList = [];
    for (const [account, type] of knownAccountTypeMap) {
      knownAccountTypeList.push({account: account, type: type});
    }

    for (const knownAccountType of knownAccountTypeList) {
      const account = knownAccountType.account;
      const type = knownAccountType.type;
      console.log('distribution calculation STARTING', account, distribution.length, 'of', knownAccountTypeList.length);
      if (type != 'gray') {
        const distributionOverTime = await index.getDistributionOverTime(httpsRateLimit, historyChunkSize, timeChunkFn, knownAccountTypeMap, account);
        distribution.push(distributionOverTime);
      }
      console.log('distribution calculation FINISHED', account, distribution.length, 'of', knownAccountTypeList.length);
    }
    console.log('distribution', distribution);
  }
};

run();
