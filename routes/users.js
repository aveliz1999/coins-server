const express = require('express');
const router = express.Router();
const authenticatedMiddleware = require('../middleware/authenticated');

const controller = require('../controllers/users');

router.post('/', controller.create);
router.post('/login', controller.login);

router.use(authenticatedMiddleware);


router.get('/', controller.getFromSession);
router.get('/search/:name', controller.search);

module.exports = router;
