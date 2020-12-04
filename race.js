const { Pool } = require('pg')
const dotenv = require('dotenv');

dotenv.config({ path: 'database.env' });

const {
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_DB,
    MODE
} = process.env;

const createInitialTable = async (client) => {
    console.info("Creating initial table.")
    await client.query('CREATE TABLE IF NOT EXISTS race_condition (row_id serial PRIMARY KEY, the_number INT NOT NULL);');
}

const createRow = async (client) => {
    console.info("Creating row.")
    const res = await client.query('INSERT INTO race_condition(the_number) VALUES (0) RETURNING row_id;');
    const { row_id } = res.rows[0];
    return row_id;
}

const fetchNumber = async (client, row_id) => {
    console.info("Fetching: row#", row_id)
    const res = await client.query(`SELECT * FROM race_condition WHERE row_id=${row_id};`)
    const the_number = parseInt(res.rows[0].the_number);
    return the_number;
}

const incrementNumber = async (client, row_id) => {
    const res = await client.query(`SELECT * FROM race_condition WHERE row_id=${row_id};`)
    const the_number = parseInt(res.rows[0].the_number);
    await client.query(`UPDATE race_condition SET the_number=${the_number + 1} WHERE row_id=${row_id};`)
}

const decrementNumber = async (client, row_id) => {
    const res = await client.query(`SELECT * FROM race_condition WHERE row_id=${row_id};`)
    const the_number = parseInt(res.rows[0].the_number);
    await client.query(`UPDATE race_condition SET the_number=${the_number - 1} WHERE row_id=${row_id};`)
}

const runTest = async () => {

    const pool = new Pool({
        user: POSTGRES_USER,
        host: '0.0.0.0',
        database: POSTGRES_DB,
        password: POSTGRES_PASSWORD,
        port: 5432,
    })

    const client = await pool.connect()
    console.info("Connected to postgresql.")

    await createInitialTable(client);
    const row_id = await createRow(client);

    await fetchNumber(client, row_id);

    const toggler = () => new Promise(async (ok, r) => {
        const loc_c = await pool.connect()
        await incrementNumber(loc_c, row_id);
        await decrementNumber(loc_c, row_id);
        loc_c.release();
        ok();
    });

    const len = 500;
    const functions = new Array(len).fill(toggler);
    console.info(`Running ${len} concurrent toggles on db.`)
    
    await Promise.all(functions.map(async (fn) => {
        return await fn();
    }));

    console.info("Processing done.")

    const the_number = await fetchNumber(client, row_id);
    console.info("The number (should be 0): ", the_number)

    console.info("Finished, disconnecting.")
    await client.release();
    await pool.end()
    console.info("Done.")
}

runTest();
