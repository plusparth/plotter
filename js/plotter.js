const $ = require('jquery')
const RangeSliderChart = require('chart.js-rangeslider/dist/RangeSlider-solo.min.js')
const parse = require('csv-parse')
const fs = require('fs')
const {dialog} = require('electron').remote
const moment = require('moment')
const randomcolor = require('randomcolor')
var Chart = require('chart.js');

var results = {}

var config = {
    tabs: [
        {
            name: "potatoExample",
            series: [
                {
                    name: "EXAMPLE_1",
                    minY: 0,
                    maxY: 1,
                    position: 'left'
                },
                {
                    name: "EXAMPLE_2",
                    minY: 10,
                    maxY: 1000,
                    position: 'right'
                }
            ]
        }
    ]
}

const parser = parse({
    delimiter: ",",
    columns: true
})

$("#file-picker").click(function() {
    console.log("Seeing file")
    dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'CSVs', extensions: ['csv', 'tsv', 'gif'] },
            { name: 'All Files', extensions: ['*'] }
          ]
    }, function (files) {
        if (files !== undefined) {
            // handle files
            fs.createReadStream(files[0])
                .pipe(parser)
                .on('readable', function() {
                    let data
                    while (data = parser.read()) {
                        // TODO: fix this thing to actually use the correct key
                        var tsKey = Object.keys(data)[0]
                        console.log(moment(data[tsKey]))
                        console.log(tsKey)
                        Object.keys(data).forEach(key => {
                            if (key == tsKey) {
                                // console.log("On timestamp!")
                            } else {
                                if (!(key in results)) {
                                    results[key] = []
                                }
                                results[key].push(
                                    {
                                        x: moment(data[tsKey]).toDate(),
                                        y: data[key]
                                    }
                                )
                            }
                        });
                    }
                })
                .on('end', renderGraphs);
        }
    });
})

function renderGraphs() {
    var ctx = $("#chart")
    var datasets = []
    var yAxes = []

    config.tabs[0].series.forEach(series => {
        var color = randomcolor()
        console.log(series)
        datasets.push({
            label: series.name,
            backgroundColor: color,
            borderColor: color,
            fill: false,
            data: results[series.name],
            yAxisID: series.name
        })
        yAxes.push({
            type: 'linear',
            display: true,
            position: series.position,
            id: series.name,
            ticks: {
                min: series.minY,
                max: series.maxY
            },
            scaleLabel: {
                display: true,
                labelString: series.name
            }
        })
    })

    console.log(datasets)
    console.log(results)

    var myChart = Chart.Line(ctx, {
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            hoverMode: 'index',
            stacked: false,
            title: {
                display: false,
                // text: 'Chart.js Line Chart - Multi Axis'
            },
            scales: {
                xAxes: [{
                    type: 'time',
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'Timestamp'
                    },
                    ticks: {
                        major: {
                            fontStyle: 'bold',
                            fontColor: '#FF0000'
                        }
                    }
                }],
                yAxes: yAxes
            }
        }
    })
}