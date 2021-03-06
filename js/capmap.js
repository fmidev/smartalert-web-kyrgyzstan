
var DEBUG = false
var map
var markers = []
var polygons = []
var mapMarkers = L.layerGroup()
var mapPolygons = L.layerGroup()
var markerLocations = []
var xDisplacement = 0
var xDisplacementValue = 0
var languages = []
var events = []
var selectedDAY = null
var selectedEVENT = null
var translations = {}
var dayControll
var nameLayer

// Remember previous state
var selectedLANGUAGE = localStorage.getItem('userLanguage') ? localStorage.getItem('userLanguage') : alertOptions.defaultLanguage
var selectedEVENT = localStorage.getItem('userEventType') ? localStorage.getItem('userEventType') : ''

function debug (str) {
  if (DEBUG) {
    try {
      console.log(str)
    } catch (e) {};
  }
}

function t (key) {
  if (translations[selectedLANGUAGE][key] != null) { return translations[selectedLANGUAGE][key] } else { return key }
}

Date.prototype.isBeforeDay = function (day) {
  var d = new Date()
  d.setDate(d.getDate() + day)
  d.setHours(23)
  d.setMinutes(59)
  d.setSeconds(59)
  d.setMilliseconds(999)

  debug(this + ' < ' + d)

  if (this.getTime() < d.getTime()) { return true } else { return false }
}

Date.prototype.isAfterDay = function (day) {
  var d = new Date()
  d.setDate(d.getDate() + day)
  d.setHours(0)
  d.setMinutes(0)
  d.setSeconds(0)
  d.setMilliseconds(0)

  debug('After check: ' + this + ' > ' + d)

  if (this.getTime() > d.getTime()) { return true } else { return false }
}

Date.prototype.dateDiff = function () {
  var date = this
  var now = new Date()
  var string = ''

  var diff = date - now
  var abs = Math.abs(date - now)
  var days = Math.floor(abs / 86400000)
  var hours = Math.floor(abs % 86400000 / 3600000)
  var minutes = Math.floor(abs % 86400000 % 3600000 / 60000)

  if (days == 1) { string = string + days + ' ' + t('day') + ' ' } else if (days > 1) { string = string + days + ' ' + t('days') + ' ' }

  if (hours == 1) { string = string + hours + ' ' + t('hour') + ' ' } else if (hours > 1) { string = string + hours + ' ' + t('hours') + ' ' }

  if (minutes == 1) { string = string + minutes + ' ' + t('minute') + ' ' } else if (minutes > 1 || minutes == 0) { string = string + minutes + ' ' + t('minutes') + ' ' }

  if (diff < 0) { string = string + t('ago') }

  return string
}

function initialize () {
  map = L.map('map-canvas', {
    zoom: alertOptions.zoom,
    fullscreenControl: true,
    scrollWheelZoom: true,
    center: alertOptions.center,
    accessToken: alertOptions.accesToken
  })

  // use map panes to set layer z-index values
  map.createPane('Extreme');
  map.getPane('Extreme').style.zIndex = 585;
  map.createPane('Severe');
  map.getPane('Severe').style.zIndex = 584;
  map.createPane('Moderate');
  map.getPane('Moderate').style.zIndex = 583;
  map.createPane('Minor');
  map.getPane('Minor').style.zIndex = 582;
  map.createPane('Default');
  map.getPane('Default').style.zIndex = 581;


  // user location disabled
  if (alertOptions.useLocation == true) { centerUserLocation() }

  // mapbox access token
  // https://www.mapbox.com/account/

  var Esri_WorldTopoMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, <a href="' + alertOptions.attributionLink + '">' + alertOptions.attribution + '</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    opacity: 1,
  }).addTo(map)

	map.createPane('labels');
	// This pane is above markers but below popups
	map.getPane('labels').style.zIndex = 590;
	// Layers in this pane are non-interactive and do not obscure mouse/touch events
	map.getPane('labels').style.pointerEvents = 'none';
  nameLayer = L.tileLayer(alertOptions.mapTileSource, {
    pane: 'labels',
    opacity: 0.45
  }).addTo(map)

  var southWest = new L.LatLng(alertOptions.bounds.south, alertOptions.bounds.east)
  var northEast = new L.LatLng(alertOptions.bounds.north, alertOptions.bounds.west)
  var bounds = new L.LatLngBounds(southWest, northEast)
  map.fitBounds(bounds, { padding: [5, 5] })

  document.getElementById('eventType').addEventListener('change', function () {
    debug('Event Type selected: ' + document.getElementById('eventType').value)
    if (document.getElementById('eventType').value != '') { selectedEVENT = document.getElementById('eventType').value } else { selectedEVENT = null }
    showMarkers(selectedDAY)
    showPolygons(selectedDAY)
  })

  $('#lang').html('')
  $(Object.keys(translations)).each(function (i, lang) {
    debug('Added language ' + lang + ' to language dropdown menu.')
    $('#lang').append($('<option>').attr('value', lang).text(translations[lang][lang]))
    if (lang === selectedLANGUAGE) { $('#lang').val(lang).change() }
  })

  $('#lang').on('change', changeLanguage)

  if (Object.keys(translations).length < 2) { $('#lang').css('display', 'none') }

  updateEventSelect()
  setInterval(updateData, alertOptions.refresh * 1000)
  changeLanguage()
}

