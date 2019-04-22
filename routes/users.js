const express = require('express');
const router = express.Router();
const Joi = require('joi');
const mysql = require('../database/mysql');
const knex = require('knex');
const user = require('../database/user');
const fsPromises = require('fs').promises;
const rimraf = require('rimraf');
const encryptionUtil = require('../util/encryption');

const controller = require('../controllers/users');

router.post('/', controller.create);
router.post('/login', controller.login);

/**
 * Middleware to only allow requests that are authenticated or reply with a 403 message.
 */
router.use(function(req, res, next) {
    if(req.session.user) {
        next();
    }
    else {
        res.status(403).send({message: 'Unauthorized'});
    }
});

/**
 * Get the email, name, and UUID of the user signed in to the session
 */
router.get('/', async function(req, res) {
    try{
        const {email, name, uuid} = await user.getById(req.session.user);
        res.status(200).send({user: {email, name, uuid}});
    }
    catch(err) {
        console.error(err);
        res.status(500).send({message: 'An error occurred while retrieving the user information. Please try again.'})
    }
});

/**
 * Search for users with names that begin with the given name.
 * Returns a list of user objects without the internal ID and the user passwords.
 *
 * The name parameter must be present, and it must be under 50 characters.
 */
router.get('/search/:name', function (req, res) {
    const searchSchema = {
        name: Joi.string()
            .max(50)
            .required()
    };
    Joi.validate(req.params, searchSchema, function (err, value) {
        if (err) {
            res.status(400).send({message: err.message});
        } else {
            user.searchByName(value.name)
                .then(function (users) {
                    res.status(200).send(
                        users.filter(user => user.id !== req.session.user).map(function (user) {
                            delete user.id;
                            delete user.password;
                            return user;
                        })
                    );
                })
                .catch(function (err) {
                    console.error(err);
                    res.status(500).send({message: 'An error occurred while searching. Please try again.'})
                });
        }
    });
});

module.exports = router;
