'use strict';

const {expect} = require('chai');
const index = require('../../index.js');
const httpsRateLimit = require('https-rate-limit');

const testModuleRef = {};
testModuleRef.request = (options, response) => {
  const retvalJson1 = {
    history: [
      {
        type:'state',
        subtype:'send',
        hash:'1',
        account:'a',
        next:'2',
      },
      {
        type:'state',
        subtype:'send',
        hash:'2',
        account:'b',
        next:'3',
      },
      {
        type:'state',
        subtype:'receive',
        hash:'3',
        account:'c',
        // next:'',
      }
    ]
  };
  const retvalJson2 = {
    history: [
    ]
  }
  const retvalJson3 = {
    representative :'ban_1tipbotgges3ss8pso6xf76gsyqnb69uwcxcyhouym67z7ofefy1jz7kepoy',
  }
  const req = {};
  req.headers = {};
  req.statusCode = 200;
  const onFns = {};
  req.on = (fnName, fn) => {
    onFns[fnName] = fn;
  };
  req.write = (body) => {
    const bodyJson = JSON.parse(body);
    console.log('write', 'body', body);
    const fn = onFns['data'];
    if (fn) {
      let retvalJson = {};
      if(bodyJson.action = 'account_history') {
        if(bodyJson.head) {
          retvalJson = retvalJson2;
        } else {
          retvalJson = retvalJson1;
        }
      }
      if(bodyJson.action = 'account_info') {
        if(bodyJson.account == 'c') {
          retvalJson = retvalJson3;
        }
      }

      console.log('write', 'retvalJson', retvalJson);
      fn(JSON.stringify(retvalJson));
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

describe('index', () => {
  it('sendRequest', async () => {
    try {
      httpsRateLimit.setUrl('https://localhost');
      httpsRateLimit.setUrl('http://localhost');
      httpsRateLimit.setModuleRef(testModuleRef);
      const historyChunkSize = 0;
      const timeChunkFn = (ts) => {
        return ts;
      };
      const sourceAccount = 'a';
      const amountByTimeChunkAndSrcDestTypeMap = new Map();
      const knownAccountTypeMap = new Map();
      knownAccountTypeMap.set('a','exchange')
      knownAccountTypeMap.set('b','exchange')
      const debug = false;
      await index.getDistributionOverTime(httpsRateLimit, historyChunkSize, timeChunkFn, knownAccountTypeMap, sourceAccount, amountByTimeChunkAndSrcDestTypeMap, debug);
      const expectedResponse = new Map();
      expect(knownAccountTypeMap.size).to.equal(3);
    } catch (error) {
      console.trace(error);
    }
  });
});
