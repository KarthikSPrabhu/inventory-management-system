const express = require('express');
const router = express.Router();
const {
  createUsage,
  getAllUsage,
  getItemUsage
} = require('../controllers/usageController');

router.route('/')
  .post(createUsage)
  .get(getAllUsage);

router.route('/item/:itemId')
  .get(getItemUsage);

module.exports = router;
