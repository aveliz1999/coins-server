const express = require('express');
const router = express.Router();
const authenticatedMiddleware = require('../middleware/authenticated');

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
