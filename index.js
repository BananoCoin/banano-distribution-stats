'use strict';
// libraries

// modules

// constants

// variables

// functions

const getDistributionOverTime = async (httpsRateLimit, historyChunkSize,
    timeChunkFn, knownAccountTypeMap, sourceAccount,
    amountSentByTimeChunkAndSrcDestTypeMap,
    amountReceivedByTimeChunkAndSrcDestTypeMap,
    whalewatch, debug, verbose, nbr, max, tier) => {
  let next;
  let stop = false;

  let srcType = 'distributed-to-' + tier;

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
    // console.log('accountHistoryReq', accountHistoryReq);
    if (next) {
      accountHistoryReq.head = next;
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

            const destAccount = historyElt.account;
            let destType = 'distributed-to-' + tier;
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
                destType = 'distributed-to-known';
                // console.log('tipbot', 'historyElt', historyElt);
                // console.log('tipbot', 'accountInfoResp', historyElt);
                // save type so we dont ahve to redo API call.
              }
              if (destAccount !== undefined) {
                knownAccountTypeMap.set(destAccount, destType);
              // } else {
                // console.log('historyElt', historyElt);
              }
            }

            const amount = parseFloat(historyElt.amount_decimal);
            const timeMs = historyElt.local_timestamp * 1000;
            // console.log('local_timestamp', getDate(timeMs));
            const localTimeChunk = timeChunkFn(timeMs);
            // console.log('historyElt.hash', historyElt.hash, localTimeChunk);
            // console.log('localTimeChunk', localTimeChunk);

            const amountBySrcDestTypeToMap = (map) => {
              let amountBySrcDestTypeMap;
              if (map.has(localTimeChunk)) {
                amountBySrcDestTypeMap = map.get(localTimeChunk);
              } else {
                amountBySrcDestTypeMap = new Map();
                map.set(localTimeChunk, amountBySrcDestTypeMap);
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
            };

            if ((historyElt.type == 'state') && (historyElt.subtype == 'send')) {
              /* istanbul ignore if */
              if (amount > 1000000) {
                if (verbose) {
                  console.log('distribution calculation CONTINUE',
                      nbr, 'of', max, 'whalewatch', localTimeChunk, amount,
                      srcType, '=>', destType, 'hash', historyElt.hash,
                      'sourceAccount', sourceAccount, 'destAccount', destAccount);
                }
                whalewatch.push({
                  amount: amount,
                  hash: historyElt.hash,
                  timeChunk: localTimeChunk,
                  srcType: srcType,
                  destType: destType,
                  sourceAccount: sourceAccount,
                  destAccount: destAccount,
                });
              }

              amountBySrcDestTypeToMap(amountSentByTimeChunkAndSrcDestTypeMap);
            }
            if ((historyElt.type == 'state') && (historyElt.subtype == 'receive')) {
              amountBySrcDestTypeToMap(amountReceivedByTimeChunkAndSrcDestTypeMap);
            }
          }
        };
      }
    }
    // console.log('accountHistoryResp.next', accountHistoryResp.next, accountHistoryResp.history.length);
    if (accountHistoryResp.next != undefined) {
      next = accountHistoryResp.next;
    }
    if (next !== undefined) {
      stop = false;
    }
    if (debug) {
      // console.log('processedBlockHashSet.size', processedBlockHashSet.size, 'of', historyChunkSize);
      if (processedBlockHashSet.size > historyChunkSize) {
        stop = true;
      }
    }
    /* istanbul ignore if */
    if (verbose) {
      console.log('distribution calculation CONTINUE', nbr, 'of', max, processedBlockHashSet.size, 'blocks', 'stop', stop, 'next', accountHistoryResp.next);
    }
  }
};

exports.getDistributionOverTime = getDistributionOverTime;
