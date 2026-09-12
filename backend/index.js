const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectDB = require('./config/db');
const app = require('./app');

async function start() {
    if (process.env.MONGO_URL) {
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET to a random value of at least 32 characters.');
        await connectDB();
    } else {
        if (process.env.NODE_ENV === 'production') throw new Error('MONGO_URL is required in production.');
        console.log('Demo mode: sample catalog and simulated checkout. Accounts and saved orders require MongoDB.');
    }
    const port = process.env.PORT || 5000;
    return app.listen(port, () => console.log(`ShopNest is ready at http://localhost:${port}`));
}

if (require.main === module) start().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { start };