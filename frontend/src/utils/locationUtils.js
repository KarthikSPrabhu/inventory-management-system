/**
 * Formats a location code segment according to Phase 20 rules:
 * - 1 digit -> 2 digits (e.g., "2" -> "02", "3" -> "03")
 * - 2+ digits -> unchanged (e.g., "10" -> "10", "12" -> "12")
 * - Non-numeric -> unchanged (e.g., "A" -> "A")
 */
export const formatLocationSegment = (segment) => {
  if (segment === undefined || segment === null) return '';
  const str = String(segment).trim();
  if (/^\d$/.test(str)) return `0${str}`;
  return str;
};

/**
 * Generates a full display location ID from an array of node codes (root to leaf)
 * e.g., ["A", "4", "1", "2"] -> "A040102"
 * e.g., ["A", "3", "10"] -> "A0310"
 */
export const generateLocationDisplayId = (pathCodes) => {
  if (!Array.isArray(pathCodes)) return '';
  return pathCodes.map(formatLocationSegment).join('');
};

/**
 * Traverses the storage tree to find the full path to a specific node ID.
 * Returns an array of node objects from root to the target node.
 */
export const findNodePath = (tree, targetId) => {
  if (!tree || !Array.isArray(tree) || !targetId) return null;

  const targetStr = String(targetId);

  for (const node of tree) {
    if (String(node._id) === targetStr) return [node];
    
    if (node.children && node.children.length > 0) {
      const childPath = findNodePath(node.children, targetId);
      if (childPath) {
        return [node, ...childPath];
      }
    }
  }
  return null;
};

/**
 * Finds a node directly by ID in the tree
 */
export const findNodeById = (tree, targetId) => {
  const path = findNodePath(tree, targetId);
  return path ? path[path.length - 1] : null;
};

/**
 * Resolves node hierarchy from tree, pre-attached path, or populated parentId chain to extract:
 * - path (array of StorageNodes from root SECTION to leaf CONTAINER/UNIT)
 * - rootSection (e.g. 'A')
 * - primaryUnit (e.g. 6)
 * - physicalDrawer (1..6)
 * - containers (array of nested container nodes)
 * - displayId (authoritative display ID, e.g. A0610, A040201)
 */
export const resolveNodeHierarchy = (node, tree) => {
  if (!node) return null;
  const nodeId = typeof node === 'string' ? node : node._id;
  let path = null;

  // 1. Try finding full path in the hierarchical tree
  if (tree && nodeId) {
    path = findNodePath(tree, nodeId);
  }

  // 2. If node object has a pre-attached path array (from backend resolve endpoint)
  if (!path && node && typeof node === 'object' && Array.isArray(node.path)) {
    path = node.path;
  }

  // 3. If node object has populated parentId chain, traverse up from leaf to root
  if (!path && node && typeof node === 'object' && node._id) {
    let current = node;
    const chain = [];
    while (current && typeof current === 'object' && current.code) {
      chain.push(current);
      if (current.parentId && typeof current.parentId === 'object' && current.parentId.code) {
        current = current.parentId;
      } else {
        break;
      }
    }
    if (chain.length > 0) {
      path = chain.slice().reverse();
    }
  }

  // 4. Single node fallback if parent chain not populated
  if (!path && typeof node === 'object' && node._id) {
    path = [node];
  }

  if (!path || path.length === 0) return null;

  const sectionNode = path.find(n => n.type === 'SECTION');
  const unitNode = path.find(n => n.type === 'STORAGE_UNIT');
  const containers = path.filter(n => n.type === 'CONTAINER');

  const section = sectionNode ? sectionNode.code : (typeof node === 'object' && node.section ? node.section : 'A');
  
  let primaryUnit = null;
  if (unitNode) {
    const parsed = parseInt(unitNode.code, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      primaryUnit = parsed;
    }
  } else if (typeof node === 'object' && node.code && node.type === 'STORAGE_UNIT') {
    const parsed = parseInt(node.code, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      primaryUnit = parsed;
    }
  }

  // Determine physical drawer position (1..6) corresponding to primary unit 1..6
  const physicalDrawer = primaryUnit;

  return {
    path,
    section,
    primaryUnit,
    physicalDrawer,
    containers,
    displayId: generateLocationDisplayId(path.map(n => n.code))
  };
};

/**
 * Authoritative location display ID generator.
 * Takes a node (object or ID) and tree, resolves full parent chain,
 * and formats code: e.g. A01, A04, A0402, A040201, A0610, A060312.
 */
export const getLocationDisplayId = (node, tree) => {
  if (!node) return '';

  const resolved = resolveNodeHierarchy(node, tree);
  if (resolved && resolved.displayId) {
    return resolved.displayId;
  }

  // Fallback if single node code is available
  if (typeof node === 'object' && node.code) {
    if (node.section) {
      return `${node.section}${formatLocationSegment(node.code)}`;
    }
    return formatLocationSegment(node.code);
  }

  return '';
};

