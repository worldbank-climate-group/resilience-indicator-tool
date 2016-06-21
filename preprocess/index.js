#!/usr/bin/env node

var topojson = require('./topojson'),
    svg = require('./svg'),
    png = require('./png'),
    fs = require('fs-extra'),
    path = require('path'),
    Q = require('q'),
    glob = require('glob'),
    child_process = require('child_process');

var argv = require('yargs')
    .usage('Usage: $0 [--config config.js, --clean, --svg, --web, --topojson]')
    .option('config', {
        alias: 'c',
        describe: 'The preprocess configuration file',
        type: 'string'
    })
    .option('svg', {
        alias: 's',
        describe: 'Generate standalone svg file',
        type: 'boolean'
    })
    .option('clean', {
        describe: 'Remove all generated files from the current directory',
        type: 'boolean'
    })
    .option('web', {
        describe: 'Generate files required for web visualization',
        type: 'boolean'
    })
    .option('topojson', {
        describe: 'Generate a topojson file',
        type: 'boolean'
    })
    .option('merge-model', {
        alias: 'm',
        describe: 'Merge map and model data into single topojson file',
        type: 'boolean'
    })
    .help('help')
    .argv;

var config,
    topojson_out;

// remove all generated artifacts
function _clean() {
    var d = Q.defer();
    glob('*(*.topojson|*.svg|*.png)', function(err, files) {
        if (err) return console.log(err);
        for (var i in files) {
            var file = path.resolve(__dirname, './', files[i]);
            fs.removeSync(file, function(err) {
                if (err) return console.log(err);
            });
        }
        d.resolve();
    });
    return d.promise;
}

// generate svg's only
function _generateSvg(config) {
    _generateTopojson(config)
        .then(function(files) {
            svg.svg(files.map_data, config)
                .then(function(svgs) {
                    // generating svg so delete intermediate topojson artifact
                    fs.removeSync(config.topojson_out, function(err) {
                        if (err) return console.log(err);
                    });
                });
        });
}

/*
 * Generate topojson.
 * Checks if model data should be merged
 */
function _generateTopojson(config) {
    var d = Q.defer();
    // check for merge-model
    if (argv.m) {
        topojson.all(config, merge_model=true)
            .then(function(files) {
                d.resolve(files);
            })
    } else {
        topojson.all(config, merge_model=false)
            .then(function(files) {
                d.resolve(files);
            });
    }
    return d.promise;
}

/*
 * Generate visualization artefacts
 * and copy to viz folders:
 * map_data.topojson goes to ../maps for the /features.json api.
 * *_thubm.png goes to ../public/images/ for map switcher.
 */
function _generateWeb(config) {
    _generateTopojson(config)
        .then(function(files) {
            // not generating svg so copy output to maps folder
            var df = config.inputs.data.split('/')[1];
            fs.copySync(
                files.model_features, '../maps/' + files.model_features);
            fs.copySync(
                config.inputs.data, '../model/' + df);
            svg.svg(files.model_features, config)
                .then(function(svgs) {
                    // generate pngs
                    var pngs = png.convert(config, svgs);
                    for (var f in pngs) {
                        var img = pngs[f];
                        fs.copySync(img, '../public/images/' + img);
                        console.log("Copied " + img + " to '../public/images/" + img + "'");
                    }
                });
        });
}

// pick up the configuration
if (argv.config) {
    var conf = argv.c.split('.')[0]
    config = require('./' + conf);
    if (argv.topojson) {
        _generateTopojson(config);
    }
    if (argv.svg) {
        _generateSvg(config);
    }
    if (argv.web) {
        _generateWeb(config);
    }
}

// remove artifacts
if (argv.clean) {
    _clean();
}
