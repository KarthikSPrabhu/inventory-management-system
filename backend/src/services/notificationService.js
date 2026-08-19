const Notification = require('../models/Notification');
const Project = require('../models/Project');

/**
 * Helper to check cooldown for duplicate notifications
 * Returns true if an alert should be skipped.
 */
const shouldSkipAlert = async (user, type, item = null, cooldownHours = 1) => {
  const query = { user, type };
  if (item) query.item = item;

  // 1. If there's an UNREAD alert of this exact type/item, skip
  const existingUnread = await Notification.findOne({ ...query, isRead: false });
  if (existingUnread) return true;

  // 2. If the latest alert is within the cooldown period, skip
  const cooldownDate = new Date();
  cooldownDate.setHours(cooldownDate.getHours() - cooldownHours);
  
  const recentAlert = await Notification.findOne({ 
    ...query, 
    createdAt: { $gte: cooldownDate } 
  });
  
  if (recentAlert) return true;

  return false;
};

/**
 * Check an item's thresholds and generate LOW_STOCK or OUT_OF_STOCK notifications.
 */
exports.checkItemThresholds = async (item, userObj) => {
  try {
    if (!item || !userObj) return;

    const q = Number(item.quantity) || 0;
    const min = Number(item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5);
    const max = Number(item.maximumStock);
    const userId = userObj._id || userObj;

    if (q === 0) {
      if (await shouldSkipAlert(userId, 'OUT_OF_STOCK', item._id, 1)) return;
      
      await Notification.create({
        user: userId,
        type: 'OUT_OF_STOCK',
        priority: 'CRITICAL',
        title: 'OUT OF STOCK',
        message: `${item.name} is completely out of stock.`,
        item: item._id,
        location: item.location
      });
    } else if (q <= min) {
      if (await shouldSkipAlert(userId, 'LOW_STOCK', item._id, 1)) return;

      await Notification.create({
        user: userId,
        type: 'LOW_STOCK',
        priority: 'WARNING',
        title: 'LOW STOCK',
        message: `${item.name} is running low (Current: ${q}, Minimum: ${min}).`,
        item: item._id,
        location: item.location
      });
    }

    if (max > 0 && q >= max) {
      if (await shouldSkipAlert(userId, 'MAX_STOCK', item._id, 12)) return; // 12 hour cooldown for max stock

      await Notification.create({
        user: userId,
        type: 'MAX_STOCK',
        priority: 'WARNING',
        title: 'MAXIMUM STOCK REACHED',
        message: `${item.name} has reached its maximum stock limit (Current: ${q}, Max: ${max}).`,
        item: item._id,
        location: item.location
      });
    }
  } catch (error) {
    console.error('Error in checkItemThresholds notification:', error);
  }
};

/**
 * Generate a stock movement/usage alert (INFO priority)
 */
exports.generateMovementAlert = async (type, quantity, item, userObj, project = null, locationStr = null) => {
  try {
    const userId = userObj._id || userObj;
    
    // We don't strictly cooldown movement alerts, but we can limit flooding if needed.
    // For now, let's just create them.

    let title = '';
    let message = '';
    let notifType = 'MOVEMENT';

    if (type === 'IN') {
      title = 'STOCK ADDED';
      message = `+${quantity} ${item.name} added.`;
    } else if (type === 'OUT') {
      title = 'STOCK REMOVED';
      message = `-${quantity} ${item.name} taken.`;
      if (project) message += ` (Project: ${project.name || 'Unknown'})`;
    } else if (type === 'MOVE') {
      title = 'STOCK MOVED';
      message = `${quantity} ${item.name} moved${locationStr ? ' to ' + locationStr : ''}.`;
    }

    await Notification.create({
      user: userId,
      type: notifType,
      priority: 'INFO',
      title,
      message,
      item: item._id,
      project: project ? project._id : null
    });
  } catch (error) {
    console.error('Error generating movement alert:', error);
  }
};

/**
 * Generate an inventory adjustment alert (WARNING priority)
 */
exports.generateAdjustmentAlert = async (quantityDiff, reason, item, userObj) => {
  try {
    const userId = userObj._id || userObj;
    
    await Notification.create({
      user: userId,
      type: 'ADJUSTMENT',
      priority: 'WARNING',
      title: 'INVENTORY ADJUSTED',
      message: `${item.name} adjusted by ${quantityDiff > 0 ? '+' : ''}${quantityDiff}. Reason: ${reason || 'Manual adjustment'}`,
      item: item._id
    });
  } catch (error) {
    console.error('Error generating adjustment alert:', error);
  }
};
