const router = require('express').Router();
const controller = require('../controllers/productController');
const { optionalAuth } = require('../middleware/authmiddleware');

router.get('/', optionalAuth, controller.listProducts);
router.get('/meta', controller.getMeta);
router.get('/:slug', controller.getProduct);

module.exports = router;
