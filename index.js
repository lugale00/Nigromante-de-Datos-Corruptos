
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

const pool = require('./routes/db'); // ✅ movido arriba antes de usarlo

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'clave_secreta',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24
    }
}));

const game = require('./routes/game');
app.use('/game', game);

app.listen(port, async () => {
    try {
        await pool.connect();
        console.log('Conectado a PostgreSQL');
    } catch (err) {
        console.error('Error al conectar a PostgreSQL:', err);
    }
    console.log(`Servidor corriendo en http://localhost:${port}`);
});  