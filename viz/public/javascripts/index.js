let markersOn = false;
let geojson;
let map;
const info = L.control();
const HeadersEnum = Object.freeze({"NAME":0, "CITY":1, "PROVINCE":2, "POSTALCODE":3, "LATITUDE":4, "LONGITUDE":5, "FULL_NAME":6});
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
  const stateData = JSON.parse(e[0].responseText);
  const foodLocData = e[1].responseText.split(/\r\n+/g).slice(1).map(x => x.split(","));
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

  // Draw legend
  var legend = L.control({position: 'bottomleft'});
  legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend'),
        grades = [0, 10, 20, 50, 100, 200, 500, 1000],
        labels = [],
        from, to;
    for (var i = 0; i < grades.length; i++) {
      from = grades[i];
      to = grades[i + 1];
      labels.push(
          '<i style="background:' + getColor(from + 1) + '"></i> ' +
          from + (to ? '&ndash;' + to : '+'));
    }
    div.innerHTML = labels.join('<br>');
    return div;
  };
  legend.addTo(map);

  // Setup Markers
  let foodCircles = [];
  for (let store of foodLocData) {
    let markerColor = "#99999980";
    if(!store[HeadersEnum.LATITUDE] || !store[HeadersEnum.LONGITUDE]){
      console.log("PANIC");
    }
    if(store[HeadersEnum.NAME] === "McDonald's") {
      markerColor = "#00000080"
    }
    const foodCircle = L.circleMarker([store[HeadersEnum.LATITUDE], store[HeadersEnum.LONGITUDE]],
        {
          renderer: markerRenderer,
          color: markerColor
        });
    foodCircle.setRadius(.25);
    foodCircles.push(foodCircle);
    foodCircle.addTo(map).bindPopup(store[HeadersEnum.FULL_NAME])
  }

  initListeners(foodCircles);
}

// get color depending on population density value
function getColor(d) {
  return d > 1000 ? '#0c2c84' :
      d > 500 ? '#225ea8' :
          d > 200 ? '#1d91c0' :
              d > 100 ? '#41b6c4' :
                  d > 50 ? '#7fcdbb' :
                      d > 20 ? '#c7e9b4' :
                          d > 10 ? '#edf8b1' :
                              '#ffffd9';
}

function style(feature) {
  return {
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7,
    fillColor: getColor(feature.properties.density)
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


