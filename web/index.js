window.onLoad = async () => {
  await loadBananoDistributionStats();
};

//  https://creeper.banano.cc/hash/F61A79F286ABC5CC01D3D09686F0567812B889A5C63ADE0E82DD30F3B2D96463
// Balance
// 3,402,823,669.21 BAN | 340282366920938463463374607431768211455 RAW

const MAXIMUM_SUPPLY = 3402823669.21;

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
  swimLaneSet.delete('exchanged-tier-01');
  swimLaneSet.delete('exchange');
  swimLaneSet.delete('exchanged-emusk');
  swimLaneSet.delete('exchanged-tier-02');

  const swimLaneArray = Array.from(swimLaneSet);
  swimLaneArray.sort();

  const directions = Array.from(directionSet);
  directions.sort();


  // burn, source, known, and team members at the top
  const swimLanes = [
    'source',
    'distributed-to-burn',
  ];

  const bottomSwimLanes = [
    'distributed-to-team-member',
    'distributed-to-known',
    'distributed-to-unknown-tier-01',
    // 'exchanged-tier-01',
    // 'exchange',
    // 'exchanged-emusk',
    // 'exchanged-tier-02',
  ];

  for (swimLane of swimLaneArray) {
    if (!bottomSwimLanes.includes(swimLane)) {
      if (!swimLanes.includes(swimLane)) {
        swimLanes.push(swimLane);
      }
    }
  }

  for (swimLane of bottomSwimLanes) {
    swimLanes.push(swimLane);
  }

  const next = (timeChunk) => {
    const ix = timeChunks.indexOf(timeChunk);
    if (ix < timeChunks.length-1) {
      return timeChunks[ix+1];
    }
  };

  // const prev = (timeChunk) => {
  //   const ix = timeChunks.indexOf(timeChunk);
  //   if (ix > 0) {
  //     return timeChunks[ix-1];
  //   }
  // };

  window.bananoDistributionStats = [];
  responseJson.forEach((stat) => {
    stat.amount = parseFloat(stat.amount);
    if (stat.timeChunk !== '1970-01') {
      if (stat.amount > 0) {
        if (swimLanes.includes(stat.srcType) && swimLanes.includes(stat.destType)) {
          if (stat.direction == 'sent') {
            const nextTimeChunk = next(stat.timeChunk);
            if (nextTimeChunk !== undefined) {
              stat.nextTimeChunk = nextTimeChunk;
              stat.srcNode = `${stat.timeChunk}-${stat.srcType}(${stat.direction})`;
              stat.destNode = `${stat.nextTimeChunk}-${stat.destType}(${stat.direction})`;
              stat.color = 'lightgray';
              window.bananoDistributionStats.push(stat);
            }
          }
        }
      }
    }
  });

  const sankeySvgElt = document.getElementById('sankeySvg');
  const w = 10000;
  const h = 5000;
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
    const srcTypeIx = swimLanes.indexOf(stat.srcType);
    const destTypeIx = swimLanes.indexOf(stat.destType);

    if (stat.destType.startsWith('source')) {
      // do not count funds sent back to the distribution accounts.
    } else if (stat.srcType == stat.destType) {
      // do not count funds sent within a layer to the same layer.
    // } else if (destTypeIx < srcTypeIx) {
    } else {
      const link = {
        source: stat.srcNode,
        target: stat.destNode,
        value: stat.amount,
      };

      const useLink = !stat.srcType.startsWith('distributed');

      const showLink = (destTypeIx >= srcTypeIx);

      if (stat.direction == 'sent') {
        if (stat.destType == 'exchange') {
          link.color = 'orange';
        }
        if (stat.destType == 'exchanged-tier-01') {
          link.color = 'orange';
        }
        if (stat.destType == 'exchanged-emusk') {
          link.color = 'green';
        }
        if (stat.destType == 'exchanged-tier-02') {
          link.color = 'green';
        }
        if (stat.srcType == 'source') {
          link.color = '#CCCC00';
        }
        if (stat.destType == 'distributed-to-burn') {
          link.color = 'pink';
        }

        // if ((stat.srcType == 'source') || (stat.destType == 'exchange')) {
        if (nodeNameSet.has(link.source) && nodeNameSet.has(link.target)) {
          if (useLink) {
            if (showLink) {
              sankey.links.push(link);
            }
            add(stat.nextTimeChunk, stat.destType, stat.amount);
          }
        }
        // }
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
          // if (!bottomSwimLanes.includes(swimLane)) {
          currentSupply -= a0;
          // }
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
        if (a0 >= 0) {
          // add 1 to value so the sankey lines up in swim lanes.
          // otherwise it looks jankey.
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
          if (swimLane == 'distributed-to-unknown-tier-01') {
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
          if (swimLane == 'exchange') {
            link.color = 'orange';
          }
          if (swimLane == 'exchanged-tier-01') {
            link.color = 'orange';
          }
          if (swimLane == 'exchanged-emusk') {
            link.color = 'green';
          }
          if (swimLane == 'exchanged-tier-02') {
            link.color = 'green';
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

  diagram.on('selectLink', (a) => {
    console.log(a.el.lastChild);
    linktext.innerHTML = a.el.lastChild.innerHTML;
  });

  layout.ordering(sankey.order);

  d3.select('#sankey svg')
      .datum(layout(sankey))
      .call(diagram.groups(sankey.groups));
};
