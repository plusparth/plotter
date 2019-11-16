const $ = require("jquery")
const parse = require("csv-parse")
const fs = require("fs")
const {dialog} = require("electron").remote
const moment = require("moment")
const randomcolor = require("randomcolor")
const Chart = require("chart.js");
const settings = require("electron-settings");

var tabHTML = `
    <div class="tab-item{{ active }}">
        <span class="icon icon-cancel icon-close-tab"></span>
        {{ title }}
    </div>
`

var results = {}

var fileLoaded = false

var activeTab = 0

var myChart = null

var config = null

const parser = parse({
    delimiter: ",",
    columns: true
})

function configLoad(files) {
    if (files !== undefined) {
        let file = files[0]
        if (fs.existsSync(file)) {
            config = JSON.parse(fs.readFileSync(file))
            settings.set("config", file)
            for (var i = 0; i < config.tabs.length; i++) {
                createTab(config.tabs[i].name, i === 0)
            }
            if (fileLoaded) {
                renderGraphs(activeTab)
            }
        }
    }
}

$("#tabs").on("click", ".tab-item", function() {
    let $tab = $(this).closest("div")
    console.log("New tab clicked")
    console.log($(this))
    if ($tab.attr("id") === "newTab") {
        return
    }
    if (!$tab.hasClass("active")) {
        for (let i = 0; i < config.tabs.length; i++) {
            console.log(config.tabs[i].name)
            console.log($tab.text().trim())
            if ($tab.text().trim() == config.tabs[i].name) {
                activeTab = i
                if (fileLoaded) {
                    renderGraphs(i)
                }
                break
            }
        }
        $("#tabs").children().removeClass("active")
        $tab.addClass("active")
    }
})

$("#file-picker").click(function() {
    console.log("Seeing file")
    dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
            { name: "CSVs", extensions: ["csv", "tsv", "gif"] },
            { name: "All Files", extensions: ["*"] }
          ]
    }, fileLoad);
})

$("#config-picker").click(function() {
    dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
            { name: "JSONs", extensions: ["json"] },
            { name: "All Files", extensions: ["*"] }
        ]
    }, configLoad)
})

function fileLoad(files) {
    if (files !== undefined) {
        settings.set("csv", files[0])
        // handle files
        fs.createReadStream(files[0])
            .pipe(parser)
            .on("readable", function() {
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
            .on("end", finishFileLoad);
    }
}

function finishFileLoad() {
    fileLoaded = true
    renderGraphs(activeTab)
}

function renderGraphs(tabId) {
    if (config == null) 
        return
    let ctx = $("#chart")
    let datasets = []
    let yAxes = []

    config.tabs[tabId].series.forEach(series => {
        let color = randomcolor()
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
            type: "linear",
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

    if (myChart == null) {
        myChart = Chart.Line(ctx, {
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                hoverMode: "index",
                stacked: false,
                title: {
                    display: false,
                    // text: "Chart.js Line Chart - Multi Axis"
                },
                scales: {
                    xAxes: [{
                        type: "time",
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: "Timestamp"
                        },
                        ticks: {
                            major: {
                                fontStyle: "bold",
                                fontColor: "#FF0000"
                            }
                        }
                    }],
                    yAxes: yAxes
                }
            }
        })
    } else {
        myChart.data = { datasets: datasets }
        myChart.options = {
            responsive: true,
            hoverMode: "index",
            stacked: false,
            title: {
                display: false,
                // text: "Chart.js Line Chart - Multi Axis"
            },
            scales: {
                xAxes: [{
                    type: "time",
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: "Timestamp"
                    },
                    ticks: {
                        major: {
                            fontStyle: "bold",
                            fontColor: "#FF0000"
                        }
                    }
                }],
                yAxes: yAxes
            }
        }
        myChart.update()
    }
}

function createTab(title, setActive) {
    let currentTabText = tabHTML.replace("{{ title }}", title)
    if (setActive) {
        currentTabText = currentTabText.replace("{{ active }}", " active")
    } else {
        currentTabText = currentTabText.replace("{{ active }}", "") 
    }
    $(currentTabText).insertBefore("#newTab")
}

$(document).ready(function() {
    if (settings.has("config")) {
        configLoad([settings.get("config")])
    }
    
    if (settings.has("csv")) {
        fileLoad([settings.get("csv")])
    }
})