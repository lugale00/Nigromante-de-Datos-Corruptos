
const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;


// Middleware
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.use(cors());

app.use(express.static(path.join(__dirname, 'public'))); 


const game = require('./routes/game');
const gameService = require('./routes/game-service');
app.use('/game', game);

// Conexión a PostgreSQL
const pool = require('./routes/db');

// Rutas
app.listen(port, async () => {
    try {
        pool.connect();
        console.log('Conectado a PostgreSQL');
    } catch (err) {
        console.error('Error al conectar a PostgreSQL:', err);
    }

    console.log(`Servidor corriendo en http://localhost:${port}`);
});