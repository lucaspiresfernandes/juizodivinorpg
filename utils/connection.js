import k from "knex";

const knex = k({
  client: "mysql2",
  connection: process.env.DATABASE_URL,
});

export default knex;
