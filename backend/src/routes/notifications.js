const express = require('express');
const Notification = require('../models/Notification');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const HttpError = require('../middleware/httpError');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ user: req.user.id, read: false }),
  ]);
  res.json({ notifications, unreadCount });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } });
  res.json({ ok: true });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { $set: { read: true } }, { new: true });
  if (!n) throw new HttpError(404, 'Notification not found');
  res.json({ notification: n });
}));

module.exports = router;
