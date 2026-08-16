const express = require('express');
const router = express.Router();
const { createStockIn } = require('../controllers/stockInController');

router.route('/')
  .post(createStockIn);

module.exports = router;
