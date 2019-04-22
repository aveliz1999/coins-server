const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authenticatedMiddleware = require('../middleware/authenticated');
const mysql = require('../database/mysql');
const knex = require('knex');
const user = require('../database/user');
const fsPromises = require('fs').promises;
const rimraf = require('rimraf');
const encryptionUtil = require('../util/encryption');

const controller = require('../controllers/users');

router.post('/', controller.create);
router.post('/login', controller.login);

router.use(authenticatedMiddleware);


router.get('/', controller.getFromSession);

/**
 * Search for users with names that begin with the given name.
 * Returns a list of user objects without the internal ID and the user passwords.
 *
 * The name parameter must be present, and it must be under 50 characters.
 */
router.get('/search/:name', controller.search);

module.exports = router;
