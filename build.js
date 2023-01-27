const fs            = require('fs');
const YAML          = require('yaml');
const argv          = require('yargs/yargs')(process.argv.slice(2)).argv;
const util          = require('util');
const createID      = require('./modules/generate-hex-id');
const { formatCLI } = require('./modules/cli-format');

const data = getData();

function main() {
	
	const jobs = getJobs();

	const results = {
		requests:  structuredClone(jobs),
		factories: [],
		resources: {},
	}

	while ( jobs.length ) {

		const job  = jobs.shift();
		const item = data.map.get( job.itemID );

		// Ignore raw materials (ore & power) for this step.
		if ( item.type !== 'part' ) continue;

		// Add the building required for this formula and record the total output needed.
		const building = data.map.get( item.formula.buildingID );

		const jobID = createID(6);

		factory = {
			jobIDs:       [ jobID ],
			buildingID:   building.name,
			formula:      item.formula,
			destinations: [
				{
					jobID: job.parentID || null,
					num:   job.num      || 0,
				}
			]
		}

		results.factories.push( factory );

		// Add required components to the jobs queue, where they will be processed recursively.
		factory.formula.inputs.forEach( input => jobs.push({
			itemID:     input.itemID,
			parentID: jobID,
		}));

	}

	results.factories = mergeFactories( results.factories );
	results.factories = populateFactories( results.factories );

	// Get raw materials & power requirements from generated list of required buildings.
	results.factories.forEach( factory => {

		factory.formula.inputs.forEach( input => {

			const item = data.map.get( input.itemID );
			if ( item.type === 'part' ) return;

			if ( !results.resources[ item.name ] ) {
				results.resources[ item.name ] = 0;
			}

			results.resources[ item.name ] += input.num * factory.scale;

		});

	});

	displayResults( results );

}

function getData() {

	const data = YAML.parse( fs.readFileSync( './data.yml', 'utf8' ) );

	data.map = new Map( data.entities.map( entity => [ entity.name, entity ] ) );

	// Derive additional item info based on building info.
	data.entities.filter( entity => ( entity.type === 'building' ) ).forEach( building => {

		// Translate readable YAML into more formal key-value objects.
		building.formulas = building.formulas.map( formula => {

			formula.inputs = formula.inputs.map( input => {
				const itemName = Object.keys(input)[0];
				return {
					itemID: itemName,
					num: input[ itemName ],
				}
			});

			formula.inputs.push({
				itemID: 'power',
				num: building.power,
			});

			// TODO: handle case where one formula outputs multiple items. This will be unfathomably annoying.
			formula.outputs = formula.outputs.reduce( (_, output) => {
				const itemName = Object.keys(output)[0];
				return {
					itemID: itemName,
					num: output[ itemName ],
				}
			}, null );

			return formula;

		});

		building.formulas.forEach( formula => {

			if ( !formula.outputs.itemID ) return;

			const itemName = formula.outputs.itemID;
			const item     = data.map.get( itemName );

			// TODO: conversely, figure out how to choose the best formula for items that can be made multiple ways. For now, we assume each item has one and only one production method.
			item.formula          = structuredClone( formula );
			item.formula.buildingID = building.name;

		});

	});

	return data;

}

function getJobs() {

	if ( !argv._.length ) throw Error('no-build');

	const jobs = [];

	const [ buildID ] = argv._;

	const buildData = YAML.parse( fs.readFileSync( `./builds/${buildID}.yml`, 'utf8' ) );

	Object.keys( buildData ).forEach( itemName => jobs.push({
		itemID: itemName,
		num:    buildData[ itemName ],
	}));

	return jobs;

}

function mergeFactories( factories ) {

	const factoriesMerged = [];

	factories.forEach( factory => {

		const existingConfig = factoriesMerged.find( maybeConfig => ( factory.buildingID === maybeConfig.buildingID && factory.formula.outputs.itemID === maybeConfig.formula.outputs.itemID ) );

		if ( existingConfig ) {

			existingConfig.jobIDs       = existingConfig.jobIDs.concat( factory.jobIDs );
			existingConfig.destinations = existingConfig.destinations.concat( factory.destinations );

		} else {

			factoriesMerged.push( factory );

		}

	});

	return factoriesMerged;

}

