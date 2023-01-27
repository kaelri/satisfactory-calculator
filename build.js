const fs       = require('fs');
const YAML     = require('yaml');
const argv     = require('yargs/yargs')(process.argv.slice(2)).argv;
const util     = require('util')
const createID = require('./modules/generate-hex-id');

function main() {

	const data = getData();
	const jobs = getJobs();

	const results = {
		buildings: [],
		resources: {},
	}

	while ( jobs.length ) {

		const job  = jobs[0];
		const item = data.map.get( job.item );

		// Ignore raw materials (ore & power) for this step.
		if ( item.type !== 'part' ) {
			jobs.shift();
			continue;
		}
		
		// Add the building required for this formula and record the total output needed.
		const building = data.map.get( item.formula.building );

		buildingConfig = {
			jobIDs: [ job.jobID ],
			building: building.name,
			formula: item.formula,
			destinations: [
				{
					jobID: job.parentID,
					num:   job.num,
				}
			]
		}

		results.buildings.push( buildingConfig );

		// Add required components to the jobs queue, where they will be processed recursively.
		buildingConfig.formula.inputs.forEach( input => jobs.push({
			jobID: createID(6),
			parentID: job.jobID,
			item: input.item,
			num: 0, // default; will be updated in the next loop when real production values are calculated.
		}));

		jobs.shift();
		
	}

	results.buildings = mergeBuildingConfigs( results.buildings );
	results.buildings = populateBuildingConfigs( results.buildings );

	// Get raw materials & power requirements from generated list of required buildings.
	results.buildings.forEach( buildingConfig => {

		const building = data.map.get( buildingConfig.building );

		buildingConfig.formula.inputs.forEach( input => {

			const item = data.map.get( input.item );
			if ( item.type === 'part' ) return;

			if ( !results.resources[ item.name ] ) {
				results.resources[ item.name ] = 0;
			}

			results.resources[ item.name ] += input.num * buildingConfig.scale;

		});

	});

	// TODO: Pretty up the display.
	logAll( results );

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
					item: itemName,
					num: input[ itemName ],
				}
			});

			formula.inputs.push({
				item: 'power',
				num: building.power
			});
	
			// TODO: handle case where one formula outputs multiple items. This will be unfathomably annoying.
			formula.outputs = formula.outputs.reduce( (_, output) => {
				const itemName = Object.keys(output)[0];
				return {
					item: itemName,
					num: output[ itemName ],
				}
			}, null );

			return formula;
	
		});

		building.formulas.forEach( buildingFormula => {

			if ( !buildingFormula.outputs.item ) return;
			
			const itemName = buildingFormula.outputs.item;
			const item     = data.map.get( itemName );

			// TODO: conversely, figure out how to choose the best formula for items that can be made multiple ways. For now, we assume each item has one and only one production method.
			item.formula          = structuredClone( buildingFormula );
			item.formula.building = building.name;

		});

	});

	return data;

}

function getJobs() {

	if ( !argv._.length ) throw Error('no-factory');

	const jobs = [];

	const [ factoryID ] = argv._;

	const factoryData = YAML.parse( fs.readFileSync( `./factories/${factoryID}.yml`, 'utf8' ) );

	Object.keys( factoryData ).forEach( itemName => jobs.push({
		jobID:    createID(6),
		parentID: null,
		item:     itemName,
		num:      factoryData[ itemName ],
	}));

	return jobs;

}

function mergeBuildingConfigs( buildingConfigs ) {

	const buildingConfigsMerged = [];

	buildingConfigs.forEach( buildingConfig => {

		const existingConfig = buildingConfigsMerged.find( maybeConfig => ( buildingConfig.building === maybeConfig.building && buildingConfig.formula.outputs.item === maybeConfig.formula.outputs.item ) );

		if ( existingConfig ) {

			existingConfig.jobIDs       = existingConfig.jobIDs.concat( buildingConfig.jobIDs );
			existingConfig.destinations = existingConfig.destinations.concat( buildingConfig.destinations );

		} else {

			buildingConfigsMerged.push( buildingConfig );

		}

	});

	return buildingConfigsMerged;

}

function populateBuildingConfigs( buildingConfigs ) {

	buildingConfigs.forEach( buildingConfig => {

		buildingConfig.destinations.forEach( destination => {

			if ( !destination.jobID ) return;

			destination.num = 0;

			const parentConfigs = buildingConfigs.filter( parent => parent.jobIDs.indexOf( destination.jobID ) !== -1 );
			parentConfigs.forEach( parentConfig => {
				const parentInput  = parentConfig.formula.inputs.find( input => input.item === buildingConfig.formula.outputs.item );
				destination.num += parentConfig.scale * parentInput.num;
			})

		});

		buildingConfig.outputMinimum = buildingConfig.destinations.reduce( (outputTotal, destination) => outputTotal + destination.num, 0 );
		buildingConfig.scale         = Math.ceil( buildingConfig.outputMinimum / buildingConfig.formula.outputs.num );
		buildingConfig.outputTotal   = buildingConfig.scale * buildingConfig.formula.outputs.num;
		buildingConfig.surplus       = Math.max( 0, buildingConfig.outputTotal - buildingConfig.outputMinimum );

	});

	return buildingConfigs;

}

function logAll( target ) {
	console.log(util.inspect(target, {showHidden: false, depth: null, colors: true}))
}

try {
	main();
} catch (e) {
	switch(e.message) {
		case 'no-factory':
			console.error('No factory provided. Please include a factory name, e.g.: `npm run build example`');
		default:
			throw e;
	}
}
