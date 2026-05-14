require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

pool.query('UPDATE "User" SET role = $1 WHERE username = $2 RETURNING *', ['admin', 'yaolongfei'])
  .then(r => {
    console.log('Updated:', r.rowCount, 'rows');
    console.log(r.rows[0]);
    pool.end();
  })
  .catch(e => {
    console.log('Error:', e.message);
    pool.end();
  });
