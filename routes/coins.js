const express = require('express');
const router = express.Router();
const authenticatedMiddleware = require('../middleware/authenticated');
const mysql = require('../database/mysql');
const knex = require('knex')({client: 'mysql'});

const controller = require('../controllers/coins');

router.use(authenticatedMiddleware);
router.get('/', controller.getFromSession);

module.exports = router;
