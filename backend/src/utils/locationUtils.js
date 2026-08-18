/**
 * Formats a location code segment according to Phase 20 rules:
 * - 1 digit -> 2 digits (e.g., "2" -> "02")
 * - 2+ digits -> unchanged (e.g., "12" -> "12")
 * - Non-numeric -> unchanged (e.g., "A" -> "A")
 */
const formatLocationSegment = (segment) => {
  if (segment === undefined || segment === null) return '';
  const str = String(segment).trim();
  
  // If it's purely a single digit number, pad with leading zero
  if (/^\d$/.test(str)) {
    return `0${str}`;
  }
  
  // Otherwise return as is
  return str;
};

/**
 * Generates a full display location ID from an array of node codes (root to leaf)
 * e.g., ["A", "4", "1", "2"] -> "A040102"
 */
const generateLocationDisplayId = (pathCodes) => {
  if (!Array.isArray(pathCodes)) return '';
  return pathCodes.map(formatLocationSegment).join('');
};

/**
 * Mongoose deep populate definition for StorageNode location hierarchies.
 * Traverses parentId chain up to 4 levels (SECTION -> STORAGE_UNIT -> CONTAINER -> CONTAINER).
 */
const deepPopulateLocation = {
  path: 'locations.node',
  populate: {
    path: 'parentId',
    populate: {
      path: 'parentId',
      populate: {
        path: 'parentId',
        populate: {
          path: 'parentId'
        }
      }
    }
  }
};

module.exports = {
  formatLocationSegment,
  generateLocationDisplayId,
  deepPopulateLocation
};

