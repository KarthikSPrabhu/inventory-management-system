import { resolveNodeHierarchy } from '../utils/locationUtils';

/**
 * Image references for the 6-box physical storage rack.
 * 0 = All boxes closed
 * 1..6 = Box 1..6 open (Top to Bottom)
 */
export const storageImages = {
  closed: "/img/0-removebg-preview.png",
  1: "/img/1-removebg-preview.png",
  2: "/img/2-removebg-preview.png",
  3: "/img/3-removebg-preview.png",
  4: "/img/4-removebg-preview.png",
  5: "/img/5-removebg-preview.png",
  6: "/img/6-removebg-preview.png"
};

/**
 * Resolves item locations to physical storage drawer numbers (1..6).
 * Uses StorageNode tree hierarchy to determine the authoritative primary storage unit (1..6).
 */
export const getPhysicalDrawerNumbers = (locations, tree) => {
  if (!locations || !Array.isArray(locations)) return [];
  
  const drawers = new Set();
  
  locations.forEach(loc => {
    const node = loc.node;
    if (!node) return;
    
    const resolved = resolveNodeHierarchy(node, tree);
    if (resolved && resolved.physicalDrawer >= 1 && resolved.physicalDrawer <= 6) {
      drawers.add(resolved.physicalDrawer);
    }
  });
  
  return Array.from(drawers);
};
