'use strict'
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // ✅ necesario para Supabase
});

module.exports = pool;