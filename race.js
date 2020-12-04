const { Client } = require('pg')
const dotenv = require('dotenv');

dotenv.config({path: 'database.env'});

const {
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_DB,
} = process.env;

const initialSetup = async () => {

    const client = new Client({
        user: POSTGRES_USER,
        host: '0.0.0.0',
        database: POSTGRES_DB,
        password: POSTGRES_PASSWORD,
        port: 5432,
      })
    
    await client.connect()
    
    const res = await client.query('SELECT $1::text as message', ['Hello world!'])
    console.log(res.rows[0].message) // Hello world!
    
    await client.end()
}

initialSetup();