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
    // if(stat.destType !== 'distributed-to-burn') {
        // if(stat.timeChunk !== '1970-01') {
          if(stat.srcType == 'source-folding') {
            console.log('stat.timeChunk', stat.timeChunk)
            window.bananoDistributionStats.push(stat);
          }
        // }
      // }
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
    ['source-distribution','source-faucet','source-folding','source-event','source-boompow'],
    ['distributed-to-team-member', 'distributed-to-tipbot', 'distributed-to-unknown', ,'distributed-to-exchange-mid'],
    ['distributed-to-exchange','distributed-to-burn'],
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
  window.bananoDistributionStats.forEach((stat) => {
    if (timeChunkSet.has(stat.timeChunk)) {
      // const srcGroup = stat.srcType.split('-')[0];
      // const destGroup = stat.destType.split('-')[0];
      const srcNode = stat.timeChunk + '-' + stat.srcType;
      const destNode = stat.timeChunk + '-' + stat.destType;
      // const srcNode = stat.srcType + '-' + stat.timeChunk;
      // const destNode = stat.destType + '-' + stat.timeChunk;
      // if (stat.srcType == 'distributed-to-exchange') {
      //   // dont show things sent from exchanges.
      // } else if (stat.destType.startsWith('source')) {
      //   // dont show things sent to sources.
      // } else if ((stat.srcType.startsWith('source')) && (stat.destType == 'distributed-to-exchange')) {
      //   const midNode = stat.timeChunk + '-distributed-to-exchange-mid';
      //   sankey.links.push({
      //     source: srcNode,
      //     target: midNode,
      //     value: stat.amount,
      //   });
      //   sankey.links.push({
      //     source: midNode,
      //     target: destNode,
      //     value: stat.amount,
      //   });
      // // } else if (srcGroup != destGroup) {
      // } else {
        sankey.links.push({
          source: srcNode,
          target: destNode,
          value: stat.amount,
        });
      // }
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

  console.log('timeChunkSet', timeChunkSet)
  console.log('sankey', sankey)

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