function updateEventSelect () {
  $('#eventType').html('')
  $('#eventType').append($('<option>').attr('value', '').text(t('All Hazard Types')))
  $(Object.keys(alertOptions.eventTypes)).each(function (i, eventType) {
    debug('Added eventType ' + eventType + ' to eventType dropdown menu.')
    $('#eventType').append($('<option>').attr('value', eventType).text(t(alertOptions.eventTypes[eventType])))
    if (eventType === selectedEVENT) { $('#eventType').val(eventType).change() }
  })
}

function changeLanguage () {
  debug('Language selected: ' + document.getElementById('lang').value)
  selectedLANGUAGE = document.getElementById('lang').value
  localStorage.setItem('userLanguage', selectedLANGUAGE)

  // Translate Legend
  $('#levelNoneText').text(t('no awareness needed'))
  $('#levelGreenText').text(t('minor threat'))
  $('#levelYellowText').text(t('potentially dangerous'))
  $('#levelOrangeText').text(t('dangerous'))
  $('#levelRedText').text(t('very dangerous'))

  var dayControlDiv = document.createElement('div')
  var dayControl = new DayControl(dayControlDiv, map)

  dayControlDiv.index = 1
  // dayControlDiv.style['padding-top'] = '10px';
  dayControlDiv.style['border'] = 'none'

  if (dayControll !== undefined) { map.removeControl(dayControll) }

  addControlPlaceholders(map)
  dayControll = new L.Control.Zoom({ position: 'horizontalcentertop' }).addTo(map)

  dayControll._container.style['border'] = 'none'

  $(dayControll._container).html(dayControlDiv)

  updateEventSelect()
  updateData()
}

// Create additional Control placeholders
function addControlPlaceholders (mapObject) {
  var corners = mapObject._controlCorners

  var l = 'leaflet-'

  var container = mapObject._controlContainer

  function createCorner (vSide, hSide) {
    var className = l + vSide + ' ' + l + hSide

    corners[vSide + hSide] = L.DomUtil.create('div', className, container)
  }

  createCorner('horizontalcenter', 'top')
  createCorner('horizontalcenter', 'bottom')
  createCorner('verticalcenter', 'left')
  createCorner('verticalcenter', 'right')
}

function updateData () {
  debug('Updating data:')
  $.getJSON('list.php', processCAP)
}

function testcircle (polygon, path) {
  // TODO

  // var bounds = polygon.getBounds();
  // var r1 = bounds.getSouthWest();
  // var r2 = bounds.getNorthEast();
  // var vertices = polygon.getPath();
  // var mindistance = 100000000000000;
  // var centerpoint;

  // for (i=1; i <= 40; i++) {
  // var step = (1/40);
  // var interpolated = google.maps.geometry.spherical.interpolate(r1, r2, step * i);

  // // Drop points that are not inside polygon
  // if (google.maps.geometry.poly.containsLocation(interpolated, polygon) == false)
  // 	continue;

  // var distance = 0;
  // for (var j =0; j < vertices.getLength(); j++) {
  //     var xy = vertices.getAt(j);
  //     distance = distance + google.maps.geometry.spherical.computeDistanceBetween(xy, interpolated);

  // } // for

  // if (distance < mindistance)
  //     {
  // 	mindistance = distance;
  // 	centerpoint = interpolated;
  //     } // fi
  // } // for

  // return centerpoint;
  return false
}

