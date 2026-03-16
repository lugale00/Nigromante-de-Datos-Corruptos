'use strict';

const db = require('./db');
const bcrypt = require('bcrypt'); // ✅ faltaba esta línea

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
    const nivelUsuario = req.session.nivelUsuario;

    if (!nivelUsuario) {
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    // Mapa de tabla → vista según nivel
    const vistas = {
        1: { 'datos.almas': 'datos.v_almas_n1' },
        2: { 'datos.almas': 'datos.v_almas_n2', 'datos.lugar': 'datos.v_lugar_n2' },
        3: { 'datos.almas': 'datos.v_almas_n3', 'datos.lugar': 'datos.v_lugar_n3', 'datos.armamento': 'datos.v_armamento_n3' }
    };

    const vistasNivel = vistas[nivelUsuario];
    let consulta = req.params.consulta;

    // Comprobamos que no accede a tablas de niveles superiores
    const todasLasTablas = ['datos.almas', 'datos.lugar', 'datos.armamento'];
    const consultaLower = consulta.toLowerCase();
    const accesoNoPermitido = todasLasTablas.some(tabla =>
        consultaLower.includes(tabla) && !vistasNivel[tabla]
    );

    if (accesoNoPermitido) {
        return res.status(403).json({ error: 'No tienes acceso a esas tablas aún' });
    }

    // Sustituimos las tablas por sus vistas correspondientes
    for (const [tabla, vista] of Object.entries(vistasNivel)) {
        const regex = new RegExp(tabla.replace('.', '\\.'), 'gi');
        consulta = consulta.replace(regex, vista);
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');
        const result = await client.query(consulta);
        await client.query('COMMIT');
        res.status(200).json(result.rows);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al consultar la base de datos:', error);
        res.status(500).send('Error en la consulta');

    } finally {
        client.release();
    }
};

game.prototype.login = async function (req, res) {
    const { nombre, contrasena } = req.body;

    try {
        const result = await db.query(
            'SELECT * FROM public.usuarios WHERE nombre = $1',
            [nombre]
        );

        const usuario = result.rows[0];
        if (!usuario) return res.status(401).json({ error: 'Usuario no encontrado' });

        const valida = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!valida) return res.status(401).json({ error: 'Contraseña incorrecta' });

        req.session.nivelUsuario = usuario.nivel_actual;
        req.session.nombre = usuario.nombre;

        res.status(200).json({ mensaje: 'Login correcto' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

game.prototype.registrar = async function (req, res) {
    const { nombre, contrasena } = req.body;

    try {
        const hash = await bcrypt.hash(contrasena, 10);
        await db.query(
            'INSERT INTO public.usuarios (nombre, contrasena, nivel_actual, nivel_maximo) VALUES ($1, $2, 1, 1)',
            [nombre, hash]
        );

        res.status(200).json({ mensaje: 'Registro exitoso' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'El usuario ya existe' });
    }
};

module.exports = new game();