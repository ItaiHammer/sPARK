/**
 * Get occupancy color based on percentage
 * Red: >= 95%
 * Orange: >= 75%
 * Green: < 75%
 */
export function getOccupancyColor(percentage) {
  if (percentage >= 95) {
    return "var(--occupancy-red, #d00000)";
  } else if (percentage >= 75) {
    return "var(--occupancy-orange, #ff8800)";
  } else {
    return "var(--occupancy-green, #009133)";
  }
}

/**
 * Get occupancy status text based on percentage
 */
export function getOccupancyStatus(percentage) {
  if (percentage >= 95) {
    return "busy";
  } else if (percentage >= 75) {
    return "a little busy";
  } else if (percentage >= 50) {
    return "moderate";
  } else {
    return "not busy";
  }
}
