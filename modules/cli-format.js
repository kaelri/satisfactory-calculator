const formats = {
	normal:     "\u001b[0m",
	bold:       "\u001b[1m",
	dim:        "\u001b[2m",
	italic:     "\u001b[3m",
	underlined: "\u001b[4m",
	blinking:   "\u001b[5m",
	reverse:    "\u001b[7m",
	invisible:  "\u001b[8m",
	black:      "\u001b[30m",
	red:        "\u001b[31m",
	green:      "\u001b[32m",
	yellow:     "\u001b[33m",
	blue:       "\u001b[34m",
	magenta:    "\u001b[35m",
	cyan:       "\u001b[36m",
	white:      "\u001b[37m",
}


const reset = "\u001b[0m"

/**
 * Colorize a string for CLI standard output.
 * @param {string} content - The content to be formatted.
 * @param {string|array} style  - The color or style code(s).
 * @returns {string} The formatted content.
 */
function formatCLI( content, style ) {

	content = String( content )

	if ( typeof(style) === 'string' ) {
		style = style.split(',')
	} else if ( Array.isArray(style) ) {
		// …
	} else {
		style = []
	}

	let header = style.map( code => formats[code] ).join('')
	return header + String(content) + reset;
}

module.exports = {
	formatCLI: formatCLI
}
