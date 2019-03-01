var express = require('express');
var router = express.Router();
const Joi = require('joi');
const user = require('../database/user');

/**
 * Register new user with information sent in a POST request to /users
 *
 * Requires an email of max 50 characters, a password between 8 and 32 characters (that follows a specific regex), and
 * a name between 4 and 45 characterss
 */
router.post('/', function(req, res) {
  const registerSchema = {
    email: Joi.string()
        .email()
        .max(50)
        .required(),
    password: Joi.string()
        .min(8)
        .max(32)
        .regex(/^[ \!"#\$%&'\(\)\*\+,\-\.\/\:;\<\=\>\?@\[\\\]\^_`\{\|\}~a-zA-Z0-9]+$/)
        .required(),
    name: Joi.string()
        .min(4)
        .max(45)
        .required()
  };
  Joi.validate(req.body, registerSchema, function(err, value) {
    if(err){
      res.status(400).send({message: err.message});
    }
    else{
      user.create(value.email, value.password, value.name)
          .then(function() {
            res.status(200).send({data: 'User created successfully'});
          })
          .catch(function(err) {
            if(err.code === 'ER_DUP_ENTRY' && err.sqlMessage.match(/(?<=key ').+(?=')/)[0] === 'email_UNIQUE'){
              res.status(400).send({message: 'A user with that email already exists.'})
            }
            else{
              res.status(500).send({message: 'An error occurred while creating your user. Please try again.'});
            }
          });
    }
  });

});

module.exports = router;
