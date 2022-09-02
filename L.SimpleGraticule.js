/**
 *  File: L.SimpleGraticule.js
 *  Desc: A graticule for Leaflet maps in the L.CRS.Simple coordinate system.
 *  Auth: Andrew Blakey (ablakey@gmail.com)
 */
L.SimpleGraticule = L.LayerGroup.extend({
  options: {
    showOriginLabel: true,
    redraw: "move",
    hidden: false,
  },

  lineStyle: {
    stroke: true,
    color: "#111",
    opacity: 0.6,
    weight: 1,
    interactive: false,
    clickable: false, //legacy support
  },

  initialize: function (options) {
    L.LayerGroup.prototype.initialize.call(this);
    L.Util.setOptions(this, options);
  },

  onAdd: function (map) {
    this._map = map;

    var graticule = this.redraw();
    this._map.on(
      "viewreset " + this.options.redraw,
      graticule.redraw,
      graticule
    );

    this.eachLayer(map.addLayer, map);
  },

  onRemove: function (map) {
    map.off("viewreset " + this.options.redraw, this.map);
    this.eachLayer(this.removeLayer, this);
  },

  hide: function () {
    this.options.hidden = true;
    this.redraw();
  },

  show: function () {
    this.options.hidden = false;
    this.redraw();
  },

  redraw: function () {
    this._bounds = this._map.getBounds().pad(0.5);

    this.clearLayers();

    this.constructLinesWilliam();

    if (this.options.showOriginLabel) {
      this.addLayer(this.addOriginLabel());
    }

    return this;
  },

  round: function (num, places) {
    return +(Math.round(num + "e+" + places) + "e-" + places);
  },

  constructLinesWilliam: function () {
    // Bounds of the map.
    const bounds = this._map.getBounds();

    // Zoom of the map.
    const zoom = this._map.getZoom();

    // Center of the map.
    const center = this._map.project(bounds.getCenter(), zoom);

    /*=============================================
    =            Longitude            =
    =============================================*/

    const west = Math.max(bounds.getWest(), -180); // -180 is the minimum longitude.
    const east = Math.min(bounds.getEast(), 180); // 180 is the maximum longitude.

    let interval;

    // For zoom level 0, the interval is 90 (the max value).
    if (zoom === 0) {
      interval = 90;
    } else if (zoom >= 18) {
      // For zoom level 18, the interval is 0.001 (the min value).
      interval = 0.001;
    } else {
      // 50 is the width of the interval in pixels.
      const centerPlus50px = this._map.unproject(center.add([50, 0]), zoom).lng;
      const centerMinus50px = this._map.unproject(
        center.add([-50, 0]),
        zoom
      ).lng;
      const resta = this.round(centerPlus50px - centerMinus50px, 4);
      interval = this.roundForInterval(resta, false);
    }

    const startPosition = Math.ceil(this.round(west / interval, 4)) * interval;

    for (let i = startPosition; i <= east; i += interval) {
      this.addLayer(this.buildXLine(i));
      this.addLayer(this.buildLabel("gridlabel-horiz", this.round(i, 3)));
    }

    /*=====  End of Longitude  ======*/

    /*=============================================
    =            Latitude            =
    =============================================*/

    const south = Math.max(bounds.getSouth(), -85); // -85 is the minimum south.
    const north = Math.min(bounds.getNorth(), 85); // 85 is the maximum north.

    console.log("south", south);
    console.log("north", north);

    for (let i = south; i <= north; i += interval) {
      this.addLayer(this.buildYLine(i));
      this.addLayer(this.buildLabel("gridlabel-vert", i));
    }

    /*=====  End of Latitude  ======*/
  },

  roundForInterval(number, variableDistance) {
    if (variableDistance && number >= 5) return 5;
    if (number <= 10) {
      let fac = 1;
      while (number > 1) {
        fac *= 10;
        number /= 10;
      }
      while (number <= 0.1) {
        fac /= 10;
        number *= 10;
      }
      if (number == 0.1) return this.round(0.1 * fac, 4);
      else if (number <= 0.2) return this.round(0.2 * fac, 4);
      else if (number <= 0.5) return this.round(0.5 * fac, 4);
      else return fac;
    } else if (number <= 30) return 30;
    else if (number <= 45) return 45;
    else if (number <= 60) return 60;
    else return 90;
  },

  buildXLine: function (x) {
    var bottomLL = new L.LatLng(this._bounds.getSouth(), x);
    var topLL = new L.LatLng(this._bounds.getNorth(), x);

    return new L.Polyline([bottomLL, topLL], this.lineStyle);
  },

  buildYLine: function (y) {
    var leftLL = new L.LatLng(y, this._bounds.getWest());
    var rightLL = new L.LatLng(y, this._bounds.getEast());

    return new L.Polyline([leftLL, rightLL], this.lineStyle);
  },

  buildLabel: function (axis, val) {
    var bounds = this._map.getBounds().pad(-0.003);
    var latLng;
    if (axis == "gridlabel-horiz") {
      latLng = new L.LatLng(bounds.getNorth(), val);
    } else {
      latLng = new L.LatLng(val, bounds.getWest());
    }

    return L.marker(latLng, {
      interactive: false,
      clickable: false, //legacy support
      icon: L.divIcon({
        iconSize: [0, 0],
        className: "leaflet-grid-label",
        html: '<div class="' + axis + '">' + val + "&#8239;°</div>",
      }),
    });
  },

  addOriginLabel: function () {
    return L.marker([0, 0], {
      interactive: false,
      clickable: false, //legacy support
      icon: L.divIcon({
        iconSize: [0, 0],
        className: "leaflet-grid-label",
        html: '<div class="gridlabel-horiz">[0,0]</div>',
      }),
    });
  },
});

L.simpleGraticule = function (options) {
  return new L.SimpleGraticule(options);
};
