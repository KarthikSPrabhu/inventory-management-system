const InventoryAdjustment = require('../models/InventoryAdjustment');
const InventoryItem = require('../models/InventoryItem');
const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc    Adjust stock to absolute value for physical count corrections
// @route   POST /api/inventory/:id/adjust
// @access  Private (requireAuth, requireRole('admin'))
exports.adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { newQuantity, reason, notes } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID format' });
    }

    const qty = Number(newQuantity);
    if (isNaN(qty) || !Number.isInteger(qty) || qty < 0) {
      return res.status(400).json({ success: false, message: 'New quantity must be a non-negative integer' });
    }

    const rawReason = String(reason || '').trim();
    if (!rawReason) {
      return res.status(400).json({ success: false, message: 'Reason for adjustment is required' });
    }

    const noteText = String(notes || '').trim();
    if (noteText.length > 500) {
      return res.status(400).json({ success: false, message: 'Notes cannot exceed 500 characters' });
    }

    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }

    try {
      // We cannot easily do findOneAndUpdate here while returning the prevQty if another process changes it.
      // But we CAN use findOneAndUpdate to set it atomically.
      const itemBefore = await InventoryItem.findById(id).session(session || undefined);
      if (!itemBefore) {
        if (session) await session.abortTransaction();
        return res.status(404).json({ success: false, message: 'Inventory item not found' });
      }

      if (itemBefore.quantity === qty) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'New quantity is the same as current quantity. No adjustment needed.' });
      }

      const prevQty = itemBefore.quantity;
      const diff = qty - prevQty;

      const item = await InventoryItem.findOneAndUpdate(
        { _id: id, quantity: prevQty }, // only update if nobody else changed it in the meantime!
        { $set: { quantity: qty } },
        { new: true, session: session || undefined }
      );

      if (!item) {
        if (session) await session.abortTransaction();
        return res.status(409).json({ success: false, message: 'Stock was changed by another user just now. Please refresh and try again.' });
      }

      const adjustment = new InventoryAdjustment({
        item: item._id,
        previousQuantity: prevQty,
        newQuantity: qty,
        difference: diff,
        reason: rawReason,
        notes: noteText
      });
      await adjustment.save(session ? { session } : undefined);

      if (session) await session.commitTransaction();

      return res.status(201).json({
        success: true,
        message: `Stock adjusted from ${prevQty} to ${qty}.`,
        data: { adjustment, item }
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
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Adjust Stock Error:', error);
    res.status(500).json({ success: false, message: 'Unable to adjust stock. Please try again.' });
  }
};
