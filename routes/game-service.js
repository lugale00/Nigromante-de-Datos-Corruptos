'use strict';

const db = require('./db');
const bcrypt = require('bcrypt');

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
        return res.status(401).json({ error: 'No has iniciado sesión' }); // 401 Unauthorized -> no hay sesión activa
    }

    const vistas = {
        1: { 'almas': 'datos.v_almas_n1' },
        2: { 'almas': 'datos.v_almas_n2', 'lugar': 'datos.v_lugar_n2' },
        3: { 'almas': 'datos.v_almas_n3', 'lugar': 'datos.v_lugar_n3', 'armamento': 'datos.v_armamento_n3' }
    };

    const vistasNivel = vistas[nivelUsuario];
    let consulta = req.params.consulta;
    const consultaLower = consulta.toLowerCase();

    if (consultaLower.includes('public') || consultaLower.includes('datos.')) {
        return res.status(418).json({ error: 'Acceso no permitido a ese esquema' });
    }

    const todasLasTablas = ['almas', 'lugar', 'armamento'];
    const accesoNoPermitido = todasLasTablas.some(tabla =>
        consultaLower.includes(tabla) && !vistasNivel[tabla]
    );

    if (accesoNoPermitido) {
        return res.status(403).json({ error: 'No tienes acceso a esas tablas aún' });
    }

    for (const [tabla, vista] of Object.entries(vistasNivel)) {
    // Solo sustituimos cuando la tabla aparece después de FROM o JOIN
        const regex = new RegExp(`(FROM|JOIN)\\s+\\b${tabla}\\b`, 'gi');
        consulta = consulta.replace(regex, `$1 ${vista}`);
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
        if (!usuario) return res.status(401).json({ error: 'Usuario no encontrado' }); // 401 Unauthorized -> credenciales inválidas

        const valida = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!valida) return res.status(401).json({ error: 'Contraseña incorrecta' }); // 401 Unauthorized -> credenciales inválidas

        req.session.nivelUsuario = usuario.nivel_actual;
        req.session.nombre = usuario.nombre;

        res.status(200).json({ mensaje: 'Login correcto' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

game.prototype.getSesion = async function (req, res) {
    if (!req.session.nivelUsuario) {
        return res.status(401).json({ error: 'No has iniciado sesión' }); // 401 Unauthorized -> no hay sesión activa
    }
    res.status(200).json({
        nombre: req.session.nombre,
        nivel: req.session.nivelUsuario
    });
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

game.prototype.getTablas = async function (req, res) {
    const nivelUsuario = req.session.nivelUsuario;

    if (!nivelUsuario) {
        return res.status(401).json({ error: 'No has iniciado sesión' }); // 401 Unauthorized -> no hay sesión activa
    }

    try {
        const result = await db.query(
            'SELECT nombre_tabla, atributos FROM public.resumen WHERE nivel_desbloqueo <= $1 ORDER BY nivel_desbloqueo',
            [nivelUsuario]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener tablas');
    }
};

game.prototype.getMision = async function (req, res) {
    const nivelUsuario = req.session.nivelUsuario;

    if (!nivelUsuario) {
        return res.status(401).json({ error: 'No has iniciado sesión' }); // 401 Unauthorized -> no hay sesión activa
    }

    try {
        const idMisionActual = req.query.idMisionActual ? parseInt(req.query.idMisionActual) : null;

        let query, params;
        if (idMisionActual) {
            query = 'SELECT * FROM public.misiones WHERE nivel_requerido = $1 AND id > $2 ORDER BY id LIMIT 1';
            params = [nivelUsuario, idMisionActual];
        } else {
            query = 'SELECT * FROM public.misiones WHERE nivel_requerido = $1 ORDER BY id LIMIT 1';
            params = [nivelUsuario];
        }

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(200).json({ subirNivel: true });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener misión');
    }
};

game.prototype.subirNivel = async function (req, res) {
    const nivelUsuario = req.session.nivelUsuario;

    if (!nivelUsuario) {
        return res.status(401).json({ error: 'No has iniciado sesión' }); // 401 Unauthorized -> no hay sesión activa
    }

    // ✅ En lugar de bloquear, avisamos que el juego está completado
    if (nivelUsuario >= 3) {
        return res.status(200).json({ nivelMaximo: true });
    }

    try {
        const nuevoNivel = nivelUsuario + 1;

        await db.query(
            'UPDATE public.usuarios SET nivel_actual = $1, nivel_maximo = GREATEST(nivel_maximo, $1) WHERE nombre = $2',
            [nuevoNivel, req.session.nombre]
        );

        req.session.nivelUsuario = nuevoNivel;
        res.status(200).json({ nuevoNivel });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al subir de nivel' });
    }
};

game.prototype.comprobarSolucion = async function (req, res) {

    const nivelUsuario = req.session.nivelUsuario;
    if (!nivelUsuario) {
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    const { idMision, resultadoJugador } = req.body;

    try {
        const misionResult = await db.query(
            'SELECT * FROM public.misiones WHERE id = $1',
            [idMision]
        );
        const mision = misionResult.rows[0];
        if (!mision) return res.status(404).json({ error: 'Misión no encontrada' });

        const resultadoEsperado = mision.respuesta;
        const resultadoJugadorNorm = normalizarResultado(resultadoJugador);
        const resultadoEsperadoNorm = normalizarResultado(resultadoEsperado);

        const correcto = JSON.stringify(resultadoJugadorNorm) === JSON.stringify(resultadoEsperadoNorm);

        res.status(200).json({ correcto });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al comprobar solución' });
    }
};

function normalizarResultado(resultado) {
    if (!Array.isArray(resultado)) return resultado;
    return resultado
        .map(fila => {
            return Object.keys(fila).sort().reduce((obj, key) => {
                obj[key] = String(fila[key]).toLowerCase().trim();
                return obj;
            }, {});
        })
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

game.prototype.nuevoJuego = async function (req, res) {
    const nivelUsuario = req.session.nivelUsuario;

    if (!nivelUsuario) {
        return res.status(401).json({ error: 'No has iniciado sesión' }); // 401 Unauthorized -> no hay sesión activa
    }

    try {
        await db.query(
            'UPDATE public.usuarios SET nivel_actual = 1 WHERE nombre = $1',
            [req.session.nombre]
        );

        req.session.nivelUsuario = 1;
        res.status(200).json({ mensaje: 'Juego reiniciado' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al reiniciar el juego' });
    }
};

module.exports = new game();