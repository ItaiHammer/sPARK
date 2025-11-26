/**
 * Check if a given coordinate is withint he polygon geofence
 * @param {number} userLat 
 * @param {number} userLon 
 * @param {Array < {lat: number, lon: number}} polygon 
 * @returns {boolean} - Is user inside polygon geofence
 */
export const isWithinGeoFence = (userLat, userLon, polygon) => {
    let inside = false;

    for(let i = 0, j = polygon.length - 1; i< polygon.length; j = i++) {
        
        const xi = polygon[i].lon, yi = polygon[i].lat;
        const xj = polygon[j].lon, yj = polygon[j].lat;
        
        //check if the user coords are within the polygon
        const intersect = ((yi > userLat) !== (yj > userLat)) && (userLon < (xj - xi) * (userLat - yi) / (yj - yi) + xi);
        
        
        if (intersect) inside = !inside;

      }


      return inside;
};
    