function centerUserLocation () {
  // Try HTML5 geolocation.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }

      var icon = L.icon({
        iconUrl: '../img/location.svg'
      })

      var marker = L.marker(pos, { icon: icon }).addTo(map)
      map.setView([position.coords.latitude, position.coords.longitude])
    }, function () {
      debug('Unable to get location')
    })
  } else {
    // Browser doesn't support Geolocation
    debug("Browser doesn't support Geolocation")
  }
}

function showMarkers (day) {
  for (var i = 0; i < markers.length; i++) {
    var fromDate = new Date(markers[i].options.fromDate)
    var toDate = new Date(markers[i].options.toDate)

    if (polygons[i].options.polygonArea < alertOptions.areaLimitForMarkers) {
      markers[i].getElement().style.display = 'none'
    } else if (day == null || day == 'undefined') {
      if (~polygons[i].options.capEvent.indexOf(selectedEVENT) || selectedEVENT == null) { markers[i].getElement().style.display = 'inline' } else { markers[i].getElement().style.display = 'none' }
    } else if (fromDate.isBeforeDay(day) && toDate.isAfterDay(day)) {
      if (~polygons[i].options.capEvent.indexOf(selectedEVENT) || selectedEVENT == null) { markers[i].getElement().style.display = 'inline' } else { markers[i].getElement().style.display = 'none' }
    } else { markers[i].getElement().style.display = 'none' }
  }
  debug('Number of markers: ' + markers.length)
}

function showPolygons (day) {
  for (var i = 0; i < polygons.length; i++) {
    var fromDate = new Date(polygons[i].options.fromDate)
    var toDate = new Date(polygons[i].options.toDate)

    if (day == null) {
      if (~polygons[i].options.capEvent.indexOf(selectedEVENT) || selectedEVENT == null) {
        polygons[i].getElement().style.display = 'inline'
      } else {
        polygons[i].getElement().style.display = 'none'
      }
    } else if (fromDate.isBeforeDay(day) && toDate.isAfterDay(day)) {
      if (~polygons[i].options.capEvent.indexOf(selectedEVENT) || selectedEVENT == null) {
        polygons[i].getElement().style.display = 'inline'
      } else {
        polygons[i].getElement().style.display = 'none'
      }
    } else { polygons[i].getElement().style.display = 'none' }
  }
  debug('Number of polygons: ' + polygons.length)
}

function processCAP (json) {
  debug('Loaded JSON: ' + json)

  // Clear all markers
  // clear all previous polygons and markers before adding new ones
  mapPolygons.clearLayers()
  mapMarkers.clearLayers()
  xDisplacement = 0;
  markerLocations = [];
  markers = []

  // Clear all polygons
  // clear all previous polygons and markers before adding new ones
  mapPolygons.clearLayers()
  mapMarkers.clearLayers()
  polygons = []

  if (json !== null) {
    for (var i = 0; i < json.length; i++) {
      debug('Loading CAP file: ' + json[i])
      $.get(json[i], function (data) {
        doCAP(data)
      })
    }
  }
}

