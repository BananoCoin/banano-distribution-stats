'use strict';
// libraries

// modules

// constants

// variables

// functions

const getDistributionOverTime = async (httpsRateLimit, historyChunkSize, timeChunkFn, knownAccountTypeMap, sourceAccount, amountByTimeChunkAndSrcDestTypeMap) => {
  let next;
  let stop = false;

  let srcType = 'distributed-to-unknown';

  if (knownAccountTypeMap.has(sourceAccount)) {
    srcType = knownAccountTypeMap.get(sourceAccount);
  }
  // console.log('knownAccountTypeMap', knownAccountTypeMap);

  const processedBlockHashSet = new Set();
  while (!stop) {
    // by default stop.
    stop = true;
    const accountHistoryReq = {
      action: 'account_history',
      account: sourceAccount,
      count: historyChunkSize,
      reverse: 'true',
      // raw: 'true',
    };
    if (next) {
      req.head = next;
    }

    // do not reuse next hash
    next = undefined;

    const accountHistoryResp = await httpsRateLimit.sendRequest(accountHistoryReq);
    // console.log('accountHistoryResp', accountHistoryResp);
    if (accountHistoryResp.history) {
      if (accountHistoryResp.history.length > 0) {
        for (const historyElt of accountHistoryResp.history) {
        // for (let historyIx = 0; historyIx < accountHistoryResp.history.length; historyIx++) {
          // const historyElt = accountHistoryResp.history[historyIx];
          // console.log('historyElt', historyElt);
          if (!processedBlockHashSet.has(historyElt.hash)) {
            processedBlockHashSet.add(historyElt.hash);
            if (historyElt.type == 'send') {
              const destAccount = historyElt.account;
              const amount = parseFloat(historyElt.amount_decimal);
              const timeMs = historyElt.local_timestamp * 1000;
              // console.log('local_timestamp', getDate(timeMs));
              const localTimeChunk = timeChunkFn(timeMs);
              // console.log('historyElt.hash', historyElt.hash, localTimeChunk);
              // console.log('localTimeChunk', localTimeChunk);
              let amountBySrcDestTypeMap;
              if (amountByTimeChunkAndSrcDestTypeMap.has(localTimeChunk)) {
                amountBySrcDestTypeMap = amountByTimeChunkAndSrcDestTypeMap.get(localTimeChunk);
              } else {
                amountBySrcDestTypeMap = new Map();
                amountByTimeChunkAndSrcDestTypeMap.set(localTimeChunk, amountBySrcDestTypeMap);
              }

              let amountByDestTypeMap;
              if (amountBySrcDestTypeMap.has(srcType)) {
                amountByDestTypeMap = amountBySrcDestTypeMap.get(srcType);
              } else {
                amountByDestTypeMap = new Map();
                amountBySrcDestTypeMap.set(srcType, amountByDestTypeMap);
              }

              let destType = 'distributed-to-unknown';
              if (knownAccountTypeMap.has(destAccount)) {
                destType = knownAccountTypeMap.get(destAccount);
              }
              if (destType == 'distributed-to-unknown') {
                const accountInfoReq = {
                  action: 'account_info',
                  account: destAccount,
                  representative: true,
                  weight: true,
                  pending: true,
                };
                const accountInfoResp = await httpsRateLimit.sendRequest(accountInfoReq);
                // console.log('accountInfoResp', accountInfoResp);
                if (accountInfoResp.representative == 'ban_1tipbotgges3ss8pso6xf76gsyqnb69uwcxcyhouym67z7ofefy1jz7kepoy') {
                  destType = 'distributed-to-known';
                  // save type so we dont ahve to redo API call.
                  knownAccountTypeMap.set(destAccount, destType);
                }
              }

              if (destType == 'distributed-to-unknown') {
                // const senderType = knownAccountTypeMap.get(sourceAccount);
                // console.log('unknown account', senderType, '=>', destAccount, amount, localTimeChunk, historyElt);
                // throw Error('unknown account');
                knownAccountTypeMap.set(destAccount, 'distributed-to-unknown');
              }

              let oldAmount = 0.0;
              if (amountByDestTypeMap.has(destType)) {
                oldAmount = amountByDestTypeMap.get(destType);
              }
              const newAmount = oldAmount + amount;

              amountByDestTypeMap.set(destType, newAmount);
            }
          }

          next = historyElt.next;
        };

        // if there's more history, get it.
        if (next !== undefined) {
          stop = false;
        }
      }
    }
  }
};

exports.getDistributionOverTime = getDistributionOverTime;
