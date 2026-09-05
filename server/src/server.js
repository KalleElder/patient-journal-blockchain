const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET måste anges i projektets .env eller miljön.');
  process.exit(1);
}

const app = require('./app');
const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Backend lyssnar på port ${port}`);
});
