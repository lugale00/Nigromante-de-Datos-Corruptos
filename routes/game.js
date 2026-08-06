'use strict';

const express = require('express');
const router = express.Router();
const gameService = require('./game-service');

//Operaciones GET
router.get('/datos/:nivel/:tabla', gameService.getAllTabla);
router.get('/consulta/:consulta', gameService.getConsulta);
router.get('/tablas', gameService.getTablas);
router.get('/mision', gameService.getMision);
router.get('/sesion', gameService.getSesion);
router.get('/tutorial/dialogos', gameService.getDialogos);
router.get('/tutorial/estado', gameService.getEstadoTutorial);

//Operaciones POST
router.post('/user/login', gameService.login);
router.post('/user/registrar', gameService.registrar);
router.post('/comprobar', gameService.comprobarSolucion);
router.post('/subirNivel', gameService.subirNivel);
router.post('/nuevoJuego', gameService.nuevoJuego);
router.post('/tutorial/avanzar', gameService.avanzarTutorial);
router.post('/user/logout', gameService.cerrarSesion);
router.post('/user/recuperar', gameService.solicitarRecuperacion);
router.post('/user/verificar-recuperacion', gameService.verificarRecuperacion);

//Operaciones admin
router.get('/admin/verificar', gameService.verificarAdmin);
router.post('/admin/login', gameService.loginAdmin);
router.get('/admin/stats/usuarios', gameService.statsUsuarios);
router.get('/admin/stats/misiones', gameService.statsMisiones);
router.get('/admin/stats/intentos', gameService.statsIntentos);
router.post('/admin/promover', gameService.promoverUsuario);


module.exports = router;