const knex = require('knex')({
    client: 'mysql',
    connection: process.env.DATABASE_URL,
    asyncStackTraces: false,
    debug: false,
    pool: { min: 2, max: 9 }
});

module.exports = knex;