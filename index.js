'use strict';

/*global require*/
var version = require('./version');

var terriaOptions = {
    baseUrl: 'build/TerriaJS',
    appName: 'Terria Map',
    supportEmail: 'terrarium@lists.nicta.com.au'
};
var configuration = {
    bingMapsKey: undefined // use Cesium key
};

require('./nationalmap.scss');

// Check browser compatibility early on.
// A very old browser (e.g. Internet Explorer 8) will fail on requiring-in many of the modules below.
// 'ui' is the name of the DOM element that should contain the error popup if the browser is not compatible
//var checkBrowserCompatibility = require('terriajs/lib/ViewModels/checkBrowserCompatibility');

// checkBrowserCompatibility('ui');

var GoogleAnalytics = require('terriajs/lib/Core/GoogleAnalytics');
var GoogleUrlShortener = require('terriajs/lib/Models/GoogleUrlShortener');
var isCommonMobilePlatform = require('terriajs/lib/Core/isCommonMobilePlatform');
var OgrCatalogItem = require('terriajs/lib/Models/OgrCatalogItem');
var raiseErrorToUser = require('terriajs/lib/Models/raiseErrorToUser');
var React = require('react');
var ReactDOM = require('react-dom');
var registerAnalytics = require('terriajs/lib/Models/registerAnalytics');
var registerCatalogMembers = require('terriajs/lib/Models/registerCatalogMembers');
var registerCustomComponentTypes = require('terriajs/lib/Models/registerCustomComponentTypes');
var registerKnockoutBindings = require('terriajs/lib/Core/registerKnockoutBindings');
var Terria = require('terriajs/lib/Models/Terria');
var updateApplicationOnHashChange = require('terriajs/lib/ViewModels/updateApplicationOnHashChange');
var updateApplicationOnMessageFromParentWindow = require('terriajs/lib/ViewModels/updateApplicationOnMessageFromParentWindow');
var ViewState = require('terriajs/lib/ReactViewModels/ViewState').default;

// Not used until custom Terria Map maps are below
//var BaseMapViewModel = require('terriajs/lib/ViewModels/BaseMapViewModel');
var BingMapsSearchProviderViewModel = require('terriajs/lib/ViewModels/BingMapsSearchProviderViewModel.js');
var GazetteerSearchProviderViewModel = require('terriajs/lib/ViewModels/GazetteerSearchProviderViewModel.js');

// Tell the OGR catalog item where to find its conversion service.  If you're not using OgrCatalogItem you can remove this.
OgrCatalogItem.conversionServiceBaseUrl = configuration.conversionServiceBaseUrl;

// Register custom Knockout.js bindings.  If you're not using the TerriaJS user interface, you can remove this.
registerKnockoutBindings();


// Register all types of catalog members in the core TerriaJS.  If you only want to register a subset of them
// (i.e. to reduce the size of your application if you don't actually use them all), feel free to copy a subset of
// the code in the registerCatalogMembers function here instead.
registerCatalogMembers();
registerAnalytics();

terriaOptions.analytics = new GoogleAnalytics();

// Construct the TerriaJS application, arrange to show errors to the user, and start it up.
var terria = new Terria(terriaOptions);

// Register custom components in the core TerriaJS.  If you only want to register a subset of them, or to add your own,
// insert your custom version of the code in the registerCustomComponentTypes function here instead.
registerCustomComponentTypes(terria);

terria.welcome = '<h3>Terria<sup>TM</sup> is a spatial data platform that provides spatial predictive analytics</h3><div class="body-copy"><p>This interactive map uses TerriaJS<sup>TM</sup>, an open source software library developed by Data61 for building rich, web-based geospatial data explorers.  It uses Cesium<sup>TM</sup> open source 3D globe viewing software.  TerriaJS<sup>TM</sup> is used for the official Australian Government NationalMap and many other sites rich in the use of spatial data.</p><p>This map also uses Terria<sup>TM</sup> Inference Engine, a cloud-based platform for making probabilistic predictions using data in a web-based mapping environment. Terria<sup>TM</sup> Inference Engine uses state of the art machine learning algorithms developed by Data61 and designed specifically for large-scale spatial inference.</p></div>';

// If we're running in dev mode, disable the built style sheet as we'll be using the webpack style loader.
// Note that if the first stylesheet stops being nationalmap.css then this will have to change.
if (process.env.NODE_ENV !== "production" && module.hot) {
    document.styleSheets[0].disabled = true;
}

terria.start({
    // If you don't want the user to be able to control catalog loading via the URL, remove the applicationUrl property below
    // as well as the call to "updateApplicationOnHashChange" further down.
    applicationUrl: window.location,
    configUrl: 'config.json',
    defaultTo2D: isCommonMobilePlatform(),
    urlShortener: new GoogleUrlShortener({
        terria: terria
    })
}).otherwise(function(e) {
    raiseErrorToUser(terria, e);
}).always(function() {
    try {
        configuration.bingMapsKey = terria.configParameters.bingMapsKey ? terria.configParameters.bingMapsKey : configuration.bingMapsKey;

        const viewState = new ViewState({
            terria: terria,
            locationSearchProviders: [
                new BingMapsSearchProviderViewModel({
                    terria: terria,
                    key: configuration.bingMapsKey
                }),
                new GazetteerSearchProviderViewModel({terria})
            ]
        });

        // Automatically update Terria (load new catalogs, etc.) when the hash part of the URL changes.
        updateApplicationOnHashChange(terria, window);
        updateApplicationOnMessageFromParentWindow(terria, window);

        //temp
        var createAustraliaBaseMapOptions = require('terriajs/lib/ViewModels/createAustraliaBaseMapOptions');
        var createGlobalBaseMapOptions = require('terriajs/lib/ViewModels/createGlobalBaseMapOptions');
        var selectBaseMap = require('terriajs/lib/ViewModels/selectBaseMap');
        // Create the various base map options.
        var australiaBaseMaps = createAustraliaBaseMapOptions(terria);
        var globalBaseMaps = createGlobalBaseMapOptions(terria, configuration.bingMapsKey);

        var allBaseMaps = australiaBaseMaps.concat(globalBaseMaps);
        selectBaseMap(terria, allBaseMaps, 'Positron (Light)', true);


        let render = () => {
            const StandardUserInterface = require('terriajs/lib/ReactViews/StandardUserInterface/StandardUserInterface.jsx');
            ReactDOM.render(<StandardUserInterface
                                terria={terria}
                                allBaseMaps={allBaseMaps}
                                viewState={viewState}
                                version={version} />, document.getElementById('ui'));
        };


        if (process.env.NODE_ENV === "development") {
            window.viewState = viewState;
        }

        if (module.hot && process.env.NODE_ENV !== "production") {
            // Support hot reloading of components
            // and display an overlay for runtime errors
            const renderApp = render;
            const renderError = (error) => {
                const RedBox = require('redbox-react');
                console.error(error);
                console.error(error.stack);
                ReactDOM.render(
                    <RedBox error={error} />,
                    document.getElementById('ui')
                );
            };
            render = () => {
                try {
                    renderApp();
                } catch (error) {
                    renderError(error);
                }
            };
            module.hot.accept('terriajs/lib/ReactViews/StandardUserInterface/StandardUserInterface.jsx', () => {
                setTimeout(render);
            });
        }

        render();
    } catch (e) {
        console.error(e);
        console.error(e.stack);
    }
});
