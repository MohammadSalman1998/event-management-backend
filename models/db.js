const pool = require('../config/db.config.js');

const query = async (sql, params) => {
  const [results, ] = await pool.execute(sql, params);
  return results;
};

module.exports = {
  query
};