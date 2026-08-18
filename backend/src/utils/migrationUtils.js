const StorageNode = require('../models/StorageNode');
const InventoryItem = require('../models/InventoryItem');

// Internal cache to avoid querying for the same nodes repeatedly during migration
const nodeCache = new Map();

/**
 * Ensures a node exists, returning its ID.
 * Creates it if missing.
 */
const ensureNode = async (type, name, code, section, parentId = null) => {
  const cacheKey = `${type}_${code}_${parentId}`;
  if (nodeCache.has(cacheKey)) {
    return nodeCache.get(cacheKey);
  }

  let node = await StorageNode.findOne({ type, code, parentId });
  if (!node) {
    node = new StorageNode({ type, name, code, section, parentId });
    await node.save();
  }
  
  nodeCache.set(cacheKey, node._id);
  return node._id;
};

/**
 * Migration script for Phase 20 hierarchical storage.
 * Reads items that still have a `location` object and maps them to `StorageNode`s.
 */
const runStorageMigration = async () => {
  try {
    // Find items that still possess the old legacy location structure
    const itemsToMigrate = await InventoryItem.find({ location: { $exists: true, $ne: null } });
    
    if (itemsToMigrate.length === 0) {
      console.log('No legacy inventory items to migrate.');
      return;
    }

    console.log(`Starting migration of ${itemsToMigrate.length} legacy inventory items to Phase 20 hierarchical storage...`);

    let migratedCount = 0;

    for (const item of itemsToMigrate) {
      const loc = item.location;
      if (!loc || !loc.section) continue;

      const sectionStr = loc.section.toUpperCase();
      const unitStr = String(loc.storageUnit);
      const boxStr = String(loc.box);

      // 1. Ensure SECTION
      const sectionId = await ensureNode('SECTION', `Section ${sectionStr}`, sectionStr, sectionStr, null);
      
      // 2. Ensure STORAGE_UNIT (parent is SECTION)
      const unitId = await ensureNode('STORAGE_UNIT', `Storage Unit ${unitStr}`, unitStr, sectionStr, sectionId);
      
      // 3. Ensure CONTAINER (parent is STORAGE_UNIT)
      const containerId = await ensureNode('CONTAINER', `Box ${boxStr}`, boxStr, sectionStr, unitId);

      // 4. Map the item to the container
      item.locations = [{
        node: containerId,
        quantity: item.quantity // put all existing quantity in this single physical location
      }];

      // Remove the old legacy location field so it's not migrated again
      item.location = undefined; 

      await item.save(); // pre-save hook will recount quantity, keeping it consistent
      migratedCount++;
    }

    console.log(`Successfully migrated ${migratedCount} items to hierarchical storage!`);
  } catch (error) {
    console.error('CRITICAL ERROR during storage migration:', error);
  }
};

module.exports = {
  runStorageMigration
};
