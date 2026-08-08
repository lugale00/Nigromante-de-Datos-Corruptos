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
        2: { 'almas': 'datos.v_almas_n1' },
        3: { 'almas': 'datos.v_almas_n2', 'lugar': 'datos.v_lugar_n2' },
        4: { 'almas': 'datos.v_almas_n2', 'lugar': 'datos.v_lugar_n2' },
        5: { 'almas': 'datos.v_almas_n3', 'lugar': 'datos.v_lugar_n3', 'armamento': 'datos.v_armamento_n3' }
    };

    const vistasNivel = vistas[nivelUsuario];
    let consulta = req.params.consulta;
    const consultaLower = consulta.toLowerCase();

    // Capa 1: bloqueamos acceso expl í cito a esquemas
    if (consultaLower.includes('public') || consultaLower.includes('datos.')) {
        return res.status(418).json({ error: 'Acceso no permitido a ese esquema' });
    }

    // Capa 2: bloqueamos tablas de niveles superiores
    const todasLasTablas = ['almas', 'lugar', 'armamento'];
    const accesoNoPermitido = todasLasTablas.some(tabla =>
        consultaLower.includes(tabla) && !vistasNivel[tabla]
    );

    if (accesoNoPermitido) {
        return res.status(403).json({ error: 'No tienes acceso a esas tablas aún' });
    }

    // Capa 3: sustituimos tablas por vistas del nivel actual
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
    const { email, contrasena } = req.body; // ✅ ahora usamos email

    try {
        const result = await db.query(
            'SELECT * FROM public.usuarios WHERE email = $1',
            [email]
        );

        const usuario = result.rows[0];
        if (!usuario) return res.status(401).json({ error: 'Usuario no encontrado' });

        // Bloqueamos login con contraseña si el usuario se registró con Google
        if (usuario.contrasena === 'google_auth') {
            return res.status(401).json({ error: 'Esta cuenta usa Google para iniciar sesión' });
        }

        const valida = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!valida) return res.status(401).json({ error: 'Contraseña incorrecta' });

        req.session.nivelUsuario = usuario.nivel_actual;
        req.session.nombre = usuario.nombre;
        req.session.rol = usuario.rol || 'estudiante';

        res.status(200).json({ mensaje: 'Login correcto' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

game.prototype.getSesion = async function (req, res) {
    if (!req.session.nivelUsuario) {
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    try {
        const result = await db.query(
            'SELECT vida FROM public.usuarios WHERE nombre = $1',
            [req.session.nombre]
        );
        const vida = result.rows[0]?.vida || 100;

        res.status(200).json({
            nombre: req.session.nombre,
            nivel: req.session.nivelUsuario,
            rol: req.session.rol || 'estudiante',
            vida: vida // ✅ vida de la BD
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener sesión' });
    }
};

game.prototype.registrar = async function (req, res) {
    const { nombre, email, contrasena } = req.body; // ✅ añadimos email

    try {
        // Comprobamos si el email ya existe
        const existe = await db.query(
            'SELECT id FROM public.usuarios WHERE email = $1',
            [email]
        );
        if (existe.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const hash = await bcrypt.hash(contrasena, 10);
        await db.query(
            'INSERT INTO public.usuarios (nombre, email, contrasena, nivel_actual, nivel_maximo) VALUES ($1, $2, $3, 1, 1)',
            [nombre, email, hash]
        );

        res.status(200).json({ mensaje: 'Registro exitoso' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar usuario' });
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
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    // Si es nivel de tutorial, no hay misiones sino diálogos
    if (nivelUsuario === 1 || nivelUsuario === 3) {
        return res.status(200).json({ esTutorial: true, nivel: nivelUsuario });
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
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    if (nivelUsuario >= 5) {
        return res.status(200).json({ nivelMaximo: true });
    }

    try {
        const nuevoNivel = nivelUsuario + 1;
        const vidaActual = req.body.vida || 100; // ✅ vida viene del frontend

        await db.query(
            'UPDATE public.usuarios SET nivel_actual = $1, nivel_maximo = GREATEST(nivel_maximo, $1), vida = $2 WHERE nombre = $3',
            [nuevoNivel, vidaActual, req.session.nombre]
        );

        req.session.nivelUsuario = nuevoNivel;
        req.session.dialogoActual = 0;

        res.status(200).json({ nuevoNivel });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al subir de nivel' });
    }
};

function normalizarResultado(resultado) {
    if (!Array.isArray(resultado)) return resultado;
    return resultado.map(fila => {
        return Object.keys(fila).sort().reduce((obj, key) => {
            obj[key] = String(fila[key]).trim();
            return obj;
        }, {});
    });
}

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
        const jugadorNorm = normalizarResultado(resultadoJugador);
        const esperadoNorm = normalizarResultado(resultadoEsperado);

        const correcto = JSON.stringify(jugadorNorm) === JSON.stringify(esperadoNorm);

        // Guardamos el intento si es estudiante
        if (req.session.rol !== 'admin') {
            const usuarioResult = await db.query(
                'SELECT id FROM public.usuarios WHERE nombre = $1',
                [req.session.nombre]
            );
            const idUsuario = usuarioResult.rows[0]?.id;
            if (idUsuario) {
                await db.query(
                    'INSERT INTO public.intentos (id_usuario, id_mision, correcto) VALUES ($1, $2, $3)',
                    [idUsuario, idMision, correcto]
                );
            }
        }

        res.status(200).json({ correcto });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al comprobar solución' });
    }
};

game.prototype.nuevoJuego = async function (req, res) {
    const nivelUsuario = req.session.nivelUsuario;

    if (!nivelUsuario) {
        return res.status(401).json({ error: 'No has iniciado sesión' }); // 401 Unauthorized -> no hay sesión activa
    }

    try {
        await db.query(
            'UPDATE public.usuarios SET nivel_actual = 1, vida = 100 WHERE nombre = $1',
            [req.session.nombre]
        );

        req.session.nivelUsuario = 1;
        res.status(200).json({ mensaje: 'Juego reiniciado' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al reiniciar el juego' });
    }
};

// Verificar si el usuario actual es admin
game.prototype.verificarAdmin = async function (req, res) {
    if (!req.session.nivelUsuario || req.session.rol !== 'admin') {
        return res.status(401).json({ error: 'No autorizado' });
    }
    res.status(200).json({ nombre: req.session.nombre });
};

// Login admin (mismo sistema pero guardamos el rol en sesión)
game.prototype.loginAdmin = async function (req, res) {
    const { nombre, contrasena } = req.body;

    try {
        const result = await db.query(
            'SELECT * FROM public.usuarios WHERE nombre = $1 AND rol = $2',
            [nombre, 'admin']
        );

        const usuario = result.rows[0];
        if (!usuario) return res.status(401).json({ error: 'Usuario no encontrado o sin permisos' });

        const valida = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!valida) return res.status(401).json({ error: 'Contraseña incorrecta' });

        req.session.nivelUsuario = usuario.nivel_actual;
        req.session.nombre = usuario.nombre;
        req.session.rol = 'admin'; // ✅ guardamos el rol en sesión

        res.status(200).json({ mensaje: 'Login correcto' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

// Estadísticas de usuarios
game.prototype.statsUsuarios = async function (req, res) {
    if (req.session.rol !== 'admin') return res.status(401).json({ error: 'No autorizado' });

    const busqueda = req.query.busqueda || '';

    try {
        let query;
        let params;

        if (busqueda) {
            query = `
                SELECT
                    u.nombre,
                    u.email,
                    u.nivel_actual,
                    u.nivel_maximo,
                    u.fecha_registro,
                    COUNT(i.id) AS total_intentos,
                    SUM(CASE WHEN i.correcto THEN 1 ELSE 0 END) AS aciertos,
                    SUM(CASE WHEN NOT i.correcto THEN 1 ELSE 0 END) AS fallos
                FROM public.usuarios u
                LEFT JOIN public.intentos i ON i.id_usuario = u.id
                WHERE u.rol = 'estudiante'
                AND (u.nombre ILIKE $1 OR u.email ILIKE $1)
                GROUP BY u.id
                ORDER BY u.fecha_registro DESC
                LIMIT 10
            `;
            params = [`%${busqueda}%`];
        } else {
            query = `
                SELECT
                    u.nombre,
                    u.email,
                    u.nivel_actual,
                    u.nivel_maximo,
                    u.fecha_registro,
                    COUNT(i.id) AS total_intentos,
                    SUM(CASE WHEN i.correcto THEN 1 ELSE 0 END) AS aciertos,
                    SUM(CASE WHEN NOT i.correcto THEN 1 ELSE 0 END) AS fallos
                FROM public.usuarios u
                LEFT JOIN public.intentos i ON i.id_usuario = u.id
                WHERE u.rol = 'estudiante'
                GROUP BY u.id
                ORDER BY u.fecha_registro DESC
                LIMIT 10
            `;
            params = [];
        }

        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

// Estadísticas de misiones
game.prototype.statsMisiones = async function (req, res) {
    if (req.session.rol !== 'admin') return res.status(401).json({ error: 'No autorizado' });

    try {
        const result = await db.query(`
            SELECT
                m.nombre,
                m.nivel_requerido,
                COUNT(i.id) AS total_intentos,
                SUM(CASE WHEN i.correcto THEN 1 ELSE 0 END) AS aciertos,
                SUM(CASE WHEN NOT i.correcto THEN 1 ELSE 0 END) AS fallos,
                ROUND(
                    SUM(CASE WHEN i.correcto THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(i.id), 0)
                , 1) AS tasa_acierto
            FROM public.misiones m
            LEFT JOIN public.intentos i ON i.id_mision = m.id
            LEFT JOIN public.usuarios u ON i.id_usuario = u.id
            WHERE u.rol = 'estudiante' OR u.rol IS NULL
            GROUP BY m.id
            ORDER BY m.nivel_requerido, m.id
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

// Estadísticas de intentos por día
game.prototype.statsIntentos = async function (req, res) {
    if (req.session.rol !== 'admin') return res.status(401).json({ error: 'No autorizado' });

    try {
        const result = await db.query(`
            SELECT
                DATE(i.fecha) AS dia,
                COUNT(*) AS total,
                SUM(CASE WHEN i.correcto THEN 1 ELSE 0 END) AS aciertos
            FROM public.intentos i
            JOIN public.usuarios u ON i.id_usuario = u.id
            WHERE u.rol = 'estudiante'
            GROUP BY DATE(i.fecha)
            ORDER BY dia DESC
            LIMIT 30
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

// Promover usuario a admin
game.prototype.promoverUsuario = async function (req, res) {
    if (req.session.rol !== 'admin') return res.status(401).json({ error: 'No autorizado' });

    const { nombre } = req.body;

    try {
        const result = await db.query(
            'UPDATE public.usuarios SET rol = $1 WHERE nombre = $2 AND rol = $3 RETURNING nombre',
            ['admin', nombre, 'estudiante']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado o ya es admin' });
        }

        res.status(200).json({ mensaje: `${nombre} ahora es administrador` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al promover usuario' });
    }
};

// Devuelve los diálogos del nivel tutorial actual
game.prototype.getDialogos = async function (req, res) {
    const nivelUsuario = req.session.nivelUsuario;

    if (!nivelUsuario) {
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    // Solo aplica en niveles de tutorial (1 y 3)
    if (nivelUsuario !== 1 && nivelUsuario !== 3) {
        return res.status(400).json({ error: 'No estás en un nivel de tutorial' });
    }

    try {
        const result = await db.query(
            'SELECT * FROM public.dialogos WHERE nivel = $1 ORDER BY orden',
            [nivelUsuario]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener diálogos' });
    }
};

// Devuelve el estado del tutorial (en qué diálogo va el usuario)
game.prototype.getEstadoTutorial = async function (req, res) {
    if (!req.session.nivelUsuario) {
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    // Guardamos el progreso del tutorial en la sesión
    const dialogoActual = req.session.dialogoActual || 0;
    res.status(200).json({ dialogoActual });
};

// Avanza al siguiente diálogo
game.prototype.avanzarTutorial = async function (req, res) {
    if (!req.session.nivelUsuario) {
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    const { dialogoActual } = req.body;
    req.session.dialogoActual = dialogoActual;

    res.status(200).json({ ok: true });
};

game.prototype.cerrarSesion = async function (req, res) {
    req.session.destroy(function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ mensaje: 'Sesión cerrada' });
    });
};

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

// Solicitar código de recuperación
game.prototype.solicitarRecuperacion = async function (req, res) {
    console.log('solicitarRecuperacion llamada'); // ← log 1
    const { email } = req.body;
    console.log('email recibido:', email); // ← log 2

    try {
        console.log('buscando usuario...'); // ← log 3
        const result = await db.query(
            'SELECT * FROM public.usuarios WHERE email = $1',
            [email]
        );
        console.log('usuario encontrado:', result.rows.length); // ← log 4

        if (result.rows.length === 0) {
            // No revelamos si el email existe por seguridad
            return res.status(200).json({ mensaje: 'Si el correo existe recibirás un código.' });
        }

        const usuario = result.rows[0];

        // No permitimos recuperación para cuentas Google
        if (usuario.contrasena === 'google_auth') {
            return res.status(400).json({ error: 'Esta cuenta usa Google para autenticarse.' });
        }

        // Generamos código de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // Invalidamos códigos anteriores del mismo email
        await db.query(
            'UPDATE public.tokens_recuperacion SET usado = true WHERE email = $1',
            [email]
        );

        // Guardamos el nuevo código
        await db.query(
            'INSERT INTO public.tokens_recuperacion (email, codigo, expiracion) VALUES ($1, $2, $3)',
            [email, codigo, expiracion]
        );

        // Enviamos el email
        await transporter.sendMail({
            from: `"Nigromante de Datos Corruptos" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Código de recuperación de contraseña',
            html: `
                <h2>Recuperación de contraseña</h2>
                <p>Tu código de verificación es:</p>
                <h1 style="letter-spacing: 0.5rem; color: #6b3fa0;">${codigo}</h1>
                <p>Este código expira en 15 minutos.</p>
                <p>Si no has solicitado este código, ignora este correo.</p>
            `
            }).catch(err => {
            console.error('Error al enviar email:', err);
            throw err;
        });

        res.status(200).json({ mensaje: 'Si el correo existe recibirás un código.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al enviar el código.' });
    }
};

// Verificar código y cambiar contraseña
game.prototype.verificarRecuperacion = async function (req, res) {
    const { email, codigo, nuevaContrasena } = req.body;

    try {
        const result = await db.query(
            `SELECT * FROM public.tokens_recuperacion 
            WHERE email = $1 AND codigo = $2 AND usado = false 
            AND expiracion > NOW()
            ORDER BY id DESC LIMIT 1`,
            [email, codigo]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Código incorrecto o expirado.' });
        }

        // Validamos la nueva contraseña
        if (nuevaContrasena.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        // Actualizamos la contraseña
        const hash = await bcrypt.hash(nuevaContrasena, 10);
        await db.query(
            'UPDATE public.usuarios SET contrasena = $1 WHERE email = $2',
            [hash, email]
        );

        // Marcamos el token como usado
        await db.query(
            'UPDATE public.tokens_recuperacion SET usado = true WHERE id = $1',
            [result.rows[0].id]
        );

        res.status(200).json({ mensaje: 'Contraseña actualizada correctamente.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al verificar el código.' });
    }
};

module.exports = new game();