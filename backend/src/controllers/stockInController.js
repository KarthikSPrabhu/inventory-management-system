const InventoryStockIn = require('../models/InventoryStockIn');
const InventoryItem = require('../models/InventoryItem');
const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Allowed predefined reasons
const PREDEFINED_REASONS = ['Purchased', 'Returned', 'Found', 'Transferred In', 'Correction', 'Other'];

// @desc    Record inventory stock-in / restocking & update item stock quantity atomically
// @route   POST /api/stock-in
// @access  Private (requireAuth, requireRole('admin'))
exports.createStockIn = async (req, res) => {
  try {
    const { itemId, quantity, reason, notes } = req.body;

    // 1. Validate Item ID format
    if (!itemId || !isValidId(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid inventory item selection is required'
      });
    }

    // 2. Validate Quantity (positive integer)
    const qty = Number(quantity);
    if (isNaN(qty) || !Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive whole number'
      });
    }

    // 3. Validate Reason
    const rawReason = String(reason || '').trim();
    if (!rawReason) {
      return res.status(400).json({
        success: false,
        message: 'Reason for stock-in is required'
      });
    }

    let finalReason = rawReason;
    if (rawReason === 'Other') {
      const customExplanation = String(req.body.customReason || '').trim();
      if (!customExplanation) {
        return res.status(400).json({
          success: false,
          message: 'A custom explanation is required when selecting "Other"'
        });
      }
      finalReason = `Other: ${customExplanation}`;
    }

    // 4. Validate Notes length
    const noteText = String(notes || '').trim();
    if (noteText.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Notes cannot exceed 500 characters'
      });
    }

    // 5. Attempt MongoDB session transaction for atomic stock addition
    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }

    try {
      const item = await InventoryItem.findOneAndUpdate(
        { _id: itemId },
        { $inc: { quantity: qty } },
        { new: true, session: session || undefined }
      );

      if (!item) {
        if (session) await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      const stockIn = new InventoryStockIn({
        item: item._id,
        quantity: qty,
        reason: finalReason,
        notes: noteText
      });
      await stockIn.save(session ? { session } : undefined);

      if (session) await session.commitTransaction();

      return res.status(201).json({
        success: true,
        message: `${qty} ${item.name} unit(s) added to inventory.`,
        data: {
          stockIn,
          item
        }
      });
    } catch (dbErr) {
      if (session) await session.abortTransaction();
      throw dbErr;
    } finally {
      if (session) session.endSession();
    }

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    console.error('Create Stock-In Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to add stock. Please try again.'
    });
  }
};
