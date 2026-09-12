const router = require('express').Router();
const controller = require('../controllers/orderController');
const { protect, optionalAuth } = require('../middleware/authmiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');
const { rateLimit } = require('../utils/rateLimit');

router.post('/', optionalAuth, rateLimit({ windowMs: 10 * 60 * 1000, max: 10 }), controller.createOrder);
router.get('/demo/:code', controller.getDemoOrder);
router.get('/mine', protect, controller.listMyOrders);
router.get('/:id', optionalAuth, controller.getOrderById);
router.patch('/:id/status', protect, requireAdmin, controller.updateStatus);

module.exports = router;
