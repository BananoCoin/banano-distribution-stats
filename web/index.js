window.onLoad = async () => {
  await loadBananoDistributionStats();
};

// https://github.com/ricklupton/d3-sankey-diagram
const loadBananoDistributionStats = async () => {
  const response = await fetch('banano-distribution-stats.json', {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
    },
  });
  const responseJson = await response.json();

  const swimLaneSet = new Set();
  const timeChunkSet = new Set();
  responseJson.forEach((stat) => {
    timeChunkSet.add(stat.timeChunk);
    swimLaneSet.add(stat.srcType);
    swimLaneSet.add(stat.destType);
  });
  const timeChunks = Array.from(timeChunkSet);
  timeChunks.sort();
  // timeChunks.length = 5;
  const swimLaneArray = Array.from(swimLaneSet);
  swimLaneArray.sort();


  // source and team members at the top
  const swimLanes = [
    'source',
    'distributed-to-team-member',
    'distributed-to-unknown',
    'distributed-to-known',,
  ];

  for (swimLane of swimLaneArray) {
    if (swimLane != 'exchange') {
      if (!swimLanes.includes(swimLane)) {
        swimLanes.push(swimLane);
      }
    }
  }

  // exchange at the bottom
  swimLanes.push('exchange');

  const next = (timeChunk) => {
    const ix = timeChunks.indexOf(timeChunk);
    if (ix < timeChunks.length-1) {
      return timeChunks[ix+1];
    }
  };

  window.bananoDistributionStats = [];
  responseJson.forEach((stat) => {
    const nextTimeChunk = next(stat.timeChunk);
    if (nextTimeChunk !== undefined) {
      if (swimLanes.includes(stat.srcType) && swimLanes.includes(stat.destType)) {
        stat.amount = parseFloat(stat.amount);
        stat.nextTimeChunk = nextTimeChunk;
        stat.srcNode = stat.timeChunk + '-' + stat.srcType;
        stat.destNode = stat.nextTimeChunk + '-' + stat.destType;
        stat.title = stat.srcNode + '-' + stat.destNode;
        stat.reverseTitle = stat.destNode + '-' + stat.srcNode;
        stat.color = 'lightblue';
        if (stat.timeChunk !== '1970-01') {
          if (stat.amount > 0) {
            window.bananoDistributionStats.push(stat);
          }
        }
      }
    }
  });

  const sankeySvgElt = document.getElementById('sankeySvg');
  const w = 9000;
  const h = 1000;
  const y = 0;
  const x = 0;
  sankeySvgElt.setAttribute('width', '100rem');
  sankeySvgElt.setAttribute('viewBox', `${x} ${y} ${w} ${h-y}`);


  const sankey = {};
  sankey.links = [];
  sankey.groups = [];
  sankey.nodes = [];
  sankey.order = [];

  for (const timeChunk of timeChunks) {
    const group = {};
    group.title = timeChunk;
    group.nodes = [];

    for (const swimLane of swimLanes) {
      const nodeName = `${timeChunk}-${swimLane}`;
      group.nodes.push(nodeName);

      const node = {};
      node.title = nodeName;
      node.id = nodeName;
      sankey.nodes.push(node);
    }
    sankey.groups.push(group);
    sankey.order.push(group.nodes);
  }

  const sumByTimePeriodAndTypeMap = new Map();

  const add = (timeChunk, type, amount) => {
    if (!sumByTimePeriodAndTypeMap.has(timeChunk)) {
      sumByTimePeriodAndTypeMap.set(timeChunk, new Map());
    }
    const sumByTypeMap = sumByTimePeriodAndTypeMap.get(timeChunk);
    if (!sumByTypeMap.has(type)) {
      sumByTypeMap.set(type, 0);
    }
    const sum = sumByTypeMap.get(type);
    sumByTypeMap.set(type, sum + amount);
  };

  const get = (timeChunk, type) => {
    if (!sumByTimePeriodAndTypeMap.has(timeChunk)) {
      return 0;
    }
    const sumByTypeMap = sumByTimePeriodAndTypeMap.get(timeChunk);
    if (!sumByTypeMap.has(type)) {
      return 0;
    }
    const sum = sumByTypeMap.get(type);
    return sum;
  };

  window.bananoDistributionStats.forEach((stat) => {
    // console.log('stat', stat);
    if (stat.destType.startsWith('source')) {
    } else if (stat.srcType.startsWith('distributed') &&
        stat.destType.startsWith('distributed')) {
    } else {
      const link = {
        source: stat.srcNode,
        target: stat.destNode,
        value: stat.amount,
      };
      if (stat.srcType == 'source') {
        link.color = '#CCCC00';
      }
      if (stat.destType == 'distributed-to-burn') {
        link.color = 'pink';
      }
      // if((stat.srcType == 'distributed-to-unknown')
      //   && (stat.destType == 'distributed-to-unknown')) {
      //   link.color = 'red';
      // }

      if (timeChunks.includes(stat.timeChunk) &&
          timeChunks.includes(stat.nextTimeChunk)) {
        sankey.links.push(link);
        // console.log('src-link', link);
        // add(stat.timeChunk, stat.destType, -stat.amount);
        add(stat.nextTimeChunk, stat.destType, stat.amount);
      }
    }
  });

  const sumRight = () => {
    for (const timeChunk of timeChunks) {
      const nextTimeChunk = next(timeChunk);
      if (nextTimeChunk !== undefined) {
        for (const swimLane of swimLanes) {
          const prevAmount = get(timeChunk, swimLane);
          add(nextTimeChunk, swimLane, prevAmount);
        }
      }
    }
  };
  sumRight();

  for (const timeChunk of timeChunks) {
    const nextTimeChunk = next(timeChunk);
    if (nextTimeChunk !== undefined) {
      for (const swimLane of swimLanes) {
        const nn0 = `${timeChunk}-${swimLane}`;
        const nn1 = `${nextTimeChunk}-${swimLane}`;
        const a0 = get(timeChunk, swimLane);
        // console.log('nodeAmount', nodeAmount);
        if (a0 > 0) {
          const link = {
            source: nn0,
            target: nn1,
            value: a0,
          };
          if (swimLane == 'distributed-to-team-member') {
            link.color = 'green';
          }
          if (swimLane == 'distributed-to-bots') {
            link.color = 'gray';
          }
          if (swimLane == 'distributed-to-unknown') {
            link.color = 'brown';
          }
          if (swimLane == 'distributed-to-known') {
            link.color = 'blue';
          }
          if (swimLane == 'distributed-to-burn') {
            link.color = 'pink';
          }
          // console.log('link', link);
          if (timeChunks.includes(timeChunk) &&
            timeChunks.includes(nextTimeChunk)) {
            // console.log('link', link);
            sankey.links.push(link);
          }
        }
      }
    }
  }

  console.log('sankey', sankey);

  const layout = d3.sankey();
  layout.extent([[150, 10], [w-200, h+50]]);

  const diagram = d3.sankeyDiagram()
      .linkTitle(d3.sankeyLinkTitle(function(d) {
        return d.title;
      },
      function(d) {
        return d.title;
      },
      d3.format('.3s')))
      .linkColor(function(d) {
        return d.color;
      });

  layout.ordering(sankey.order);

  d3.select('#sankey svg')
      .datum(layout(sankey))
      .call(diagram.groups(sankey.groups));
};
