const mongoose = require('mongoose');

const isConnected = () => mongoose.connection.readyState === 1;
const mode = () => (isConnected() ? 'mongodb' : 'demo');

module.exports = { isConnected, mode };
