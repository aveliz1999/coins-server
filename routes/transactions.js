const express = require('express');
const router = express.Router();
const authenticatedMiddleware = require('../middleware/authenticated');

const controller = require('../controllers/transactions');

router.use(authenticatedMiddleware);

router.post('/', controller.create);
router.post('/acceptRequest', controller.acceptRequest);
router.post('/declineRequest', controller.declineRequest);
router.get('/search/requests/:previousId(\\d*)?', controller.searchRequests);
router.get('/search/:previousTransaction?', controller.searchTransactions);


module.exports = router;
