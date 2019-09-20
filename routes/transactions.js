const express = require('express');
const router = express.Router();
const authenticatedMiddleware = require('../middleware/authenticated');

const controller = require('../controllers/transactions');

router.use(authenticatedMiddleware);

router.post('/', controller.create);
router.get('/search/:previousTransactionId?', controller.search);
router.get('/:id', controller.get);


module.exports = router;
