'use strict';
// libraries

// modules

// constants

// variables

// functions

const getDistributionOverTime = async (httpsRateLimit, historyChunkSize, timeChunkFn, knownAccountTypeMap, sourceAccount, amountByTimeChunkAndSrcDestTypeMap, debug) => {
  let previous;
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
      reverse: true,
      raw: true,
    };
    if (previous) {
      accountHistoryReq.head = previous;
    }

    // do not reuse previous hash
    previous = undefined;

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

            const destAccount = historyElt.account;
            let destType = 'distributed-to-unknown';
            if (knownAccountTypeMap.has(destAccount)) {
              destType = knownAccountTypeMap.get(destAccount);
            } else {
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
                destType = 'distributed-to-tipbot';
                // console.log('tipbot', 'historyElt', historyElt);
                // console.log('tipbot', 'accountInfoResp', historyElt);
                // save type so we dont ahve to redo API call.
              }
              knownAccountTypeMap.set(destAccount, destType);
            }

            let addAmountToMap = false;

            if (historyElt.type == 'state' && historyElt.subtype == 'receive') {
              if (srcType == 'exchange') {
                // console.log('srcType', srcType, 'destType', destType, historyElt);
                if (destType.startsWith('distributed-to-')) {
                  // if we are recieving at an exchange from a distributed account
                  // record it as a send with swapped types.
                  const reverseSrcType = destType;
                  const reverseDestType = srcType;

                  destType = reverseDestType;
                  srcType = reverseSrcType;

                  addAmountToMap = true;
                }
              }
            }
            if ((historyElt.type == 'state') && (historyElt.subtype == 'send')) {
              addAmountToMap = true;
            }

            // console.log('addAmountToMap', historyElt.type , historyElt.subtype, addAmountToMap);

            if (addAmountToMap) {
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

              let oldAmount = 0.0;
              if (amountByDestTypeMap.has(destType)) {
                oldAmount = amountByDestTypeMap.get(destType);
              }
              const newAmount = oldAmount + amount;

              amountByDestTypeMap.set(destType, newAmount);
            }
          }

          // console.log('historyElt.previous', historyElt.previous);
          if (historyElt.previous != undefined) {
            previous = historyElt.previous;
          }
        };

        if (previous !== undefined) {
          stop = false;
        }
      }
    }
    if (debug) {
      // console.log('processedBlockHashSet.size', processedBlockHashSet.size, 'of', historyChunkSize);
      if (processedBlockHashSet.size > historyChunkSize) {
        stop = true;
      }
    }
    console.log('distribution calculation CONTINUE', processedBlockHashSet.size, 'blocks', 'stop', stop);
  }
};

exports.getDistributionOverTime = getDistributionOverTime;
