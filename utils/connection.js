const knex = require('knex')(
    {
        client: 'mysql',
        connection: process.env.DATABASE_URL,
        asyncStackTraces: true,
        debug: true
    });

module.exports = knex;