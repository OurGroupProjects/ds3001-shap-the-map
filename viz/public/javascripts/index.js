let markersOn = false;
let geojson;
let map;
let stateData;
const minRatio = 0.111111111111111111;
const maxRatio = 0.37209302325581395;
const info = L.control();
const HeadersEnum = Object.freeze({"NAME":0, "CITY":1, "PROVINCE":2, "POSTALCODE":3, "LATITUDE":4, "LONGITUDE":5, "FULL_NAME":6});
const restColors = {
  "McDonald's": "#1f77b4",
  "Arby's": "#ff7f0e",
  "Burger King": "#2ca02c",
  "Domino's Pizza": "#d62728",
  "SONIC Drive In": "#9467bd",
  "Taco John's": "#8c564b",
  "Subway": "#e377c2",
  "KFC": "#7f7f7f",
  "Taco Bell": "#bcbd22",
  "Wendy's": "#17becf"
};

const nameToAbrev =
    {
      'Alabama': 'AL',
      'Alaska': 'AK',
      'American Samoa': 'AS',
      'Arizona': 'AZ',
      'Arkansas': 'AR',
      'California': 'CA',
      'Colorado': 'CO',
      'Connecticut': 'CT',
      'Delaware': 'DE',
      'District of Columbia': 'DC',
      'Federated States Of Micronesia': 'FM',
      'Florida': 'FL',
      'Georgia': 'GA',
      'Guam': 'GU',
      'Hawaii': 'HI',
      'Idaho': 'ID',
      'Illinois': 'IL',
      'Indiana': 'IN',
      'Iowa': 'IA',
      'Kansas': 'KS',
      'Kentucky': 'KY',
      'Louisiana': 'LA',
      'Maine': 'ME',
      'Marshall Islands': 'MH',
      'Maryland': 'MD',
      'Massachusetts': 'MA',
      'Michigan': 'MI',
      'Minnesota': 'MN',
      'Mississippi': 'MS',
      'Missouri': 'MO',
      'Montana': 'MT',
      'Nebraska': 'NE',
      'Nevada': 'NV',
      'New Hampshire': 'NH',
      'New Jersey': 'NJ',
      'New Mexico': 'NM',
      'New York': 'NY',
      'North Carolina': 'NC',
      'North Dakota': 'ND',
      'Northern Mariana Islands': 'MP',
      'Ohio': 'OH',
      'Oklahoma': 'OK',
      'Oregon': 'OR',
      'Palau': 'PW',
      'Pennsylvania': 'PA',
      'Puerto Rico': 'PR',
      'Rhode Island': 'RI',
      'South Carolina': 'SC',
      'South Dakota': 'SD',
      'Tennessee': 'TN',
      'Texas': 'TX',
      'Utah': 'UT',
      'Vermont': 'VT',
      'Virgin Islands': 'VI',
      'Virginia': 'VA',
      'Washington': 'WA',
      'West Virginia': 'WV',
      'Wisconsin': 'WI',
      'Wyoming': 'WY'
    };

const makeRequest = function (url, method) {
  let request = new XMLHttpRequest();
  return new Promise(function (resolve, reject) {
    request.onreadystatechange = function () {
      if (request.readyState !== 4) return;
      if (request.status >= 200 && request.status < 300) {
        resolve(request)
      } else {
        reject({
          status: request.status,
        });
      }
    };

    request.open(method, url, true);
    request.send();
  })
};

// Load data files, then draw map
Promise.all([makeRequest("/foodRankData", "GET"), makeRequest("/foodLocData", "GET")]).then(onDataLoad);


