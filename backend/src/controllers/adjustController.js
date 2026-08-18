const InventoryAdjustment = require('../models/InventoryAdjustment');
const InventoryItem = require('../models/InventoryItem');
const { deepPopulateLocation } = require('../utils/locationUtils');
const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc    Adjust stock to absolute value for physical count corrections
// @route   POST /api/inventory/:id/adjust
// @access  Private (requireAuth, requireRole('admin'))
exports.adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { locationId, newQuantity, reason, notes } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID format' });
    }

    if (!locationId || !isValidId(locationId)) {
      return res.status(400).json({ success: false, message: 'Invalid location ID format' });
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
      const itemBefore = await InventoryItem.findById(id).session(session || undefined);
      if (!itemBefore) {
        if (session) await session.abortTransaction();
        return res.status(404).json({ success: false, message: 'Inventory item not found' });
      }

      const locTarget = itemBefore.locations.find(l => l.node.toString() === locationId);
      if (!locTarget) {
        if (session) await session.abortTransaction();
        return res.status(404).json({ success: false, message: 'Item does not exist in the specified location' });
      }

      const prevQty = locTarget.quantity;

      if (prevQty === qty) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'New quantity is the same as current quantity for this location. No adjustment needed.' });
      }

      const diff = qty - prevQty;

      const item = await InventoryItem.findOneAndUpdate(
        { 
          _id: id, 
          locations: { $elemMatch: { node: locationId, quantity: prevQty } } 
        },
        { 
          $set: { 'locations.$.quantity': qty },
          $inc: { quantity: diff } 
        },
        { new: true, session: session || undefined }
      ).populate(deepPopulateLocation);

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