function populateFactories( factories ) {

	factories.forEach( factory => {

		factory.destinations.forEach( destination => {

			if ( !destination.jobID ) return;

			destination.num = 0;

			const parentConfigs = factories.filter( parent => parent.jobIDs.indexOf( destination.jobID ) !== -1 );
			parentConfigs.forEach( parentConfig => {
				const parentInput  = parentConfig.formula.inputs.find( input => input.itemID === factory.formula.outputs.itemID );
				destination.num += parentConfig.scale * parentInput.num;
			});

		});

		factory.outputMinimum = factory.destinations.reduce( (outputTotal, destination) => outputTotal + destination.num, 0 );
		factory.scale         = Math.ceil( factory.outputMinimum / factory.formula.outputs.num );
		factory.outputTotal   = factory.scale * factory.formula.outputs.num;
		factory.surplus       = Math.max( 0, factory.outputTotal - factory.outputMinimum );

	});

	return factories;

}

function displayResults( results ) {

	if ( argv._.length >= 2 && argv._[1] === 'all' ) {
		logAll( results );
		return;
	}

	const lines = [];

	lines.push( formatCLI('YOU WANT:', 'bold,white') );

	// REQUESTS (“YOU WANT…’)
	let resultsTable = [];

	results.requests.forEach(request => {
		const item = data.map.get(request.itemID);
		resultsTable.push([ request.num, item.displayName ]);
	});

	resultsTable = spaceTableColumns( resultsTable, [ 'right', 'left' ] );

	resultsTable.forEach(request => {
		lines.push( formatCLI('- ', 'black') + formatCLI(request[0], 'blue') + ' ' + formatCLI(request[1], 'red' ) );
	});

	lines.push('');

	// RESOURCES (“YOU NEED…’)
	lines.push( formatCLI('YOU NEED:', 'bold,white') );

	let resourcesTable = [];

	Object.keys(results.resources).forEach( itemID => {
		const item = data.map.get(itemID);
		const resourceNum = results.resources[itemID];
		resourcesTable.push([ resourceNum, item.displayName ]);
	});

	resourcesTable = spaceTableColumns( resourcesTable, [ 'right', 'left' ] );

	resourcesTable.forEach( resource => {
		lines.push( formatCLI('- ', 'black') + formatCLI(resource[0], 'blue') + ' ' + formatCLI(resource[1], 'red' ) );
	});

	lines.push('');

	// FACTORIES (“YOU BUILD…’)
	lines.push( formatCLI('YOU BUILD:', 'bold,white') );

	let factoriesTable = [];

	results.factories.forEach(factory => {
		const item     = data.map.get(factory.formula.outputs.itemID);
		const building = data.map.get(factory.buildingID);
		factoriesTable.push([ factory.scale, building.displayName, item.displayName ]);
	});

	factoriesTable = spaceTableColumns( factoriesTable, [ 'right', 'left', 'left' ] );

	factoriesTable.forEach(factory => {
		lines.push( formatCLI('- ', 'black') + formatCLI(factory[0], 'blue') + ' ' + formatCLI(factory[1], 'green' ) + ' ' + formatCLI( '➜', 'black' ) + ' ' + formatCLI(factory[2], 'red' ) );
	});

	lines.push('');
	
	// DISPLAY
	console.info(lines.join("\n"));

}

function spaceTableColumns( table, options ) {
	
	const columnSizes = table.reduce( (columnSizes, factory) => {
		factory.forEach( (cell, c) => {
			columnSizes[c] = Math.max( columnSizes[c], String(cell).length );
		});
		return columnSizes;
	}, [ 0, 0, 0 ] );

	table = table.map( row => {

		row = row.map( (cell, c) => {

			const padSize = Math.max( 0, columnSizes[c] - String(cell).length );

			if ( padSize ) {

				let cellParts = [
					cell,
					[...Array(padSize)].map( () => ' ' ).join('')
				];

				if ( options && options[c] && options[c] === 'right' ) {
					cellParts = cellParts.reverse();
				}

				cell = cellParts.join('');

			}

			return cell;

		});

		return row;

	});

	return table;

}

function logAll( target ) {
	console.log(util.inspect(target, {showHidden: false, depth: null, colors: true}));
}

try {
	main();
} catch (e) {
	switch(e.message) {
		case 'no-build':
			console.error('No build provided. Please include a build name, e.g.: `npm run build example`');
		default:
			throw e;
	}
}
