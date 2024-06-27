export const intersectionType = Object.freeze({
  noIntersection : 0,
  LxL : 1,
  LxS : 2,
  SxL : 3,
  SxS : 4,
  LxB : 5,
  BxL : 6,
  SxB : 7,
  BxS : 8,
  BxB : 9,
  siblings : 10,
  exterior : 11,
});


export function intersectionTypeToString(it) {
      switch (it) {
        case intersectionType.LxL:      return "LxL";
        case intersectionType.LxS:      return "LxS";
        case intersectionType.LxB:      return "LxB";
        case intersectionType.SxL:      return "SxL";
        case intersectionType.SxS:      return "SxS";
        case intersectionType.SxB:      return "SxB";
        case intersectionType.BxL:      return "BxL";
        case intersectionType.BxS:      return "BxS";
        case intersectionType.BxB:      return "BxB";
        case intersectionType.siblings: return "BRA";
        case intersectionType.exterior: return "EXT";
        default:       return "UNK";
    }
}


