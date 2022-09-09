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

  window.bananoDistributionStats = [];
  responseJson.forEach((stat) => {
    stat.amount = parseFloat(stat.amount);
    stat.srcNode = stat.timeChunk + '-' + stat.srcType;
    stat.destNode = stat.timeChunk + '-' + stat.destType;
    stat.title = stat.srcNode + '-' + stat.destNode;
    stat.reverseTitle = stat.destNode + '-' + stat.srcNode;
    stat.color = 'lightblue';
    if (stat.destType !== 'distributed-to-burn') {
      if (stat.timeChunk !== '1970-01') {
        if (stat.amount > 0) {
          // console.log('stat.timeChunk', stat.timeChunk);
          window.bananoDistributionStats.push(stat);
        }
      }
    }
  });

  const sankeySvgElt = document.getElementById('sankeySvg');
  const w = 1900;
  const h = 5000;
  const y = 300;
  const x = -50;
  sankeySvgElt.setAttribute('width', '100%');
  sankeySvgElt.setAttribute('viewBox', `${x} ${y} ${w} ${h-y}`);

  const sankey = {};

  const accountTypeNames = [
    ['source', 'source-folding', 'source-boompow'],
    ['distributed-to-team-member', 'distributed-to-tipbot', 'distributed-to-unknown', 'distributed-to-exchange-mid', 'source-distributed-to-exchange', 'source-folding-distributed-to-exchange'],
    ['exchange'],
  ];

  sankey.links = [];
  sankey.groups = [];
  sankey.nodes = [];
  sankey.order = [];

  const timeChunkSet = new Set();
  window.bananoDistributionStats.forEach((stat) => {
    // if(stat.timeChunk.startsWith("2022")) {
    timeChunkSet.add(stat.timeChunk);
    // }
  });

  // const backAmountMap = new Map();
  // window.bananoDistributionStats.forEach((stat) => {
  //   if (stat.srcType.startsWith('exchange')) {
  //     backAmountMap.set(stat.reverseTitle , stat);
  //   }
  // });
  // window.bananoDistributionStats.forEach((stat) => {
  //   if(backAmountMap.has(stat.title)) {
  //     const backStat = backAmountMap.get(stat.title);
  //     const backAmount = Math.min(backStat.amount, stat.amount);
  //     const newForwardAmount = stat.amount - backAmount;
  //     const newBackwardAmount = backStat.amount - backAmount;
  //     console.log('subtracting', stat.title, stat.amount, '-', backAmount, '=', newForwardAmount)
  //     console.log('subtracting', backStat.title, backStat.amount, '-', backAmount, '=', newBackwardAmount)
  //     stat.amount = newForwardAmount;
  //     backStat.amount = newBackwardAmount;
  //   }
  // });

  window.bananoDistributionStats.forEach((stat) => {
    if (timeChunkSet.has(stat.timeChunk)) {
      // const srcGroup = stat.srcType.split('-')[0];
      // const destGroup = stat.destType.split('-')[0];
      // const srcNode = stat.srcType + '-' + stat.timeChunk;
      // const destNode = stat.destType + '-' + stat.timeChunk;
      if (stat.destType.startsWith('source')) {
        // dont show things sent to sources.
      } else if (stat.amount == 0) {
        // dont show zero amount.
      } else if (stat.srcType.startsWith('exchange')) {
        sankey.links.push({
          source: stat.destNode,
          target: stat.srcNode,
          value: stat.amount,
          color: 'yellow',
        });
      } else if (stat.srcType.startsWith('distributed') && stat.destType.startsWith('distributed')) {
      } else if (stat.srcType.startsWith('source') && stat.destType.startsWith('source')) {
        // dont show things sent within source.
      } else if ((stat.srcType.startsWith('source')) && (stat.destType == 'exchange')) {
        const midNode = `${stat.timeChunk}-${stat.srcType}-distributed-to-exchange`;
        sankey.links.push({
          source: stat.srcNode,
          target: midNode,
          value: stat.amount,
          color: 'pink',
        });
        sankey.links.push({
          source: midNode,
          target: stat.destNode,
          value: stat.amount,
          color: 'pink',
        });
      } else {
        const elt = {
          source: stat.srcNode,
          target: stat.destNode,
          value: stat.amount,
          color: stat.color,
        }
        if(stat.srcType == 'source-folding') {
          elt.color = 'gray';
        }
        if(stat.srcType == 'source-boompow') {
          elt.color = 'gray';
        }
        if((stat.srcType == 'distributed-to-team-member') || (stat.destType == 'distributed-to-team-member')) {
          elt.color = 'green';
        }
        sankey.links.push(elt);
      }
    }
  });
  sankey.order = [];
  sankey.groups = [];

  const columns = accountTypeNames;
  const rows = Array.from(timeChunkSet);
  rows.sort();

  for (const column of columns) {
  // for (const [columnsIx, column] of columns.entries()) {
    sankey.groups.push({
      title: column,
      id: columns,
      nodes: [],
    });
    sankey.order.push([[]]);
  }
  for (const row of rows) {
  // for (const [rowIx, row] of rows.entries()) {
    for (const [columnIx, columnList] of columns.entries()) {
      for (const column of columnList) {
        const nodeName = `${row}-${column}`;
        sankey.groups[columnIx].nodes.push(nodeName);
        sankey.order[columnIx][0].push(nodeName);
        sankey.nodes.push({
          title: nodeName,
          direction: 'r',
          id: nodeName,
        });
      }
    }
  }

  console.log('timeChunkSet', timeChunkSet);
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
