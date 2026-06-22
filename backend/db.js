// This file connects our Node.js server to PostgreSQL database
const { Pool } = require('pg');
require('dotenv').config();

// Pool is like a manager that handles database connections
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Test the connection
pool.connect((err) => {
  if (err) {
    console.log('Database connection failed:', err.message);
  } else {
    console.log('Connected to PostgreSQL database!');
  }
});

module.exports = pool;
