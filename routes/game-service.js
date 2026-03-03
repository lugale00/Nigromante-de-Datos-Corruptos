'use strict';

const db = require('./db');

const game = function () {};

const nivelesPermitidos = ['nivel1', 'nivel2', 'nivel3'];

game.prototype.getAllTabla = async function (req, res) {
    const nivel = req.params.nivel;
    const tabla = req.params.tabla;

    if (!nivelesPermitidos.includes(nivel)) {
        return res.status(400).json({ error: 'Nivel no válido' });
    }

    try {
        const result = await db.query(`SELECT * FROM ${nivel}.${tabla}`);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al consultar la base de datos:', error);
        res.status(500).send('Error en la consulta');
    }
};

game.prototype.getConsulta = async function (req, res) {
    const consulta = req.params.consulta;

    try {
        const result = await db.query(consulta);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al consultar la base de datos:', error);
        res.status(500).send('Error en la consulta');
    }
};

module.exports = new game();