// shorthand for $(document).ready(...)
$(function () {
    var socket = io();


    socket.emit('getGlobalGeoJSON', '');
    socket.on('setGlobalGeoJSON', function (data) {
        console.log(data);
        setupBasicFrontPageMap(data.globalData);
    });

    function setupBasicFrontPageMap(data) {
        var globalData = data;

        var map = L.map('map').setView([51.0486, -114.0708], 4);
        var geojson;

        var CartoDB_DarkMatter = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
            subdomains: 'abcd',
            maxZoom: 19,
            maxBoundsViscosity: 1.0
        }).addTo(map);

        function getColor(d) {
            return d > 100000000 ? '#800026' :
                d > 50000000 ? '#BD0026' :
                d > 20000000 ? '#E31A1C' :
                d > 10000000 ? '#FC4E2A' :
                d > 5000000 ? '#FD8D3C' :
                d > 2000000 ? '#FEB24C' :
                d > 100000 ? '#FED976' :
                '#FFEDA0';
        }

        function style(feature) {
            return {
                fillColor: getColor(feature.properties.pop_est),
                weight: 1,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.7
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

        geojson = L.geoJson(globalData, {
            style: style,
            onEachFeature: onEachFeature
        }).addTo(map);

        var info = L.control();

        info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
            this.update();
            return this._div;
        };

        // method that we will use to update the control based on feature properties passed
        info.update = function (props) {
            this._div.innerHTML = '<h4>Population</h4>' + (props ?
                '<b>' + props.name + '</b><br />' + props.pop_est + ' people' : 'Hover over a country');
        };

        var legend = L.control({
            position: 'bottomright'
        });

        legend.onAdd = function (map) {

            var div = L.DomUtil.create('div', 'info legend'),
                grades = [0, 100000, 2000000, 5000000, 10000000, 20000000, 50000000, 100000000],
                labels = [];

            // loop through our density intervals and generate a label with a colored square for each interval
            for (var i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
                    grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
            }

            return div;
        };

        legend.addTo(map);

        info.addTo(map);
    }
});