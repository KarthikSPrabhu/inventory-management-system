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
 * Configurable physical mapping from Location Code (or logical location)
 * to Physical Drawer Number (1 to 6).
 * 
 * Edit this map to set exact physical drawer assignments for specific codes.
 */
export const physicalDrawerMap = {
  "A319": 3,
  "A210": 2,
  "A112": 1,
};

/**
 * Resolves location code or logical box to physical drawer (1..6).
 * Returns 0 if closed/unmapped.
 */
export const getPhysicalDrawerNumber = (location) => {
  if (!location) return 0;
  
  const code = location.code ? String(location.code).toUpperCase().trim() : '';
  if (code && physicalDrawerMap[code] !== undefined) {
    return physicalDrawerMap[code];
  }
  
  // Fallback for unmapped codes: map box number into 1..6 range
  const boxNum = Number(location.box);
  if (!isNaN(boxNum) && boxNum > 0) {
    return ((boxNum - 1) % 6) + 1;
  }
  
  return 0;
};
