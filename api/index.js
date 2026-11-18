// Vercel's Node.js function entry point for the Express API.
const { default: app } = require('../server/dist/index.js');

module.exports = app;
