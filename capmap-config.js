var alertOptions = {
    useLocation: false,
    defaultLanguage: 'en-US',
    dateFormat: 'long', // 'vs. ISOString'
    //dateFormatString: 'MMMM Do YYYY, HH:mm:ss', // https://momentjs.com/docs/#/displaying/format/
    dateFormatString: 'DD.MM.YYYY, HH:mm:ss', // https://momentjs.com/docs/#/displaying/format/
    accesToken: 'pk.eyJ1IjoibmFra2ltIiwiYSI6ImNqNWYzNzVvaDB3YmUyeHBuOWdwZnM0bHMifQ.QZCKhwf3ET5ujEeZ6_8X_Q',
    mapTileSource: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', // https://leaflet-extras.github.io/leaflet-providers/preview/
    zoom: 7,
    center: [41,74],
    bounds: {north: 38.0, east: 67.0, south: 43.0, west: 81.0},
    attribution: 'Kyrgyzhydromet',
    polygonOptions: {
        fillOpacity: 0.2,
        strokeOpacity: 1,
        strokeWeight: 3,
	preventSymbolOverlapping: true
    },
    dayControl: true,
    day0Control: true,
    day1Control: true,
    day2Control: true,
    day3Control: true,
    day4Control: true,
    day5Control: true,
    allDayControl: true,
    popUpMaxHeight: 320, // maximum height in px
    refresh: 300, // Refresh interval seconds
    areaLimitForMarkers: 0.005,
    iconWidth: 30,
    iconHeight: 30,
    transparentIcons: true,
    eventTypes: {
        // edit: "edit capmap-config.js",
        rainfall: "Rainfall",
        snow: "Snowfall",
        thunderstorm: "Thunderstorm",
        wind: "Wind",
        heat: "Heat",
        cold: "Cold weather",
        wet: "Wet snow accumulation",
        frost: "Frost",
        sleet: "Sleet",
        fog: "Fog",
	flooding: "Flooding",
        rising: "Rising water level",
        mudflow: "Mudflow",
        ice: "Ice jamming"
    }
};

// Google Analytics
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'FILL-YOUR-ID', 'auto');
ga('send', 'pageview');
