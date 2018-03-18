/* global window,document */
import React, { Component } from "react";
import { render } from "react-dom";
import MapGL from "react-map-gl";
import DeckGL, { GeoJsonLayer } from "deck.gl";

import { json as requestJson } from "d3-request";

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken;

// Source data GeoJSON
const DATA_URL =
  "https://raw.githubusercontent.com/uber-common/deck.gl-data/master/examples/geojson/vancouver-blocks.json"; // eslint-disable-line

// psql postgres://census:xxxx@xxxx:5432/census -t -c "select array_to_json(array_agg(row_to_json(t))) from (select state_name, county_name,  precinct_name, ST_AsGeoJSON(the_geom) from precinct_view_2012 where state_name = 'North Carolina') t; " > nc2012_results.json
const NC = require("./nc2012_results.json");

const colorScale = r => [r * 255, 140, 200 * (1 - r)];

function to_feature_collection(arr) {
  let features = [];
  for (var precinct in arr) {
    const {
      state_name,
      county_name,
      precinct_name,
      centroid,
      st_asgeojson
    } = arr[precinct];
    features.push({
      type: "Feature",
      geometry: JSON.parse(st_asgeojson),
      properties: {
        county_name: county_name,
        precinct_name: precinct_name,
        title: precinct_name
      }
    });
    features.push({
      type: "Feature",
      geometry: JSON.parse(centroid),
      properties: {
        title: precinct_name
      }
    });
  }
  return {
    type: "FeatureCollection",
    features: features
  };
}

function rand() {
  return Math.floor(Math.random() * 255) + 0;
}

class Root extends Component {
  constructor(props) {
    super(props);
    this.state = {
      viewport: {
        latitude: 35.301348,
        longitude: -82.27895,
        zoom: 11,
        maxZoom: 16,
        pitch: 0,
        bearing: 0,
        width: 500,
        height: 500
      },
      data: null,
      hoveredFeature: null
    };
    requestJson(DATA_URL, (error, response) => {
      if (!error) {
        this.setState({ data: to_feature_collection(NC) });
        //this.setState({data: response});
      }
    });
  }

  componentDidMount() {
    window.addEventListener("resize", this._resize.bind(this));
    this._resize();
  }

  _resize() {
    this._onViewportChange({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }

  _render_info_panel() {
    return null;
  }

  _onViewportChange(viewport) {
    this.setState({
      viewport: { ...this.state.viewport, ...viewport }
    });
  }

  _onHover({ x, y, object }) {
    this.setState({ x, y, hoveredFeature: object });
  }

  _renderTooltip() {
    const { x, y, hoveredObject } = this.state;
    console.log("foo", hoveredObject);
    if (!hoveredObject) {
      return null;
    }
    return (
      <div className="tooltip" style={{ left: x, top: y }}>
        <div>{`Accidents`}</div>
      </div>
    );
  }

  _onMouseMove(evt) {
    if (evt.nativeEvent) {
      this.setState({
        mousePosition: [evt.nativeEvent.offsetX, evt.nativeEvent.offsetY]
      });
    }
  }

  _onMouseEnter() {
    this.setState({ mouseEntered: true });
  }

  _onMouseLeave() {
    this.setState({ mouseEntered: false });
  }

  render() {
    const { viewport, data } = this.state;

    if (!data) {
      return null;
    }

    const layer = new GeoJsonLayer({
      id: "geojson",
      data,
      opacity: 0.4,
      stroked: false,
      filled: true,
      extruded: false,
      wireframe: false,
      fp64: false,
      onHover: this._onHover.bind(this),
      getFillColor: () => [rand(), rand(), rand(), rand()],
      elevationScale: 0,
      getLineColor: f => [255, 255, 255],
      pickable: Boolean(this.props.onHover)
    });

    return (
      <div
        onMouseMove={this._onMouseMove.bind(this)}
        onMouseEnter={this._onMouseEnter.bind(this)}
        onMouseLeave={this._onMouseLeave.bind(this)}
      >
        {this._renderTooltip.bind(this)}
        <MapGL
          {...viewport}
          onViewportChange={this._onViewportChange.bind(this)}
          mapboxApiAccessToken={MAPBOX_TOKEN}
        >
          <DeckGL {...viewport} layers={[layer]} />
        </MapGL>
      </div>
    );
  }
}

render(<Root />, document.body.appendChild(document.createElement("div")));
