/* SDDI geometry editor. Uses the Leaflet/Leaflet.draw supplied by ckanext-spatial. */
this.ckan.module('sddi-spatial-form', function ($) {
  'use strict';
  return {
    initialize: function () {
      var self = this;
      this.input = this.el.find('textarea')[0];
      this.error = this.el.find('[data-spatial-error]');
      this.map = ckan.commonLeafletMap(this.el.find('[data-spatial-map]')[0], this.options.map_config);
      this.map.setView([48.1, 11.6], 5);
      this.layers = new L.FeatureGroup().addTo(this.map);
      this.loadInput();
      this.map.addControl(new L.Control.Draw({
        draw: {polyline: true, polygon: true, rectangle: true, marker: {icon: L.divIcon({className: 'sddi-spatial-marker', iconSize: [16, 16]})}, circle: false, circlemarker: false},
        edit: {featureGroup: this.layers}
      }));
      this.map.on('draw:created', function (event) {
        if (!self.validInput) { return; }
        self.layers.addLayer(event.layer);
        self.saveInput();
      });
      this.map.on('draw:edited draw:deleted', function () {
        if (self.validInput) { self.saveInput(); }
      });
      this.inputChanged = function () { self.loadInput(); };
      $(this.input).on('change', this.inputChanged);
      this.el.find('[data-spatial-preset]').on('change', function () {
        if (this.value) { $(self.input).val(this.value).trigger('change'); }
      });
    },
    // Split multipart geometries into editable layers without changing the stored text.
    parts: function (geometry) {
      var self = this;
      if (!geometry || typeof geometry !== 'object') { throw new Error('Expected a GeoJSON geometry'); }
      if (geometry.type === 'GeometryCollection') {
        return geometry.geometries.reduce(function (all, item) { return all.concat(self.parts(item)); }, []);
      }
      var types = {MultiPoint: 'Point', MultiLineString: 'LineString', MultiPolygon: 'Polygon'};
      if (types[geometry.type]) {
        return geometry.coordinates.map(function (coordinates) { return {type: types[geometry.type], coordinates: coordinates}; });
      }
      if (['Point', 'LineString', 'Polygon'].indexOf(geometry.type) === -1 || !Array.isArray(geometry.coordinates)) {
        throw new Error('Expected Point, LineString, Polygon, multipart geometry or GeometryCollection');
      }
      return [geometry];
    },
    combine: function (geometries, originalType) {
      if (!geometries.length) { return null; }
      var type = geometries[0].type;
      var homogeneous = geometries.every(function (item) { return item.type === type; });
      if (homogeneous && originalType !== 'GeometryCollection') {
        if (geometries.length === 1 && originalType !== 'Multi' + type) { return geometries[0]; }
        return {type: 'Multi' + type, coordinates: geometries.map(function (item) { return item.coordinates; })};
      }
      return {type: 'GeometryCollection', geometries: geometries};
    },
    loadInput: function () {
      var self = this;
      try {
        var raw = this.input.value.trim();
        var geometry = raw ? JSON.parse(raw) : null;
        // Construct all layers before replacing the current map, so invalid input is preserved.
        var pending = [];
        if (geometry) {
          this.parts(geometry).forEach(function (part) {
            L.geoJSON(part, {pointToLayer: function (feature, latlng) {
              return L.marker(latlng, {icon: L.divIcon({className: 'sddi-spatial-marker', iconSize: [16, 16]})});
            }}).eachLayer(function (layer) { pending.push(layer); });
          });
        } else if (raw) { throw new Error('Expected a GeoJSON geometry'); }
        this.layers.clearLayers();
        pending.forEach(function (layer) { self.layers.addLayer(layer); });
        this.originalType = geometry ? geometry.type : null;
        this.validInput = true;
        this.error.text('').hide();
        var bounds = this.layers.getBounds();
        if (bounds.isValid()) { this.map.fitBounds(bounds, {maxZoom: 15}); }
      } catch (error) {
        this.validInput = false;
        this.error.text('Invalid GeoJSON. Correct the text before editing the map. ' + error.message).show();
      }
    },
    saveInput: function () {
      var geometries = this.layers.getLayers().map(function (layer) { return layer.toGeoJSON(false).geometry; });
      var geometry = this.combine(geometries, this.originalType);
      this.input.value = geometry ? JSON.stringify(geometry) : '';
      $(this.input).trigger('change');
    },
    teardown: function () {
      $(this.input).off('change', this.inputChanged);
      this.el.find('[data-spatial-preset]').off('change');
      if (this.map) { this.map.remove(); }
    }
  };
});