function DayControl (controlDiv, map) {
  if (alertOptions.dayControl == false) { return }
  // We set up a variable for this since we're adding event listeners later.
  var control = this

  // Set the center property upon construction
  //    control.center_ = center;
  controlDiv.style.clear = 'both'

  if (alertOptions.day0Control == true) {
    // Set CSS for the control border
    var setDay0UI = document.createElement('div')
    setDay0UI.id = 'setDay0UI'
    setDay0UI.title = t('Click to show alerts for today.')
    controlDiv.appendChild(setDay0UI)

    // Set CSS for the control interior
    var setDay0Text = document.createElement('div')
    setDay0Text.id = 'setDay0Text'
    setDay0Text.innerHTML = t('Today')
    setDay0UI.appendChild(setDay0Text)

    // Set up the click event listener for day buttons on top.
    setDay0UI.addEventListener('click', function () {
      selectedDAY = 0
      showMarkers(0)
      showPolygons(0)
      debug('Show events for today.')
    })
  }

  if (alertOptions.day1Control == true) {
    // Set CSS for the setDay1 control border
    var setDay1UI = document.createElement('div')
    setDay1UI.id = 'setDay1UI'
    setDay1UI.title = t('Click to show alerts for tomorrow.')
    controlDiv.appendChild(setDay1UI)

    // Set CSS for the control interior
    var setDay1Text = document.createElement('div')
    setDay1Text.id = 'setDay1Text'
    setDay1Text.innerHTML = t('Tomorrow')
    setDay1UI.appendChild(setDay1Text)

    setDay1UI.addEventListener('click', function () {
      selectedDAY = 1
      showMarkers(1)
      showPolygons(1)
      debug('Show events for tomorrow.')
    })
  } // if

  if (alertOptions.day2Control == true) {
    // Set CSS for the setCenter control border
    var setDay2UI = document.createElement('div')
    setDay2UI.id = 'setDay2UI'
    setDay2UI.title = t('Click to show alerts for day after tomorrow')
    controlDiv.appendChild(setDay2UI)

    // Set CSS for the control interior
    var setDay2Text = document.createElement('div')
    setDay2Text.id = 'setDay2Text'
    setDay2Text.innerHTML = t('Day after tomorrow')
    setDay2UI.appendChild(setDay2Text)

    setDay2UI.addEventListener('click', function () {
      selectedDAY = 2
      showMarkers(2)
      showPolygons(2)
      debug('Show events for the day after tomorrow.')
    })
  } // if

  if (alertOptions.day3Control == true) {
    // Set CSS for the setCenter control border
    var setDay3UI = document.createElement('div')
    setDay3UI.id = 'setDay3UI'
    setDay3UI.title = t('Click to show warnings for day 4.')
    controlDiv.appendChild(setDay3UI)

    // Set CSS for the control interior
    var setDay3Text = document.createElement('div')
    setDay3Text.id = 'setDay3Text'
    setDay3Text.innerHTML = t('Day 4')
    setDay3UI.appendChild(setDay3Text)

    setDay3UI.addEventListener('click', function () {
      selectedDAY = 3
      showMarkers(3)
      showPolygons(3)
      debug('Click to show warnings for day 4.')
    })
  } // if

  if (alertOptions.day4Control == true) {
    // Set CSS for the setCenter control border
    var setDay4UI = document.createElement('div')
    setDay4UI.id = 'setDay4UI'
    setDay4UI.title = t('Click to show warnings for day 5.')
    controlDiv.appendChild(setDay4UI)

    // Set CSS for the control interior
    var setDay4Text = document.createElement('div')
    setDay4Text.id = 'setDay4Text'
    setDay4Text.innerHTML = t('Day 5')
    setDay4UI.appendChild(setDay4Text)

    setDay4UI.addEventListener('click', function () {
      selectedDAY = 4
      showMarkers(4)
      showPolygons(4)
      debug('Click to show warningsfor day 5.')
    })
  } // if

  if (alertOptions.allDayControl == true) {
    // Set CSS for the setAllDay control border
    var setAllDaysUI = document.createElement('div')
    setAllDaysUI.id = 'setAllDaysUI'
    setAllDaysUI.title = t('Click to show all active alerts')
    controlDiv.appendChild(setAllDaysUI)

    // Set CSS for the control interior
    var setAllDaysText = document.createElement('div')
    setAllDaysText.id = 'setAllDaysText'
    setAllDaysText.innerHTML = t('All')
    setAllDaysUI.appendChild(setAllDaysText)

    setAllDaysUI.addEventListener('click', function () {
      selectedDAY = null
      showMarkers(null)
      showPolygons(null)
      debug('Show all events.')
    })
  } // fi
}

