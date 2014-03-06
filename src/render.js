/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* globals getTileBoundingBoxInMeter, getPixelPerMeter, assert, map,
    MAP_DEFAULT_ZOOM, mapLayer, mapData, TILE_SIZE, WATERA_TYPE,
    WATERB_TYPE, HIGHWAYA_TYPE, HIGHWAYB_TYPE, HIGHWAYC_TYPE,
    HIGHWAYD_TYPE, NATURAL_TYPE, BUILDING_TYPE, LANDUSE_TYPE */
'use strict';

// --- Actual rendering ---

// Adjust this based on current zoom level.
var LINE_WIDTH_ROOT = 1.5;

function drawShape(ctx, shape, fillShape) {
  ctx.beginPath();

  ctx.moveTo(shape[0], shape[1]);

  for (var i = 2; i < shape.length; i += 2) {
    var x = shape[i];
    var y = shape[i + 1];
    ctx.lineTo(x, y);
  }

  if (fillShape) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

var wayRenderingStyle = {
  1: {
    // Riverbanks
    color: '#00899E', fill: true
  },
  2: {
    // Rivers
    color: '#00899E', lineWidth: LINE_WIDTH_ROOT * 5
  },
  3: {
    color: '#FFA200',
    lineWidth: LINE_WIDTH_ROOT * 10,
    outline: true
  },
  4: {
    color: '#F7EF0D',
    lineWidth: LINE_WIDTH_ROOT * 10,
    outline: true
  },
  5: {
    color: 'white', lineWidth: LINE_WIDTH_ROOT * 7
  },
  6: {
    color: 'white', lineWidth: LINE_WIDTH_ROOT * 3
  },
  7: {
    fill: true, color: '#68B300'
  },
  8: {
    color: 'burlywood', fill: true
  },
  9: {
    color: 'green', fill: true,
  },
};

function renderTile(x, y, zoomLevel, ctx, mapData) {
  ctx.save();

  // Figure out the boundary box of the tile to render.
  var tileBB = getTileBoundingBoxInMeter(x, y, zoomLevel);
  var pixelPerMeter = getPixelPerMeter(zoomLevel);

  ctx.scale(pixelPerMeter, pixelPerMeter);
  ctx.translate(-tileBB.minX, -tileBB.minY);

  var tileName = zoomLevel + '/' + x + '/' + y;

  // Clip to the boundingBox of the tile on the canvas to prevent
  // drawing outside of the current tile.
  ctx.rect(tileBB.minX, tileBB.minY, tileBB.width, tileBB.height);
  ctx.clip();

  // Lookup the wayMapping from the mapData.
  mapData.collectTileData(x, y, zoomLevel, function(error, tileData) {
    if (error) {
      ctx.restore();
      return;
    }

    renderTileData(ctx, tileData);
    ctx.restore();
  });
}

function renderData(ctx, data) {
  var farr = new Float32Array(data);
  var iarr = new Uint32Array(data);

  var offset = 0;
  var featureCount = iarr[offset];
  offset += 1;

  for (var i = 0; i < featureCount; i++) {
    var featureID = iarr[offset];

    var style = wayRenderingStyle[featureID];

    var entryCount = iarr[offset + 1];
    offset += 2;

    for (var n = 0; n < entryCount; n++) {
      var nodeSize = iarr[offset];
      offset += 1;

      var nodes = [];
      for (var k = 0; k < nodeSize; k++) {
        nodes.push(farr[offset]);
        offset += 1;
      }

      if (style.outline) {
        ctx.lineWidth = style.lineWidth * 1.1;
        ctx.strokeStyle = '#686523';

        drawShape(ctx, nodes, false);
      }

      ctx.lineWidth = style.lineWidth;
      if (style.fill) {
        ctx.fillStyle = style.color;
      } else {
        ctx.strokeStyle = style.color;
      }

      drawShape(ctx, nodes, style.fill);
    }
  }
}

function renderTileData(ctx, tileData) {
  console.time('render-start');

  // Rounded lines look cute :)
  ctx.lineCap = 'round';

  for (var i = 0; i < tileData.length; i++) {
    var data = tileData[i];
    renderData(ctx, data);
  }

  console.timeEnd('render-start');
}

function renderMapData(mapData) {
  var b = mapData.bounds;
  var latLon = [(b.minlat + b.maxlat)/2, (b.minlon + b.maxlon)/2];

  map.setView(latLon, MAP_DEFAULT_ZOOM);
  mapLayer.mapData = mapData;
  mapLayer.redraw();
}
