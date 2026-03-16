'use strict';

const express = require('express');
const router = express.Router();
const gameService = require('./game-service');

//Operaciones GET
router.get('/datos/:nivel/:tabla', gameService.getAllTabla);
router.get('/consulta/:consulta', gameService.getConsulta);

//Operaciones POST
router.post('/user/login', gameService.login);
router.post('/user/registrar', gameService.registrar);


module.exports = router;