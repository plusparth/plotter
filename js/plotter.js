const fs = require('fs');
const {dialog} = require('electron').remote;
const $ = require('jquery');
const parse = require('csv-parse');
const moment = require('moment');
const randomcolor = require('randomcolor');
const Chart = require('chart.js');
const settings = require('electron-settings');
const noUiSlider = require('nouislider');

const tabHTML = `
	<div class='tab-item{{ active }}'>
		<span class='icon icon-cancel icon-close-tab'></span>
		{{ title }}
	</div>
`;

const results = {};

let fileLoaded = false;

let activeTab = 0;

let myChart = null;

let config = null;

const minX = 0;
let maxX = 0;

const options = {
	responsive: true,
	hoverMode: 'index',
	stacked: false,
	title: {
		display: false
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
		yAxes: null
	},
	elements: {
		point: {
			radius: 0,
			hitRadius: 5,
			hoverRadius: 3
		},
		line: {
			borderWidth: 1.5,
			tension: 0
		}
	},
	tooltips: {
		mode: 'index',
		position: 'nearest',
		callbacks: {
			beforeTitle(tooltipItem) {
				return 'Match time remaining: ' + results.match_time[tooltipItem[0].index].y + 's';
			}
		}
	}
};

const sliderFormatter = {
	to(value) {
		return results.match_time[Math.trunc(value)].y;
	},
	from() {
		return 0;
	}
};

const parser = parse({
	delimiter: ',',
	columns: true
});

function configLoad(files) {
	if (files !== undefined) {
		const file = files[0];
		if (fs.existsSync(file)) {
			config = JSON.parse(fs.readFileSync(file));
			settings.set('config', file);
			for (let i = 0; i < config.tabs.length; i++) {
				createTab(config.tabs[i].name, i === 0);
			}

			if (fileLoaded) {
				renderGraphs(activeTab);
			}
		}
	}
}

$('#tabs').on('click', '.tab-item', function () {
	const $tab = $(this).closest('div');

	if ($tab.attr('id') === 'newTab') {
		return;
	}

	if (!$tab.hasClass('active')) {
		for (let i = 0; i < config.tabs.length; i++) {
			if ($tab.text().trim() === config.tabs[i].name) {
				activeTab = i;
				if (fileLoaded) {
					renderGraphs(i);
				}

				break;
			}
		}

		$('#tabs').children().removeClass('active');
		$tab.addClass('active');
	}
});

$('#file-picker').click(() => {
	console.log('Seeing file');
	dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [
			{name: 'CSVs', extensions: ['csv', 'tsv', 'gif']},
			{name: 'All Files', extensions: ['*']}
		]
	}, fileLoad);
});

$('#config-picker').click(() => {
	dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [
			{name: 'JSONs', extensions: ['json']},
			{name: 'All Files', extensions: ['*']}
		]
	}, configLoad);
});

function fileLoad(files) {
	if (files !== undefined) {
		settings.set('csv', files[0]);
		maxX = 0;
		// Handle files
		document.title = files[0];
		fs.createReadStream(files[0])
			.pipe(parser)
			.on('readable', () => {
				let data = parser.read();
				while (data !== null) {
					// TODO: fix this thing to actually use the correct key
					const tsKey = Object.keys(data)[0];

					Object.keys(data).forEach(key => {
						if (key !== tsKey) {
							if (!(key in results)) {
								results[key] = [];
							}

							results[key].push(
								{
									x: moment(data[tsKey]).toDate(),
									y: data[key]
								}
							);
							if (results[key].length > maxX) {
								maxX = results[key].length;
							}
						}
					});
					data = parser.read();
				}
			})
			.on('end', finishFileLoad);
	}
}

function finishFileLoad() {
	fileLoaded = true;
	renderGraphs(activeTab);
}

function renderGraphs(tabId) {
	if (config === null) {
		return;
	}

	const ctx = $('#chart');
	const datasets = [];
	const axisLabels = [];
	const yAxes = [];

	config.tabs[tabId].series.forEach(series => {
		let color = randomcolor();
		if (series.color !== 'random') {
			color = series.color;
		}

		datasets.push({
			label: series.name,
			backgroundColor: color,
			borderColor: color,
			fill: false,
			data: results[series.name],
			yAxisID: series.axisLabel
		});
		axisLabels.push(series.axisLabel);
	});

	config.axes.forEach(axis => {
		if (axisLabels.includes(axis.label)) {
			yAxes.push({
				type: 'linear',
				display: true,
				position: axis.position,
				id: axis.label,
				ticks: {
					min: axis.minY,
					max: axis.maxY
				},
				scaleLabel: {
					display: true,
					labelString: axis.label
				}
			});
		}
	});

	options.scales.yAxes = yAxes;
	if (myChart === null) {
		myChart = Chart.Line(ctx, {
			data: {
				datasets
			},
			options
		});

		noUiSlider.create($('#slider')[0], {
			start: [minX, maxX - 1],
			step: 1,
			connect: true,
			range: {
				min: minX,
				max: maxX - 1
			},
			tooltips: [sliderFormatter, sliderFormatter]
		});
		$('#slider')[0].noUiSlider.on('set', changeRange);
	} else {
		myChart.data = {datasets};
		myChart.options = options;
		myChart.update();
		$('#slider')[0].noUiSlider.updateOptions({
			range: {
				min: minX,
				max: maxX - 1
			}
		}, true);
	}
}

function changeRange() {
	const newRange = $('#slider')[0].noUiSlider.get();
	for (let i = 0; i < myChart.data.datasets.length; i++) {
		const name = myChart.data.datasets[i].label;
		myChart.data.datasets[i].data = results[name].slice(newRange[0], newRange[1] + 1);
	}

	myChart.update();
}

function createTab(title, setActive) {
	let currentTabText = tabHTML.replace('{{ title }}', title);
	if (setActive) {
		currentTabText = currentTabText.replace('{{ active }}', ' active');
	} else {
		currentTabText = currentTabText.replace('{{ active }}', '');
	}

	$(currentTabText).insertBefore('#newTab');
}

$(document).ready(() => {
	if (settings.has('config')) {
		configLoad([settings.get('config')]);
	}

	if (settings.has('csv')) {
		fileLoad([settings.get('csv')]);
	}
});
