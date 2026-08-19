const InventoryStockIn = require('../models/InventoryStockIn');
const InventoryItem = require('../models/InventoryItem');
const { deepPopulateLocation } = require('../utils/locationUtils');
const notificationService = require('../services/notificationService');
const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Allowed predefined reasons
const PREDEFINED_REASONS = ['Purchased', 'Returned', 'Found', 'Transferred In', 'Correction', 'Other'];

// @desc    Record inventory stock-in / restocking & update item stock quantity atomically
// @route   POST /api/stock-in
// @access  Private (requireAuth, requireRole('admin'))
exports.createStockIn = async (req, res) => {
  try {
    const { itemId, locationId, quantity, reason, notes } = req.body;

    // 1. Validate Item ID format
    if (!itemId || !isValidId(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid inventory item selection is required'
      });
    }

    if (!locationId || !isValidId(locationId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid physical location selection is required'
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
      // Atomic location array update
      const updateResult = await InventoryItem.updateOne(
        { _id: itemId, 'locations.node': locationId },
        { $inc: { 'locations.$.quantity': qty, quantity: qty } },
        { session: session || undefined }
      );

      if (updateResult.matchedCount === 0) {
        // Location not in array yet, atomically push
        const pushResult = await InventoryItem.updateOne(
          { _id: itemId, 'locations.node': { $ne: locationId } },
          { 
            $push: { locations: { node: locationId, quantity: qty } },
            $inc: { quantity: qty }
          },
          { session: session || undefined }
        );

        if (pushResult.matchedCount === 0) {
          // If push didn't match, the item either doesn't exist or someone else just added the location.
          // In the extremely rare case someone else added it between the first updateOne and this one,
          // we would need to retry. A simple fallback is to just throw an error or retry.
          const checkItem = await InventoryItem.findById(itemId).session(session || undefined);
          if (!checkItem) {
            if (session) await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Inventory item not found' });
          } else {
             // Retry the increment
             await InventoryItem.updateOne(
               { _id: itemId, 'locations.node': locationId },
               { $inc: { 'locations.$.quantity': qty, quantity: qty } },
               { session: session || undefined }
             );
          }
        }
      }

      const item = await InventoryItem.findById(itemId).populate(deepPopulateLocation).session(session || undefined);

      if (!item) {
        if (session) await session.abortTransaction();
        return res.status(404).json({ success: false, message: 'Inventory item not found after update' });
      }

      const stockIn = new InventoryStockIn({
        item: item._id,
        locationNode: locationId,
        quantity: qty,
        reason: finalReason,
        notes: noteText
      });
      await stockIn.save(session ? { session } : undefined);

      if (session) await session.commitTransaction();

      // Trigger Notifications in background
      notificationService.checkItemThresholds(item, req.user);
      notificationService.generateMovementAlert('IN', qty, item, req.user, null, null);

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
