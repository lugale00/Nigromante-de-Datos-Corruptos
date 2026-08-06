
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
const pool = require('./routes/db');

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

// Passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const db = require('./routes/db');

        // Buscamos si ya existe el usuario por email de Google
        const email = profile.emails[0].value;
        const nombre = profile.displayName;

        let result = await db.query(
            'SELECT * FROM public.usuarios WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            // Creamos el usuario si no existe
            result = await db.query(
                'INSERT INTO public.usuarios (nombre, contrasena, email, nivel_actual, nivel_maximo) VALUES ($1, $2, $3, 1, 1) RETURNING *',
                [nombre, 'google_auth', email]
            );
        }

        const usuario = result.rows[0];
        return done(null, {
            nombre: usuario.nombre,
            nivel: usuario.nivel_actual,
            rol: usuario.rol || 'estudiante'
        });

    } catch (error) {
        return done(error);
    }
}));

const game = require('./routes/game');
app.use('/game', game);

// ✅ Rutas de Google OAuth
app.get('/game/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/game/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/inicio_sesion.html' }),
    (req, res) => {
        // Guardamos los datos en la sesión
        req.session.nivelUsuario = req.user.nivel;
        req.session.nombre = req.user.nombre;
        req.session.rol = req.user.rol;
        res.redirect('/menu.html');
    }
);

app.listen(port, async () => {
    try {
        await pool.connect();
        console.log('Conectado a PostgreSQL');
    } catch (err) {
        console.error('Error al conectar a PostgreSQL:', err);
    }
    console.log(`Servidor corriendo en http://localhost:${port}`);
});