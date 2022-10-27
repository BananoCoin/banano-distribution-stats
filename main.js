'use strict';
const fs = require('fs');
const path = require('path');

const httpsRateLimit = require('https-rate-limit');
const index = require('./index.js');

const DEBUG = false;
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

      knownAccountTypeMap.set('ban_1emusk6m8hypb46dbp6eaiu3j6xjwwwaqw98y6hqyje53ncjciyqzj3skt9n', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_1xs6m9ty5m9j33nhkz4eurwgmq5fsccb75x7jdtj3kg9nq53mwocec3wtm66', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_14bi5cgyx48ipuqt4gibj7b94pxm1z3gham64x59bipcrb4hbc549xhp9qfn', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_1iz1pd1fi3piqckc4whzp57eng1m8zq5bfmq57zry349r6xa83tm6mqfzow7', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_1a8tg5onfi5inqnt3ebk5foo1kqmh184573htd8mo7b4jxsjxmtwgkq498re', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_1nj7ioqdhfbtrni7ernd1trns913j353mroct8kwgfqpa9qxfnjamwmjxw8d', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_1r45wkw7ihb9essjph118sb9sb6hitp1uhqyjawxs1i4sp66hk5ia5gg1gjp', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_1tryxk8axw749jpiaqwsie5hfod44myacxoziq3e34kb3u1y5cpsu8x5owfz', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_15wetsxmdnbiodc88mtnnicitfq9q3phf6p9jzdtwg8jznsxzbyiqhpbgsa8', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_1xu9anz8ay4apq8rp4wfbp9z96ub66stior58izz6wtxjt8bbthm93t1eu95', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_1qozktkhq41jnyr5zkhcs96rmio3cdq7yta6a7jzpkaf84yc78ptknxyig3m', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_185mdymw76au8bo6n5nhuuey6oiy7eme4kurn1khsg97kq48efse5c4dr7sq', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_3qnz1d7r4qoegrz91yui7wcwcmjyncwiri93qm5yhpsjz3d93sdd49p1t4dr', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_3fbwoui6g4yo8xqpps1oeb7dgsebec6y7k6ydyu49gdug99iaxykrpfem3sc', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_1o3y9b47ajkprq5wqdcyab76a5fxcuhew8pz87cxrmafjtfwsemfk1n7qf91', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_1rmse8d3s481xd4rq1raikt6nhjwjm64cjhw1egsjzt1xnssky1hw5mtmmap', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_33qepew3f47hyob47axpyuqro7tc8wakebtpjodq19e431gn31t64mzhfeas', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_1759rj8snfk7wko4ypy8efff5owcafey4bqk3u8j5q4prm6ua7yxjqtnmooz', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_13g6jmb7kpw8r19is3hnuduh99ng7f16k7adaiidou5ak9kif8orqrd34tbs', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_1q4xzd4cxpyw54638r5wyefsdwojp4pdpi744rnyrrbi6rpdgy1adahhi3kn', 'exchanged-emusk');
      knownAccountTypeMap.set('ban_3xitg1oghw96h59cujfzhg8mh87o9sxp46nznugmgnt3cemik4keq7q6zcrs', 'exchanged-emusk');
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
