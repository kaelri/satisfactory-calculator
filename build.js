const fs            = require('fs');
const YAML          = require('yaml');
const argv          = require('yargs/yargs')(process.argv.slice(2)).argv;
const util          = require('util')
const generateHexID = require('./modules/generate-hex-id');

function main() {

	const data    = getData();
	const factory = getFactory();

	const requirements = {
		buildings: [],
		power:     0,
		ore:       {},
	}

	const queue = structuredClone(factory);

	while ( queue.length ) {

		const request = queue[0];
		const item    = data.map.get( request.item );

		// Ignore raw materials & power for now.
		if ( item.type !== 'part' ) {
			queue.shift();
			break;
		}

		// TODO: figure out how to choose the best formula for items that can be made multiple ways.
		const formula = item.formulas[0];
		const output  = formula.output[0];

		let scale = Math.ceil( request.num / output.num );

		// Add the building required for this formula and record the total output needed.
		let building = data.map.get( formula.building );

		buildingInstance = {
			id: building.name + '-' + generateHexID(6),
			name: building.name,
			product: item.name,
			formula: formula,
			destinations: [
				{
					id: request.destination,
					outputRequested: request.num,
				}
			],
			totalRequested: request.num,
			scale: scale,
			outputPerInstance: output.num,
			outputTotal: output.num * scale,
			surplus: Math.max( 0, ( output.num * scale ) - request.num ),
			powerPerInstance: building.power,
			powerTotal: building.power * scale,
		}

		requirements.buildings.push( buildingInstance );

		// Add required components to the queue, where they will be processed recursively.
		formula.input.forEach( input => queue.push({
			item: input.item,
			num: input.num * scale,
			destination: buildingInstance.id,
		}));

		queue.shift();

	}

	// TODO: optimize buildings. If the same combination of building + product has been requested for multiple jobs, and their collective surplus is greater than the output of one instance of their formula, then we can reduce the number of instances until the surplus drops below that threshold. This can cascade down the supply chain, too, so I need to think about how to traverse the list, merge like buildings and reduce their output.

	// Get raw materials & power requirements from generated list of required buildings.
	requirements.buildings.forEach( buildingInstance => {

		requirements.power += buildingInstance.powerTotal;

		buildingInstance.formula.input.forEach( input => {

			const item = data.map.get( input.item );
			if ( item.type !== 'ore' ) return;

			if ( !requirements.ore[ item.name ] ) {
				requirements.ore[ item.name ] = 0;
			}

			requirements.ore[ item.name ] += input.num * buildingInstance.scale;

		});

	});

	// TODO: Pretty up the display.
	logAll( requirements );

}

function getData() {

	const data = YAML.parse( fs.readFileSync( './data.yml', 'utf8' ) );

	data.map = new Map( data.entities.map( entity => [ entity.name, entity ] ) );

	// Derive additional item info based on building info.
	// TODO: handle components with multiple formulas. For now, we assume each item has one and only one production method.
	data.entities.filter( entity => ( entity.type === 'building' ) ).forEach( building => {

		building.formulas.forEach( buildingFormula => {

			if ( !buildingFormula.output.length ) return;

			// TODO: handle case where a formula outputs multiple items. That would be unfathomably annoying.
			const output   = buildingFormula.output[0];
			const itemName = output.item;
			const item     = data.map.get( itemName );

			const itemFormula = structuredClone( buildingFormula );

			itemFormula.building = building.name;

			if ( !item.formulas ) item.formulas = [];
			item.formulas.push( itemFormula );

		});

	});

	return data;

}

function getFactory() {

	if ( !argv._.length ) throw Error('no-factory');

	const factory = [];

	const [ factoryID ] = argv._;

	const factoryData = YAML.parse( fs.readFileSync( `./factories/${factoryID}.yml`, 'utf8' ) );

	Object.keys( factoryData ).forEach( itemName => factory.push({
		item: itemName,
		num: factoryData[itemName],
		destination: 'final',
	}));

	return factory;

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

function logAll( target ) {
	console.log(util.inspect(target, {showHidden: false, depth: null, colors: true}))
}
