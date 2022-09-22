window.onLoad = async () => {
  await loadBananoDistributionStats();
};

const MAXIMUM_SUPPLY = 3400000000;

// https://github.com/ricklupton/d3-sankey-diagram
const loadBananoDistributionStats = async () => {
  const response = await fetch('banano-distribution-stats.json', {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
    },
  });
  const responseJson = await response.json();

  const directionSet = new Set();
  const swimLaneSet = new Set();
  const timeChunkSet = new Set();
  responseJson.forEach((stat) => {
    if (stat.direction == undefined) {
      stat.direction = 'sent';
    }
    timeChunkSet.add(stat.timeChunk);
    swimLaneSet.add(stat.srcType);
    swimLaneSet.add(stat.destType);
    directionSet.add(stat.direction);
  });
  const timeChunks = Array.from(timeChunkSet);
  timeChunks.sort();

  // timeChunks.length = 8;
  directionSet.delete('received');

  const swimLaneArray = Array.from(swimLaneSet);
  swimLaneArray.sort();

  const directions = Array.from(directionSet);
  directions.sort();


  // burn, source, known, and team members at the top
  const swimLanes = [
    'source',
    'distributed-to-burn',
    'distributed-to-team-member',
    'distributed-to-known',
  ];

  for (swimLane of swimLaneArray) {
    if (swimLane != 'exchange') {
      if (swimLane != 'distributed-to-unknown') {
        if (!swimLanes.includes(swimLane)) {
          swimLanes.push(swimLane);
        }
      }
    }
  }

  // distributed-to-unknown, exchange at the bottom
  swimLanes.push('distributed-to-unknown');
  swimLanes.push('exchange');

  const next = (timeChunk) => {
    const ix = timeChunks.indexOf(timeChunk);
    if (ix < timeChunks.length-1) {
      return timeChunks[ix+1];
    }
  };

  const prev = (timeChunk) => {
    const ix = timeChunks.indexOf(timeChunk);
    if (ix > 0) {
      return timeChunks[ix-1];
    }
  };

  window.bananoDistributionStats = [];
  responseJson.forEach((stat) => {
    stat.amount = parseFloat(stat.amount);
    if (stat.timeChunk !== '1970-01') {
      if (stat.amount > 0) {
        if (swimLanes.includes(stat.srcType) && swimLanes.includes(stat.destType)) {
          if (stat.direction == 'received') {
            const prevTimeChunk = prev(stat.timeChunk);
            if (prevTimeChunk !== undefined) {
              stat.prevTimeChunk = prevTimeChunk;
              stat.srcNode = `${stat.prevTimeChunk}-${stat.destType}(${stat.direction})`;
              stat.destNode = `${stat.timeChunk}-${stat.srcType}(${stat.direction})`;
              stat.color = 'pink';
              window.bananoDistributionStats.push(stat);
            }
          }
          if (stat.direction == 'sent') {
            const nextTimeChunk = next(stat.timeChunk);
            if (nextTimeChunk !== undefined) {
              stat.nextTimeChunk = nextTimeChunk;
              stat.srcNode = `${stat.timeChunk}-${stat.srcType}(${stat.direction})`;
              stat.destNode = `${stat.nextTimeChunk}-${stat.destType}(${stat.direction})`;
              stat.color = 'lightblue';
              window.bananoDistributionStats.push(stat);
            }
          }
        }
      }
    }
  });

  const sankeySvgElt = document.getElementById('sankeySvg');
  const w = 9000;
  const h = 3000;
  const y = 0;
  const x = 0;
  sankeySvgElt.setAttribute('width', '100rem');
  sankeySvgElt.setAttribute('viewBox', `${x} ${y} ${w} ${h-y}`);


  const sankey = {};
  sankey.links = [];
  sankey.groups = [];
  sankey.nodes = [];
  sankey.order = [];

  const nodeNameSet = new Set();

  for (const timeChunk of timeChunks) {
    const group = {};
    group.title = timeChunk;
    group.nodes = [];

    for (const swimLane of swimLanes) {
      for (const direction of directions) {
        const nodeName = `${timeChunk}-${swimLane}(${direction})`;
        nodeNameSet.add(nodeName);
        group.nodes.push(nodeName);

        const node = {};
        node.title = nodeName;
        node.id = nodeName;
        sankey.nodes.push(node);
      }
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
    if (stat.srcType.startsWith('source') &&
        stat.destType.startsWith('source')) {
    } else if (stat.direction.startsWith('received') &&
        stat.srcType.startsWith('source')) {
    } else if (stat.direction.startsWith('received') &&
        stat.destType.startsWith('source')) {
    } else if (stat.srcType.startsWith('distributed') &&
        stat.destType.startsWith('source')) {
    } else if (stat.srcType.startsWith('distributed') &&
        stat.destType.startsWith('distributed')) {
    } else {
      const link = {
        source: stat.srcNode,
        target: stat.destNode,
        value: stat.amount,
      };
      if (stat.direction == 'received') {
        if (stat.srcType == 'exchange') {
          link.color = 'orange';
        }
      }
      if (stat.direction == 'sent') {
        if (stat.srcType == 'source') {
          link.color = '#CCCC00';
        }
        if (stat.destType == 'distributed-to-burn') {
          link.color = 'pink';
        }

        add(stat.nextTimeChunk, stat.destType, stat.amount);
      }
      if (nodeNameSet.has(link.source) && nodeNameSet.has(link.target)) {
        sankey.links.push(link);
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

  const addSupply = () => {
    for (const timeChunk of timeChunks) {
      const nextTimeChunk = next(timeChunk);
      if (nextTimeChunk !== undefined) {
        let currentSupply = MAXIMUM_SUPPLY;
        for (const swimLane of swimLanes) {
          const a0 = get(nextTimeChunk, swimLane);
          currentSupply -= a0;
        }

        const a0 = get(timeChunk, 'source');
        add(timeChunk, 'source', currentSupply-a0);
      }
    }
  };
  addSupply();

  for (const swimLane of swimLanes) {
    for (const timeChunk of timeChunks) {
      const nextTimeChunk = next(timeChunk);
      if (nextTimeChunk !== undefined) {
        const nn0 = `${timeChunk}-${swimLane}(sent)`;
        const nn1 = `${nextTimeChunk}-${swimLane}(sent)`;
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
            link.color = 'gray';
          }
          if (swimLane == 'distributed-to-known') {
            link.color = 'blue';
          }
          if (swimLane == 'distributed-to-burn') {
            link.color = 'pink';
          }
          if (swimLane == 'source') {
            link.color = 'yellow';
          }
          if (nodeNameSet.has(link.source) && nodeNameSet.has(link.target)) {
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
