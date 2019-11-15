const $ = require('jquery')
const RangeSliderChart = require('chart.js-rangeslider/dist/RangeSlider-solo.min.js')
const parse = require('csv-parse')
const fs = require('fs')
const {dialog} = require('electron').remote
const moment = require('moment')

var results = {}

var config = {
    tabs: [
        {
            name: "potatoExample",
            series: [
                {
                    name: "EXAMPLE_1",
                    minY: 0,
                    maxY: 1
                },
                {
                    name: "EXAMPLE_2",
                    minY: 10,
                    maxY: 1000
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
                .on('end', () => {
                    console.log(results);
                    // [
                    //   { NAME: 'Daffy Duck', AGE: '24' },
                    //   { NAME: 'Bugs Bunny', AGE: '22' }
                    // ]

                });
        }
    });
    var ctx = $("#chart")

    var myChart = new RangeSliderChart({
        chartCTX: ctx,
        chartType: "Line",

    })
})

