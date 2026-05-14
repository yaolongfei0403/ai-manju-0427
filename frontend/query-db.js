const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'DisclaimerAgreement\'')
  .then(r => console.log(JSON.stringify(r.rows, null, 2)))
  .catch(e => console.error(e.message))
  .finally(() => pool.end());