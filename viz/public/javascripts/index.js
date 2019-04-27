let geojson;
let foodCircles = [];
let markerRenderer;
let map;
let stateData;
let maxRatio;
let ignoreChain = new Set();
const info = L.control();
const HeadersEnum = Object.freeze({"NAME":0, "CITY":1, "PROVINCE":2, "POSTALCODE":3, "LATITUDE":4, "LONGITUDE":5, "FULL_NAME":6});
const restColors = {
    "McDonald's": "#dd1021",
    "Burger King": "#185494",
    "Taco Bell": "#ff7f0e",
    "Wendy's": "#8ED5E6",
    "Arby's": "#ef1897",
    "KFC": "#8c564b",
    "Subway": "#005542",
    "SONIC Drive In": "#a6dba0",
    "Domino's Pizza": "#762a83",
    "Taco John's": "#cbc600",
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
    markerRenderer = L.canvas({padding:0.5, pane:"markerPane"});
    map = L.map('map', { layers: [markerRenderer]}).setView([37.8, -96], 4);
    const geoJSONPane = map.createPane("geoPane");
    const markerPane = map.createPane("markerPane");
    stateData = JSON.parse(e[0].responseText);
    updateMinMaxRatio();
    const rawData = e[1].responseText.replace("\r", "");
    const foodLocData = rawData.split(/\n+/g).slice(1).map(x => x.split(","));

    // put map behind points
    geoJSONPane.style.zIndex = 350;
    markerPane.style.zIndex = 400;

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

    // Helper function to reference the JSON data
    function getTopChains(stateLongName, index) {
        const stateAbbrev = nameToAbrev[stateLongName];
        const stateRank = stateData[stateAbbrev];
        const chainInfo = stateRank["top-n"][index];

        return `${Object.keys(chainInfo)} (${Object.values(chainInfo)})`;
    }

    info.update = function (props) {
        this._div.innerHTML = '<h4>Top Food Chains</h4>' + (props ?
            '<b>' + Object.values(props)[0] + '</b><br />' + '<br />' +
            '<b>Filtered Top:</b><br />' + Object.keys(getStateFilteredFirst(nameToAbrev[Object.values(props)[0]]))[0]+ '<br />' +
            '<br />' +
            'Top Chains:' + '<br />' +
            '1. ' + getTopChains(Object.values(props)[0], 0)+ '<br />' +
            '2. ' + getTopChains(Object.values(props)[0], 1)+ '<br />' +
            '3. ' + getTopChains(Object.values(props)[0], 2)+ '<br />' +
            '...' + '<br />' +
            '<b>Total Locations</b>: ' + stateData[nameToAbrev[Object.values(props)[0]]]['total']+ '<br />'
            : 'Hover over a state');
    };
    info.addTo(map);

    drawMap();
    map.attributionControl.addAttribution('Population data &copy; <a href="http://census.gov/">US Census Bureau</a>');

    var legend = L.control({position: 'bottomleft'});

    legend.onAdd = function (map) {

        var div = L.DomUtil.create('div', 'info legend'),
            labels = [];

        // loop through our density intervals and generate a label with a colored square for each interval
        for (var i = 0; i < 10; i++) {
            labels.push(
                '<i style="background:' + Object.values(restColors)[i] + '"></i> ' +
                Object.keys(restColors)[i]);
        }

        div.innerHTML = labels.join('<br><br>');
        return div;
    };

    legend.addTo(map);

    // Setup Markers
    foodCircles = [];
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

    createCustomForm();
    initListeners(foodCircles);
}

function createCustomForm() {
    let silenceVoicesBox = L.control({position: 'topright'});
    silenceVoicesBox.onAdd = function(map){
        let div = L.DomUtil.create('div', 'info command');
        let formStr = "";
        formStr += '<form><input id="markerToggle" type="checkbox"/>Show Markers</form>';
        formStr += '<div class="leaflet-control-layers-separator"></div>';
        for (let chain of Object.keys(restColors)) {
            formStr += '<form><input id=' + chain + ' type="checkbox"/>' + chain + '</form>'
        }
        div.innerHTML = formStr;
        return div;
    };
    silenceVoicesBox.addTo(map);

    function handleCheck(e) {
        if (e.target.id === "markerToggle"){
            if (e.target.checked) {
                document.styleSheets[1].cssRules[1].style.display = "block";
            } else {
                document.styleSheets[1].cssRules[1].style.display = "none";
            }
        } else {
            const chainName = e.target.parentElement.innerText;
            if (e.target.checked) {
                ignoreChain.add(chainName);
            } else {
                ignoreChain.delete(chainName);
            }
            updateMinMaxRatio();
            drawMap();
        }
    }

    document.getElementsByClassName("command")[0].addEventListener("click", handleCheck, false);
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

    let stateFirst = getStateFilteredFirst(stateAbbrev);
    if(!stateFirst) return {
        fillOpacity: 0,
        fillColor: '#ffffff'
    };
    const stateRatio = Object.values(stateFirst)[0]/stateRank["total"];

    let stateColor = "#000000";
    if(Object.keys(restColors).includes(Object.keys(stateFirst)[0])) {
        stateColor = restColors[Object.keys(stateFirst)[0]];
    }

    return {
        fillOpacity: stateRatio/maxRatio,
        fillColor: stateColor
    };
}

function updateMinMaxRatio() {
    let state_ratios = Object.entries(stateData).map(el => {
        let stateRank = el[1];
        let stateFirst = getStateFilteredFirst(el[0]);
        if(!stateFirst) return 0;
        return Object.values(stateFirst)[0]/stateRank["total"];
    });
    maxRatio = Math.max(...state_ratios);
}

function getStateFilteredFirst(stateAbbrev) {
    const stateRank = stateData[stateAbbrev];

    let stateFirst = stateRank["top-n"][0];
    for(let i=1; ignoreChain.has(Object.keys(stateFirst)[0]); i++) {
        if(i >= stateRank["top-n"].length) {
            return false
        }
        stateFirst = stateRank["top-n"][i];
    }
    return stateFirst
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

drawMap = () => {
    if (geojson) {
        map.removeLayer(geojson);
    }
    geojson =  L.geoJson(statesData, {
        style: style,
        onEachFeature: onEachFeature,
        pane: "geoPane"
    }).addTo(map);
};

initListeners = (foodCircles) => {
    document.body.onkeydown = (e) => {
        if (e.key === "d") {
            for (let i = 0; i < foodCircles.length; i++) {
                foodCircles[i].setRadius(7);
            }
            document.styleSheets[1].cssRules[1].style.pointerEvents="auto";
        }
    };

    document.body.onkeyup = function (e) {
        if (e.key === " ") {
            map.setView([37.8, -96], 4);
        } else if (e.key === "d") {
            for (let i = 0; i < foodCircles.length; i++) {
                foodCircles[i].setRadius(.25);
            }
            document.styleSheets[1].cssRules[1].style.pointerEvents="none";
        }
    };
};


