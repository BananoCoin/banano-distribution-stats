'use strict';
// libraries

// modules

// constants

// variables

// functions
const getDistributionOverTime = async (httpsRateLimit, historyChunkSize, timeChunkSizeMs, account) => {
  let previous;
  let stop = false;
  const rawByTimestamp = new Map();
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
          console.log('historyElt', historyElt);
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
  for (const [mapSecond, count] of rawByTimestamp) {
    const key = new Date(mapSecond*1000)
        .toISOString()
        .replace('T', ' ')
        .replace('.000Z', '');
    histogram.push({
      bucket: key,
      count: count,
    });
  }

  // loggingUtil.log(dateUtil.getDate(), 'histogramMap', histogramMap);
  // loggingUtil.log(dateUtil.getDate(), 'histogram', JSON.stringify(histogram));

  return histogram;
};

exports.getDistributionOverTime = getDistributionOverTime;