function onDataLoad(e) {
  map = L.map('map').setView([37.8, -96], 4);
  const geoJSONPane = map.createPane("geoPane");
  const markerPane = map.createPane("markerPane");
  stateData = JSON.parse(e[0].responseText);
  const rawData = e[1].responseText.replace("\r", "");
  const foodLocData = rawData.split(/\n+/g).slice(1).map(x => x.split(","));
  // switch canvas to svg for diesired outcome (SUUUPER LAGGY tho), have to change pointer-event css to visiblePainted
  const markerRenderer = L.canvas({padding:0.5, pane:"markerPane"});


  geoJSONPane.style.zIndex = 350;

  // Draw states
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoidGd3aWxlcyIsImEiOiJjanV2bzhvdTEwM3NnNGRwYmIzd3Ixd3h5In0.jFIY4jpuTwWO4F_Pvbz31w', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.light'
  }).addTo(map);

  // Set up on hover
  info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
  };
  info.update = function (props) {
    this._div.innerHTML = '<h4>US Population Density</h4>' + (props ?
        '<b>' + props.name + '</b><br />' + props.density + ' people / mi<sup>2</sup>'
        : 'Hover over a state');
  };
  info.addTo(map);

  geojson = L.geoJson(statesData, {
    style: style,
    onEachFeature: onEachFeature,
    pane: "geoPane"
  }).addTo(map);
  map.attributionControl.addAttribution('Population data &copy; <a href="http://census.gov/">US Census Bureau</a>');

  // Setup Markers
  let foodCircles = [];
  for (let store of foodLocData) {
    let markerColor = "#00000080";
    if(!store[HeadersEnum.LATITUDE] || !store[HeadersEnum.LONGITUDE]){
      console.log("PANIC");
    }
    if(store[HeadersEnum.NAME] in restColors) {
      markerColor = restColors[store[HeadersEnum.NAME]];
    }
    const foodCircle = L.circleMarker([store[HeadersEnum.LATITUDE], store[HeadersEnum.LONGITUDE]],
        {
          renderer: markerRenderer,
          color: markerColor
        });
    foodCircle.setRadius(.25);
    foodCircles.push(foodCircle);
    foodCircle.addTo(map).bindPopup("<b>" + store[HeadersEnum.FULL_NAME] + "</b></br>" + store[HeadersEnum.CITY] + ", " + store[HeadersEnum.PROVINCE])
  }

  initListeners(foodCircles);
}

function style(feature) {
  return {
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    ...getStateColor(feature.properties.name)
  };
}

function getStateColor(stateLongName) {
  const stateAbbrev = nameToAbrev[stateLongName];
  const stateRank = stateData[stateAbbrev];

  const stateFirst = stateRank["top-3"][0];
  const stateRatio = Object.values(stateFirst)[0]/stateRank["total"];
  const stateColor = restColors[Object.keys(stateFirst)[0]];


  return {
    fillOpacity: (stateRatio-minRatio)/(maxRatio-minRatio),
    fillColor: stateColor
  };
}

function highlightFeature(e) {
  var layer = e.target;

  layer.setStyle({
    weight: 5,
    color: '#666',
    dashArray: '',
    fillOpacity: 0.7
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }

  info.update(layer.feature.properties);
}

function resetHighlight(e) {
  geojson.resetStyle(e.target);
  info.update();
}

function zoomToFeature(e) {
  map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature
  });
}

initListeners = (foodCircles) => {
  document.body.onkeydown = (e) => {
    if (e.key === "d") {
      for (let i = 0; i < foodCircles.length; i++) {
        foodCircles[i].setRadius(7);
      }
      document.styleSheets[1].cssRules[2].style.pointerEvents="auto";
    } else if (e.key === "p") {
      if (markersOn === false) {
        document.styleSheets[1].cssRules[3].style.display = "block";
      } else {
        document.styleSheets[1].cssRules[3].style.display = "none";
      }
      markersOn = !markersOn;
    }

  };

  document.body.onkeyup = function (e) {
    if (e.key === " ") {
      map.setView([37.8, -96], 4);
    } else if (e.key === "d") {
      for (let i = 0; i < foodCircles.length; i++) {
        foodCircles[i].setRadius(.25);
      }
      document.styleSheets[1].cssRules[2].style.pointerEvents="none";
    }

  };
};


