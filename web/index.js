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
                .extent([[100, 10], [840, 580]]);

  var diagram = d3.sankeyDiagram()
                  .linkTitle(d3.sankeyLinkTitle(function (d) { return d.title; },
                                                function(d) { return d.title; },
                                                d3.format('.3s')))
                  .linkColor(function(d) { return d.color; });

  const sankey = {};

  sankey.links = [];

  window.bananoDistributionStats.forEach((stat) => {
    if(stat.timeChunk.startsWith("2019-03"))
    {
      sankey.links.push({
        source:stat.timeChunk + '-' + stat.srcType,
        target:stat.timeChunk + '-' + stat.destType,
        value:stat.amount,
      })
    }
  })

  sankey.groups = [
  {
    "title": "Source",
    "id": "source",
    "nodes": ["2019-03-source"]
  },
  {
    "title": "Distributed",
    "id": "distributed",
    "nodes": ["2019-03-distributed-to-known", "2019-03-distributed-to-unknown"]
  },
  {
    "title": "Sink",
    "id": "sink",
    "nodes": ["2019-03-sink"]
  }];
  sankey.nodes = [
  {
    "title": "Known Source",
    "id": "2019-03-source",
    "direction": "r"
  },
  {
    "title": "Known Sink",
    "id": "2019-03-sink",
    "direction": "r"
  },
  {
    "title": "Known Distribution",
    "id": "2019-03-distributed-to-known",
    "direction": "r"
  },
  {
    "title": "Unknown Distribution",
    "id": "2019-03-distributed-to-unknown",
    "direction": "r"
  }];
  sankey.order = [
    [
      ["2019-03-source"]
    ],
    [
      ["2019-03-distributed-to-known", "2019-03-distributed-to-unknown"]
    ],
    [
      ["2019-03-sink"]
    ],
  ]

  layout.ordering(sankey.order);
  var el = d3.select('#sankey svg')
            .datum(layout(sankey))
            .call(diagram.groups(sankey.groups));


  // const energyResponse = await fetch('uk_energy.json', {
  //   method: 'GET',
  //   headers: {
  //     'content-type': 'application/json',
  //   },
  // });
  // const energyResponseJson = await energyResponse.json();
  // layout.ordering(energyResponseJson.order);
  // var el = d3.select('#sankey svg')
  //           .datum(layout(energyResponseJson))
  //           .call(diagram.groups(energyResponseJson.groups));
};
