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
 * Resolves item location to physical storage drawer (1..6).
 * Items from Unit 1 -> Box 1, Unit 2 -> Box 2, Unit 3 -> Box 3, Unit 4 -> Box 4, Unit 5 -> Box 5, Unit 6 -> Box 6.
 */
export const getPhysicalDrawerNumber = (location) => {
  if (!location) return 0;
  
  // Storage Unit 1..6 maps directly to Physical Box 1..6 on the storage rack
  const unitNum = Number(location.storageUnit);
  if (!isNaN(unitNum) && unitNum > 0) {
    return ((unitNum - 1) % 6) + 1;
  }
  
  // Fallback to box number if storageUnit is omitted
  const boxNum = Number(location.box);
  if (!isNaN(boxNum) && boxNum > 0) {
    return ((boxNum - 1) % 6) + 1;
  }
  
  return 0;
};