function doCAP (dom) {
  xDisplacement = 0
  xDisplacementValue = 0
  debug('Loaded CAP:\n' +
      '- Identifier: ' + dom.querySelector('identifier').textContent + '\n' +
      // "- Web:     " + (dom.querySelector('web').textContent || "") + "\n"+
      '- Sent by: ' + dom.querySelector('sender').textContent + '\n' +
      '- Sent at: ' + dom.querySelector('sent').textContent)

  var alert = dom.querySelector('alert')
  var info = alert.querySelector('info')
  var infos = alert.querySelectorAll('info')
  var area = info.querySelector('areaDesc').textContent
  var severity = info.querySelector('severity').textContent
  var areapolygons = info.querySelectorAll('polygon')
  var parameters = info.querySelectorAll('parameter')
  var d = new Date(alert.querySelector('sent').textContent)
  var windSpeed, windDirection, waveHeight, waveDirection, swellHeight, surfHeight
  var eventSelector = info.querySelector('event').textContent.replace('High Seas', '').replace('Severe weather for', '').replace('Moderate to Fresh', '').replace('Gale force', '').replace('Strong', '').replace('Moderate', '').replace('Heavy', '').trim().split(' ')[0].trim().toLowerCase()
  var eventRaw = info.querySelector('event').textContent.toLowerCase()

  // Check available languages
  languages = []
  for (var ie = 0; ie < infos.length; ie++) {
    if (infos[ie].querySelector('language').textContent == selectedLANGUAGE) { info = infos[ie] }
    languages.push(infos[ie].querySelector('language').textContent)
  }
  debug('Languages: ' + languages)

  // Use CAP field onset if available (f.eg. SmartAlert)
  // Otherwise use CAP field effective (f.eg. NOAA)
  if (info.querySelector('onset')) {
    var fromDate = new Date(info.querySelector('onset').textContent)
    var fromDateISO = info.querySelector('onset').textContent
  } else if (info.querySelector('effective')) {
    var fromDate = new Date(info.querySelector('effective').textContent)
    var fromDateISO = info.querySelector('effective').textContent
  }

  var toDate = new Date(info.querySelector('expires').textContent)
  var dnow = new Date()

  if (!toDate.isAfterDay(0)) { return }

  events.push(eventSelector)

  debug('Event: ' + events)
  debug('Area Description: ' + area)
  debug('Number of polygons: ' + areapolygons.length)

  for (var v = 0; v < parameters.length; v++) {
    if (parameters[v].querySelector('valueName').textContent == 'WindSpeed') { windSpeed = Math.round(parameters[v].querySelector('value').textContent) }
    if (parameters[v].querySelector('valueName').textContent == 'WindDirection') { windDirection = Math.round(parameters[v].querySelector('value').textContent) }
    if (parameters[v].querySelector('valueName').textContent == 'WaveHeight') { waveHeight = Math.round(parameters[v].querySelector('value').textContent) }
    if (parameters[v].querySelector('valueName').textContent == 'SwellHeight') { swellHeight = Math.round(parameters[v].querySelector('value').textContent) }
    if (parameters[v].querySelector('valueName').textContent == 'SurfHeight') { surfHeight = Math.round(parameters[v].querySelector('value').textContent) }
    debug(parameters[v].querySelector('valueName').textContent)
    debug(parameters[v].querySelector('value').textContent)
  }

  if(eventRaw == "severe gale warning")
    eventRaw = "wind"
  if(eventRaw == "storm warning")
    eventRaw = "wind"
  if(eventRaw == "lightning warning")
    eventRaw = "thunderstorm"

  for (p = 0; p < areapolygons.length; p++) {
    var color
    var zindex
    var opacity
    var latLngs = areapolygons[p].textContent.split(' ')

    // create polygon
    var i; var latLng; var path = []

    for (i = 0; i < latLngs.length - 1; i++) {
      var latLng = latLngs[i].split(',')
      path.push(new L.LatLng(parseFloat(latLng[0]), parseFloat(latLng[1])))
    }
    switch (severity) {
      case 'Extreme':
        // Red
        color = '#FF0000'
        strokeColor = '#cc0000'
        zindex = 4
        opacity = 1
        break
      case 'Severe':
        // Orange
        color = '#FFA500'
        strokeColor = '#ba7901'
        zindex = 3
        opacity = 1
        break
      case 'Moderate':
        // Yellow
        color = '#FFFF00'
        strokeColor = '#afaf01'
        zindex = 2
        opacity = 1
        break
      case 'Minor':
        // Green
        color = '#00FF00'
        strokeColor = '#01a801'
        zindex = 1
        opacity = 1
        break
      default:
        color = '#FFFFFF'
        strokeColor = '#bcbcbc'
        opacity = 1
    }

    var areapolygon = L.polygon(path, {
      pane: severity,
      paths: path,
      fillColor: color,
      fillOpacity: 1,
      color: '#000000',
      opacity: alertOptions.polygonOptions.strokeOpacity,
      weight: alertOptions.polygonOptions.strokeWeight,
      map: map,
      visible: false,
      fromDate: fromDateISO,
      toDate: info.querySelector('expires').textContent,
      capEvent: eventRaw,
      // polygonArea: google.maps.geometry.spherical.computeArea(path),
      polygonArea: polygonArea(path),
      zIndex: zindex
    })

    // add polygons to a polygongroup
    areapolygon.addTo(mapPolygons)
    mapPolygons.addTo(map)

    polygons.push(areapolygon)
    var bounds = areapolygon.getBounds()

    // TODO
    // if (polygonArea(path) > 1)
    // var markerLocation = testcircle(areapolygon);
    // else
    var markerLocation = bounds.getCenter()
    var test = parseFloat(markerLocation['lat']).toFixed(4) + ' ' + parseFloat(markerLocation['lng']).toFixed(4)

    var value = coordinatesExist(markerLocations, test)
    if (alertOptions.polygonOptions.preventSymbolOverlapping === true) { xDisplacement = (alertOptions.iconWidth + 5) * value } else { xDisplacement = 0 }
    markerLocations.push(test)

    var symbolPath = 'img/'
    if(alertOptions.transparentIcons == true)
    symbolPath = 'img/transparent/'

    // fallback icon
    var icon = L.icon({
      iconUrl: symbolPath + 'gale.png',
      iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
      iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
      popupAnchor: [0, 0]
    })

    if (windSpeed > 0) {
      var icon = L.icon({
        iconUrl: symbolPath + 'wind.php?speed=' + windSpeed + '&direction=' + windDirection,
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (waveHeight > 0) {
      var icon = L.icon({
        iconUrl: symbolPath + 'wave.php?height=' + waveHeight,
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (swellHeight > 0) {
      var icon = L.icon({
        iconUrl: symbolPath + 'wave.php?height=' + swellHeight,
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (surfHeight > 0) {
      var icon = L.icon({
        iconUrl: symbolPath + 'wave.php?height=' + surfHeight,
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    }

    // Earthquake
    else if (~eventRaw.indexOf('earthquake')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'earthquake.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    }

    // Fire
    else if (~eventRaw.indexOf('fire')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'fire.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    }

    // Drought
    else if (~eventRaw.indexOf('drought')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'drought.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('craft')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'smallcraft.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('dust')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'dust.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('gale')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'gale.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('fog')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'fog.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('flood')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'flood.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('frost')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'frost.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('heat')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'temperature.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('ice phenomena')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'icejamming.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('cold')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'cold.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('temperature')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'temperature.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('water level') && !~eventRaw.indexOf('mudflow')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'flood.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
  } else if (~eventRaw.indexOf('mudflow') && !~eventRaw.indexOf('water level') && !~eventRaw.indexOf('glacial')) {
    var icon = L.icon({
      iconUrl: symbolPath + 'mudflow.png',
      iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
      iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
      popupAnchor: [0, 0]
    })
    } else if (~eventRaw.indexOf('glacial')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'mudflow2.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('mudflow') && ~eventRaw.indexOf('water level')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'mudflow.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    }
    // Rainfall Icon
    else if (~eventRaw.indexOf('rain')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'rainfall.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('snow')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'snow.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('icing')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'snow.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    }

    // Placeholder for sleet
    else if (~eventRaw.indexOf('sleet')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'sleet.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    }

    // Placeholder for snowfall
    else if (~eventRaw.indexOf('wet snow')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'snow.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('wind')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'gale.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    }

    // Tsunami Icon
    else if (~eventRaw.indexOf('tsunami')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'tsunami.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('tornado')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'tornado.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('waterspout')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'waterspout.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (eventSelector == 'volcanic') {
      var icon = L.icon({
        iconUrl: symbolPath + 'volcano.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('thunderstorm')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'thunderstorm.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('lightning')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'thunderstorm.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('storm')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'gale.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('hail')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'hail.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('hurricane')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'tropical-hurricane.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('tropical storm')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'tropical-storm.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('depression')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'tropical-depression.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    } else if (~eventRaw.indexOf('tropical')) {
      var icon = L.icon({
        iconUrl: symbolPath + 'cyclone.png',
        iconSize: [alertOptions.iconWidth, alertOptions.iconHeight],
        iconAnchor: [alertOptions.iconWidth / 2 + xDisplacement, alertOptions.iconWidth / 2],
        popupAnchor: [0, 0]
      })
    }

    var marker
    if (icon != null) {
      // create a marker for polygon
      marker = L.marker(markerLocation,
        {
          icon: icon,
          visible: false,
          icon: icon,
          fromDate: fromDateISO,
          toDate: info.querySelector('expires').textContent,
          capEvent: eventRaw,
        })
      marker.addTo(mapMarkers)
      mapMarkers.addTo(map)
    } else {
      marker = L.marker(markerLocation, { icon: null })
      marker.addTo(mapMarkers)
      mapMarkers.addTo(map)
    }

    // create an infowindow
    var sender
    if (info.querySelector('senderName')) { sender = info.querySelector('senderName').textContent } else { sender = alert.querySelector('sender').textContent }

    if (alert.querySelector('web')) { sender = '<a href="http://' + dom.querySelector('web').textContent + '">' + sender + '</a>' }

    $('#senderName').html(sender)

    if (dnow.getTime() > fromDate.getTime()) { var active_str = '<i>' + t('Active for next') + ' <b>' + toDate.dateDiff() + '</b></i>' } else { var active_str = '' }

    moment.updateLocale('ky', {
      months : [
        "????????????", "??????????????", "????????", "????????????", "??????", "????????", "????????", "????????????",
        "????????????????", "??????????????", "????????????", "??????????????"
      ]
    });
    moment.updateLocale('ru', {
      months : [
        "????????????", "??????????????", "??????????", "????????????", "??????", "????????", "????????", "??????????????",
        "????????????????", "??????????????", "????????????", "??????????????"
      ]
    });
      

    var fromDateFormatted = fromDate.toLocaleString()
    var toDateFormatted = toDate.toLocaleString()
    var dFormatted = d.toLocaleString()
    var fromDayNumber;
    var fromDayMonthYear;
    var toDayNumber;
    var toDayMonthYear;

    if (alertOptions.dateFormat === 'long') {
      var lang = selectedLANGUAGE.split('-')[0]
      fromDateFormatted = moment(fromDate).locale(lang).format(alertOptions.dateFormatString)
      toDateFormatted = moment(toDate).locale(lang).format(alertOptions.dateFormatString)
      dFormatted = moment(d).locale(lang).format(alertOptions.dateFormatString)
      fromDayNumber = moment(fromDate).locale(lang).format('DD');
      fromDayMonthYear = moment(fromDate).locale(lang).format('MMM YYYY, H:mm:ss');
      toDayNumber = moment(toDate).locale(lang).format('DD');
      toDayMonthYear = moment(toDate).locale(lang).format('MMM YYYY, H:mm:ss');
    }

    // var infowindow = new google.maps.InfoWindow({
    var content = '<h4 class="iw-title">' + info.querySelector('event').textContent + ' ' + t('for') + ' ' + info.querySelector('areaDesc').textContent + '</h4>' +
        '<i>' + t('Valid from') + ' <b>' + fromDateFormatted + '</b><br>' + t('to') + ' <b>' + toDateFormatted + '</b></i><br/>' +
        // active_str +
        '<p>' + (info.querySelector('description') ? info.querySelector('description').textContent : '') + '</p>' +
        '<p><i>' + t('Issued by') + ' ' + sender +
        ' ' + t('at') + ' ' + dFormatted + ' (' + d.dateDiff() + ')</i></p>'

    if(selectedLANGUAGE.split("-")[0] === 'ru') {
      content = '<h4 class="iw-title">' + info.querySelector('event').textContent + ' ' + t('for') + ' ' +info.querySelector('areaDesc').textContent +'</h4>' +
      '<i>' + t('Valid from')+' <b>'+fromDateFormatted+'</b><br>'+ t('to') +' <b>'+toDateFormatted+'</b></i><br/>' +
      // active_str +
      '<p>' + ( info.querySelector('description') ? info.querySelector('description').textContent : "" )+'</p>' +
      '<p><i>' + t('Issued by') + ' ' + sender +
      ' '+  t('at') + ' '+dFormatted+' ('+d.dateDiff()+')</i></p>'
    }
    if(selectedLANGUAGE.split("-")[0] === 'ky') {
      content = '<h4 class="iw-title">' + info.querySelector('areaDesc').textContent + ' ' + t('for') + ' ' +info.querySelector('event').textContent +'</h4>' +
      //'<i><b>'+fromDayNumber+'-'+fromDayMonthYear+' </b>' +t('Valid from')+'<br>' +' <b>'+toDayNumber+'-'+toDayMonthYear+' </b>'+ t('to') +'</i><br/>' +
      '<i><b>'+fromDateFormatted +' '+ t('Valid from')+'</b><br><b>'+toDateFormatted +' '+ t('to') +'</b></i><br/>' +
      // active_str +
      '<p>' + ( info.querySelector('description') ? info.querySelector('description').textContent : "" )+'</p>' +
      '<p><i>' + t('Issued by') + ' ' + sender +
      ' '+  t('at') + ' '+dFormatted+' ('+d.dateDiff()+')</i></p>'
    }

    // bind markers to marker and polygon
    var popup = L.popup({
      maxWidth: 220,
      minWidth: 220,
      maxHeight: alertOptions.popUpMaxHeight,
      autoPan: true,
      autoPanPadding: [2,2]
    });

    popup.setContent(content)
    marker.bindPopup(popup).addTo(map)
    areapolygon.bindPopup(popup).addTo(map)

    markers.push(marker)
  } // for loop

  showMarkers(selectedDAY)
  showPolygons(selectedDAY)
  debug(events)
};

// http://www.mathopenref.com/coordpolygonarea2.html
function polygonArea (path) {
  var numPoints = path.length
  var X = []
  var Y = []

  for (var i = 0; i < numPoints; i++) {
    X.push(path[i].lat)
    Y.push(path[i].lng)
  }
  var area = 0 // Accumulates area in the loop
  var j = numPoints - 1 // The last vertex is the 'previous' one to the first
  for (var i = 0; i < numPoints; i++) {
    area = area + (X[j] + X[i]) * (Y[j] - Y[i])
    j = i // j is previous vertex to i
  }
  return Math.abs(area / 2)
}

function coordinatesExist (array, value) {
  var k = 0
  for (var i = 0; i < array.length; i++) {
    if (array[i] === value) {
      k = k + 1
    }
  }
  return k
}

function isMarkerInsidePolygon(point, poly) {
  var polyPoints = poly.getLatLngs();
  var x = point.x, y = point.y;

  var inside = false;
  for (var i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
      var xi = polyPoints[i].lat, yi = polyPoints[i].lng;
      var xj = polyPoints[j].lat, yj = polyPoints[j].lng;

      var intersect = ((yi > y) != (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
  }
  return inside;
};

// centroid of a non-self-intersecting closed polygon
// https://en.wikipedia.org/wiki/Centroid#Centroid_of_polygon
// https://stackoverflow.com/questions/22796520/finding-the-center-of-leaflet-polygon
function getCentroid2 (arr) {

  arr = arr[0]

  var twoTimesSignedArea = 0;
  var cxTimes6SignedArea = 0;
  var cyTimes6SignedArea = 0;

  var length = arr.length

  // var x = function (i) { return arr[i % length][0] };
  // var y = function (i) { return arr[i % length][1] };

  var x = function (i) { return arr[i % length].lat };
  var y = function (i) { return arr[i % length].lng };

  for ( var i = 0; i < arr.length; i++) {
      var twoSA = x(i)*y(i+1) - x(i+1)*y(i);
      twoTimesSignedArea += twoSA;
      cxTimes6SignedArea += (x(i) + x(i+1)) * twoSA;
      cyTimes6SignedArea += (y(i) + y(i+1)) * twoSA;
  }
  var sixSignedArea = 3 * twoTimesSignedArea;
  return [ cxTimes6SignedArea / sixSignedArea, cyTimes6SignedArea / sixSignedArea];
}
