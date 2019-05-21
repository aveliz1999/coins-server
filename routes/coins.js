const express = require('express');
const router = express.Router();
const authenticatedMiddleware = require('../middleware/authenticated');

const controller = require('../controllers/coins');

router.use(authenticatedMiddleware);
router.get('/', controller.getFromSession);
router.post('/', controller.create);
router.get('/:uuid', controller.getFromUuid);
router.put('/:uuid', controller.update);

module.exports = router;
