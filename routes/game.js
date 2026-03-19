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

//Operaciones POST
router.post('/user/login', gameService.login);
router.post('/user/registrar', gameService.registrar);
router.post('/comprobar', gameService.comprobarSolucion);
router.post('/subirNivel', gameService.subirNivel);
router.post('/nuevoJuego', gameService.nuevoJuego);


module.exports = router;