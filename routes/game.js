'use strict';

const express = require('express');
const router = express.Router();
const gameService = require('./game-service');

router.get('/datos/:nivel/:tabla', gameService.getAllTabla);
router.get('/consulta/:consulta', gameService.getConsulta);







module.exports = router;