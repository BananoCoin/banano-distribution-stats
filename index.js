'use strict';
// libraries

// modules

// constants

// variables

// functions
const getDate = (ts) => {
  // console.log('getDate', ts);
  return new Date(ts)
      .toISOString()
      .replace('T', ' ')
      .replace('.000Z', '');
};
const getDistributionOverTime = async (httpsRateLimit, historyChunkSize, timeChunkSizeMs, account) => {
  let previous;
  let stop = false;
  const rawByTimeChunk = new Map();
  while (!stop) {
    // by default stop.
    stop = true;
    const req = {
      action: 'account_history',
      account: account,
      count: historyChunkSize,
    };
    if (previous) {
      req.previous = previous;
    }
    const resp = await httpsRateLimit.sendRequest(req);
    if (resp.history) {
      if (resp.history.length > 0) {
        previous = undefined;
        resp.history.forEach((historyElt) => {
          // console.log('historyElt', historyElt);
          const amount = BigInt(historyElt.amount);
          const timeMs = historyElt.local_timestamp * 1000;
          // console.log('local_timestamp', getDate(timeMs));
          const localTimeChunk = Math.floor(timeMs / timeChunkSizeMs);
          // console.log('localTimeChunk', localTimeChunk);
          if (rawByTimeChunk.has(localTimeChunk)) {
            const newAmount = amount + rawByTimeChunk.get(localTimeChunk);
            rawByTimeChunk.set(localTimeChunk, newAmount);
          } else {
            rawByTimeChunk.set(localTimeChunk, amount);
          }

          previous = historyElt.previous;
        });
        // if there's more history, get it.
        if (previous !== undefined) {
          stop = false;
        }
      }
    }
  }
  const histogram = [];
  for (const [chunk, count] of rawByTimeChunk) {
    const key = getDate(chunk*timeChunkSizeMs);
    histogram.push({
      bucket: key,
      count: count.toString(),
    });
  }

  // loggingUtil.log(dateUtil.getDate(), 'histogramMap', histogramMap);
  // loggingUtil.log(dateUtil.getDate(), 'histogram', JSON.stringify(histogram));

  return {    account: account,histogram:histogram};
};

exports.getDistributionOverTime = getDistributionOverTime;
