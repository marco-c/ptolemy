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

  for (var i = 0; i < shape.length; i += 2) {
    var x = shape[i];
    var y = shape[i + 1];

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  if (fillShape) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

function insertSpot(spots, spot) {
  var inserted = false;

  for (var i = 0; i < spots.length; i++) {
    if (spot.x <= spots[i].x) {
      spots.splice(i, 0, spot);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    spots.push(spot);
  }
}

function orderWay(way) {
  for (var i = 0; i < way.length; i += 2) {
    var x = way[i];
    var y = way[i+1];

    var j = i-2;
    while (j > -1 && way[j] > x) {
      way[j+2] = way[j];
      way[j+3] = way[j+1];
      j -= 2;
    }

    way[j+2] = x;
    way[j+3] = y;
  }
  
  return way;
}

function drawStreetName(ctx, streetName, wayIn) {
  var way = orderWay(wayIn);

  var charWidth = ctx.measureText(streetName[0]).width;

  ctx.save();
  ctx.lineWidth = 1;
  ctx.fillStyle = "darkred";
  ctx.beginPath();

  var segments = [];

  var prevX = way[0];
  var prevY = way[1];
  ctx.moveTo(prevX, prevY);
  for (var i = 2; i < way.length; i += 2) {
    var curX = way[i];
    var curY = way[i+1];

    var diffX = curX - prevX;
    var diffY = curY - prevY;

    var segmentLength = Math.sqrt(diffX * diffX + diffY * diffY);
    var angle = Math.atan(diffY / diffX);

    segments.push({
      x: prevX,
      y: prevY,
      len: segmentLength,
      angle: angle
    });

    prevX = curX;
    prevY = curY;

    ctx.lineTo(curX, curY);
  }

  ctx.stroke();
  ctx.restore();

  console.log("CI SONO " + segments.length + " SEGMENTI");

  /*var curSegment = 0;
  var varX = 0;
  var varY = 0;
  var x = segments[curSegment].x;
  var y = segments[curSegment].y;
  var angle;
  for (var i = 0; i < streetName.length; i++) {
    do {
      segments[curSegment].len = segments[curSegment].len - charWidth;
      if (segments[curSegment].len < 0) {
        curSegment++;
        if (curSegment < segments.length) {
          angle = segments[curSegment].angle;
        }
      }
    } while (curSegment < segments.length && segments[curSegment].len < 0);

    if (curSegment >= segments.length || segments[curSegment].len < 0) {
      break;
    }

    console.log("VAR: " + (charWidth * Math.cos(angle)) + ", " + (charWidth * Math.sin(angle)));

    console.log("DRAW " + streetName[i] + " from " + (x + varX) + ", " + (y + varY) + " to " + (x + varX + charWidth * Math.cos(angle)) + ", " + (y + varY + charWidth * Math.sin(angle)));

    ctx.save();
    ctx.translate(x + varX, y + varY);
    ctx.rotate(angle);
    ctx.fillText(streetName[i], 0, 0);
    ctx.restore();

    varX += charWidth * Math.cos(angle);
    varY += charWidth * Math.sin(angle);
  }*/

  var points = [];

  var azzeraNext = false;
  var curSegment = 0;
  var varX = 0;
  var varY = 0;
  var x = segments[curSegment].x;
  var y = segments[curSegment].y;
  var angle = segments[curSegment].angle;
  for (var i = 0; i < streetName.length; i++) {
    if (azzeraNext) {
      var oldX = x;
      var oldY = y;
      var oldVarX = varX;
      var oldVarY = varY;

      x = segments[curSegment].x;
      y = segments[curSegment].y;
      angle = segments[curSegment].angle;
      varX = varY = 0;

      //while (((x+varX) < (oldX+oldVarX)) && ((y+varY+charWidth) > (oldY+oldVarY))) {
      //  varX += Math.cos(angle);
      //  varY += Math.sin(angle);
      //}

      azzeraNext = false;
    }

    do {
      segments[curSegment].len = segments[curSegment].len - charWidth;
      if (segments[curSegment].len < 0) {
        curSegment++;
        azzeraNext = true;
      }
    } while (curSegment < segments.length && segments[curSegment].len < 0);

    if (curSegment >= segments.length || segments[curSegment].len < 0) {
      break;
    }

    //console.log("CUR_SEG: " + curSegment + ", x: " + x + ", y: " + y);
    //console.log("DRAW " + streetName[i] + " from " + (x + varX) + ", " + (y + varY) + " to " + (x + varX + charWidth * Math.cos(angle)) + ", " + (y + varY + charWidth * Math.sin(angle)));

    /*ctx.save();
    ctx.translate(x + varX, y + varY);
    ctx.rotate(angle);
    ctx.fillText(streetName[i], 0, 0);
    ctx.restore();*/

    points.push({
      x: x + varX,
      y: y + varY
    });

    varX += charWidth * Math.cos(angle);
    varY += charWidth * Math.sin(angle);
  }

  if (points.length < streetName.length) {
    return;
  }

  var charWritten = 0;
  for (var i = 0; i < points.length; i++) {
    var point = points[i];

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    ctx.fillText(streetName[i], 0, 0);
    ctx.restore();
  }

  /*var charWidth = ctx.measureText(streetName[0]).width;

  var spots = [];

  var totalChars = 0;
  var prevX = way[0];
  var prevY = way[1];
  for (var i = 2; i < way.length; i += 2) {
    var curX = way[i];
    var curY = way[i+1];

    var diffX = curX - prevX;
    var diffY = curY - prevY;

    var angle = Math.atan(diffY / diffX);

    var segmentLength = Math.sqrt(diffX * diffX + diffY * diffY);

    var charNum = Math.floor(segmentLength / charWidth)

    //var charNum = 0;
    //for (var i = totalChars; i < streetName.length; i++) {
    //  console.log("segleg: " + segmentLength);
    //  var charWidth = ctx.measureText(streetName[i]).width;
    //  segmentLength -= charWidth;
    //  if (segmentLength < 0) {
    //    break;
    //  }
    //  charNum++;
    //}

    console.log("charNum: " + charNum);
    console.log("angle: " + angle);
    console.log("diffX: " + diffX);
    console.log("diffY: " + diffY);

    if (charNum > 0) {
      var newSpot = {
          charNum: charNum,
          x: prevX,
          y: prevY,
          angle: angle
        };

      insertSpot(spots, newSpot);

      totalChars += charNum;
      if (totalChars >= streetName.length) {
        break;
      }

      prevX = prevX + charNum * charWidth;
      var varX = curX - prevX;
      var varY = varX * Math.tan(angle);
      prevY = curY - varY;
    }
  }

  if (totalChars < streetName.length) {
    return;
  }

  console.log("SPOTS: " + JSON.stringify(spots));

  var drawnCharNum = 0;
  var i = 0;
  do {
    var str = streetName.substr(drawnCharNum, spots[i].charNum);

    ctx.save();
    ctx.translate(spots[i].x, spots[i].y);
    ctx.rotate(angle);
    ctx.fillText(str, 0, 0);
    ctx.restore();

    drawnCharNum += spots[i].charNum;

    console.log("DRAW STR: " + str);
    console.log("DRAWN: " + drawnCharNum);
    console.log("DRAWTO: " + spots[i].x + ", " + spots[i].y);

    i++;
  } while(spots[i] && drawnCharNum != streetName.length);*/

  /*var way = wayIn;

  var nameWidth = ctx.measureText(streetName).width;

  var skipPixels = 0;

  var prevX = way[0];
  var prevY = way[1];

  //console.log("NAME WIDTH: " + nameWidth);

  //console.log("PREVX: " + prevX);
  //console.log("PREVY: " + prevY);

  for (var i = 2; i < way.length; i += 2) {
    var curX = way[i];
    var curY = way[i+1];

  //console.log("CURX: " + curX);
  //console.log("CURY: " + curY);

    var diffX = curX - prevX;
    var diffY = curY - prevY;
    var segmentLengthInPixel = Math.sqrt(diffX * diffX + diffY * diffY);

    var angle = Math.atan(diffY / diffX);
    //console.log("angle: " + angle);

    //console.log("LEN: " + segmentLengthInPixel);

    if (skipPixels > 0) {
      skipPixels -= segmentLengthInPixel;
    } else if (segmentLengthInPixel > nameWidth) {
      ctx.save();

      if (prevX <= curX) {
        //console.log("DRAW AT: " + prevX + ", " + prevY);
        ctx.translate(prevX, prevY);
      } else {
        //console.log("DRAW AT: " + curX + ", " + curY);
        ctx.translate(curX, curY);
      }
      ctx.rotate(angle);
      ctx.fillText(streetName, 0, 0);
      ctx.restore();

      skipPixels = 100;
    }

    prevX = curX;
    prevY = curY;
  }*/
}

var wayRenderingStyle = [
  {
    name: LANDUSE_TYPE, color: 'green', fill: true,
  },
  {
    name: NATURAL_TYPE, fill: true, color: '#68B300'
  },
  {
    // Riverbanks
    name: WATERA_TYPE, color: '#00899E', fill: true
  },
  {
    // Rivers
    name: WATERB_TYPE, color: '#00899E', lineWidth: LINE_WIDTH_ROOT * 5
  },
  {
    name: BUILDING_TYPE, color: 'burlywood', fill: true
  },
  {
    name: HIGHWAYD_TYPE, color: 'white', lineWidth: LINE_WIDTH_ROOT * 3
  },
  {
    name: HIGHWAYC_TYPE, color: 'white', lineWidth: LINE_WIDTH_ROOT * 7
  },
  {
    name: HIGHWAYB_TYPE,
    color: '#F7EF0D',
    lineWidth: LINE_WIDTH_ROOT * 10,
    outline: true
  },
  {
    name: HIGHWAYA_TYPE,
    color: '#FFA200',
    lineWidth: LINE_WIDTH_ROOT * 10,
    outline: true
  }
];

var features = wayRenderingStyle.map(function(style) {
  return style.name;
});

function renderTile(x, y, zoomLevel, ctx, mapData, callback) {
  ctx.save();

  // Figure out the boundary box of the tile to render.
  var tileBB = getTileBoundingBoxInMeter(x, y, zoomLevel);
  var pixelPerMeter = getPixelPerMeter(zoomLevel);

  console.log("Pixel per meter: " + pixelPerMeter);
  console.log("-tileBB.minX: " + (-tileBB.minX));
  console.log("-tileBB.minY: " + (-tileBB.minY));

  ctx.scale(pixelPerMeter, pixelPerMeter);
  ctx.translate(-tileBB.minX, -tileBB.minY);

  var tileName = zoomLevel + '/' + x + '/' + y;
  console.log('Render tile:', tileName);
  // console.log(tileBB);

  // Clip to the boundingBox of the tile on the canvas to prevent
  // drawing outside of the current tile.
  ctx.rect(tileBB.minX, tileBB.minY, tileBB.width, tileBB.height);
  ctx.clip();

  // Lookup the wayMapping from the mapData.
  mapData.collectTileData(x, y, zoomLevel, function(error, tileData) {
    if (error) {
      ctx.restore();
      callback(error);
      return;
    }

    renderTileData(ctx, tileData, zoomLevel);
    ctx.restore();

    callback(null);
  });
}

function renderTileData(ctx, tileData, zoomLevel) {
  console.time('render-start');

  // Rounded lines look cute :)
  ctx.lineCap = 'round';

  // Draw all the way rendering stayles.
  for (var i = 0; i < wayRenderingStyle.length; i++) {
    var style = wayRenderingStyle[i];
    var ways = tileData[style.name];

    assert(ways);

    if (style.outline) {
      for (var n = 0; n < ways.length; n++) {
        ctx.lineWidth = style.lineWidth * 1.1;
        ctx.strokeStyle = '#686523';

        drawShape(ctx, ways[n], false);
      }
    }

    ctx.lineWidth = style.lineWidth;
    if (style.fill) {
      ctx.fillStyle = style.color;
    } else {
      ctx.strokeStyle = style.color;
    }

    var fill = style.fill;
    for (var j = 0; j < ways.length; j++) {
      drawShape(ctx, ways[j], fill);
    }
  }

  // Draw street names
  ctx.fillStyle = "black";
  ctx.textBaseline = 'middle'; 

  for (var i = 0; i < wayRenderingStyle.length; i++) {
    var style = wayRenderingStyle[i];
    if (style.name != HIGHWAYA_TYPE && style.name != HIGHWAYB_TYPE &&
        style.name != HIGHWAYC_TYPE && style.name != HIGHWAYD_TYPE) {
      continue;
    }

    if (zoomLevel < 18 && style.name == HIGHWAYD_TYPE) {
      continue;
    }
    if (zoomLevel < 17 && style.name == HIGHWAYC_TYPE) {
      continue;
    }
    if (zoomLevel < 16 && style.name == HIGHWAYB_TYPE) {
      continue;
    }
    if (zoomLevel < 15 && style.name == HIGHWAYA_TYPE) {
      continue;
    }

    var ways = tileData[style.name];

    ctx.font = style.lineWidth + "px courier";

    for (var j = 0; j < ways.length; j++) {
      drawStreetName(ctx, "Via Mozilla", ways[j]);
    }
  }

  ctx.font = "20px courier";

  var provaway = [
          21324427.22353956,
          13907433.655319111,
          21324397.067089505,
          13907437.542120825,
          21324350.279507525,
          13907438.042567268,
          21324233.99516744,
          13907438.976733886,
          21324209.727518447,
          13907439.477180244,
          21324175.98658079,
          13907440.928474523,
          21324174.327920377,
          13907441.51232848,
          21324137.570224516,
          13907449.76968724,
          21324108.927719533,
          13907456.242116421,
          21324071.958516642,
          13907459.144699058,
          21323937.250800833,
          13907460.228996908,
          21323922.99077406,
          13907463.748793622,
          21323911.38015117,
          13907466.61801073
        ];
  /*var provaway = [
          //21323911.38015117,
          //13907466.61801073,
          //21323922.99077406,
          //13907463.748793622,
          //21323937.250800833,
          //13907460.228996908,
          //21324071.958516642,
          //13907459.144699058,
          21324108.927719533,
          13907456.242116421,
          21324137.570224516,
          13907449.76968724,
          21324174.327920377,
          13907441.51232848,
          21324175.98658079,
          13907440.928474523,
          21324209.727518447,
          13907439.477180244,
          21324233.99516744,
          13907438.976733886,
          21324350.279507525,
          13907438.042567268,
          21324397.067089505,
          13907437.542120825,
          21324427.22353956,
          13907433.655319111,
        ];*/
  drawStreetName(ctx, "Via Mozilla", provaway);

  console.timeEnd('render-start');
}

function renderMapData(mapData) {
  var b = mapData.bounds;
  var latLon = [(b.minlat + b.maxlat)/2, (b.minlon + b.maxlon)/2];

  console.log(latLon);

  map.setView(latLon, MAP_DEFAULT_ZOOM);
  mapLayer.mapData = mapData;
  mapLayer.redraw();
}

function renderMapDataOnCanvas() {
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');

  // --- Translate the canvas context to make drawing go at the right spot ---
  var tileBounds = mapData.getTileBounds(MAP_DEFAULT_ZOOM);

  var tileMin = tileBounds.min;
  var tileMax = tileBounds.max;

  var tileXCount = tileMax[0] - tileMin[0] + 1;
  var tileYCount = tileMax[1] - tileMin[1] + 1;

  // --- Add margin around the map and color background ---
  var mapMargin = 10;

  var canvasWidth = tileXCount * TILE_SIZE;
  var canvasHeight = tileYCount * TILE_SIZE;

  canvas.width = canvasWidth + 2 * mapMargin;
  canvas.height = canvasHeight + 2 * mapMargin;

  ctx.translate(mapMargin, mapMargin);

  // Draw the background of the map.
  ctx.fillStyle = 'rgb(237, 230, 220)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // --- Draw the individual tiles of the map ---

  var x = 0;
  var y = 0;
  function renderNextTile() {
    if (x == tileXCount) {
      return;
    }

    ctx.save();
    ctx.translate(x * TILE_SIZE, y * TILE_SIZE);

    renderTile(
      x + tileMin[0], y + tileMin[1], MAP_DEFAULT_ZOOM, ctx, mapData,
      function callback() {
        ctx.restore();

        y ++;
        if (y == tileYCount) {
          x ++;
          y = 0;
        }

        // setTimeout(renderNextTile, 0);
        renderNextTile();
      }
    );
  }

  renderNextTile();
}
