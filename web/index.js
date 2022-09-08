window.onLoad = async () => {
  await loadBananoDistributionStats();
};

const loadBananoDistributionStats = async () => {
  const response = await fetch('banano-distribution-stats.json', {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
    },
  });
  const responseJson = await response.json();
  window.bananoDistributionStats = responseJson;

  var layout = d3.sankey()
                .extent([[100, 10], [1000, 1000]]);

  var diagram = d3.sankeyDiagram()
                  .linkTitle(d3.sankeyLinkTitle(function (d) { return d.title; },
                                                function(d) { return d.title; },
                                                d3.format('.3s')))
                  .linkColor(function(d) { return d.color; });

  const sankey = {};

  sankey.links = [];

  const timeChunkSet = new Set();
  window.bananoDistributionStats.forEach((stat) => {
    timeChunkSet.add(stat.timeChunk);
  });
  window.bananoDistributionStats.forEach((stat) => {
    // if(stat.timeChunk.startsWith("2019-03"))
    // {
      sankey.links.push({
        source:stat.timeChunk + '-' + stat.srcType,
        target:stat.timeChunk + '-' + stat.destType,
        value:stat.amount,
      })
    // }
  })

  sankey.groups = [
  {
    "title": "Source",
    "id": "source",
    "nodes": []
  },
  {
    "title": "Distributed",
    "id": "distributed",
    "nodes": []
  },
  {
    "title": "Sink",
    "id": "sink",
    "nodes": []
  }];

  sankey.nodes = [];
  sankey.order = [
    [      [      ]],
    [      [      ]    ],
    [      [    ]    ],
  ]
  for (const timeChunk of timeChunkSet) {
    sankey.groups[0].nodes.push(`${timeChunk}-source`)
    sankey.groups[1].nodes.push(`${timeChunk}-distributed-to-known`)
    sankey.groups[1].nodes.push(`${timeChunk}-distributed-to-unknown`)
    sankey.groups[2].nodes.push(`${timeChunk}-sink`)

    sankey.order[0][0].push(`${timeChunk}-source`)
    sankey.order[1][0].push(`${timeChunk}-distributed-to-known`)
    sankey.order[1][0].push(`${timeChunk}-distributed-to-unknown`)
    sankey.order[2][0].push(`${timeChunk}-sink`)

    sankey.nodes.push({
      title:`${timeChunk} Known Source`,
      direction:'r',
      id:`${timeChunk}-source`
    });
    sankey.nodes.push({
      title:`${timeChunk} Known Distribution`,
      direction:'r',
      id:`${timeChunk}-distributed-to-known`
    });
    sankey.nodes.push({
      title:`${timeChunk} Unknown Distribution`,
      direction:'r',
      id:`${timeChunk}-distributed-to-unknown`
    });
    sankey.nodes.push({
      title:`${timeChunk} Known Sink`,
      direction:'r',
      id:`${timeChunk}-sink`
    });
  }

  layout.ordering(sankey.order);
  var el = d3.select('#sankey svg')
            .datum(layout(sankey))
            .call(diagram.groups(sankey.groups));
};
