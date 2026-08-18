import { resolveNodeHierarchy } from '../utils/locationUtils';

/**
 * Image references for the 6-box physical storage rack (Section A).
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
 * Image references for Section B physical storage.
 * B0 = Default closed
 * B1 = Upper drawer (B01)
 * B2 = Lower cabinet (B02)
 */
export const storageImagesB = {
  closed: "/img/B0.png",
  1: "/img/B1.png",
  2: "/img/B2.png"
};

/**
 * Resolves item locations to physical storage details { section, drawer }.
 * Uses StorageNode tree hierarchy to determine the authoritative primary storage unit.
 */
export const getPhysicalDrawerNumbers = (locations, tree) => {
  if (!locations || !Array.isArray(locations)) return [];
  
  const results = [];
  const seen = new Set();
  
  locations.forEach(loc => {
    const node = loc.node;
    if (!node) return;
    
    const resolved = resolveNodeHierarchy(node, tree);
    if (resolved && resolved.physicalDrawer >= 1) {
      const section = resolved.section || 'A';
      const drawer = resolved.physicalDrawer;
      const key = `${section}-${drawer}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ section, drawer });
      }
    }
  });
  
  return results;
};
