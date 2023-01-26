/**
 * Generate a random hexadecimal string for use as a unique identifier.
 * @param {int} size The length of the generated string.
 * @returns string
 * @source https://stackoverflow.com/questions/58325771/how-to-generate-random-hex-string-in-javascript
 */

const generateHexID = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

module.exports = generateHexID;
