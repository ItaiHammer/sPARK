'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to handle map bounds updates
function MapBoundsUpdater({ polygon, userLocation }) {
  const map = useMap();

  useEffect(() => {
    if (!polygon || polygon.length === 0) return;

    const bounds = L.latLngBounds(polygon.map(p => [p.lat, p.lon]));

    // If user location is available, include it in bounds
    if (userLocation) {
      bounds.extend([userLocation.latitude, userLocation.longitude]);
    }

    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, polygon, userLocation]);

  return null;
}

export default function MapVisualization({
  polygon = [],
  userLocation = null,
  isWithinGeofence = false
}) {
  // Convert polygon format from {lat, lon} to [lat, lon] for react-leaflet
  const polygonPositions = useMemo(() => {
    return polygon.map(p => [p.lat, p.lon]);
  }, [polygon]);

  // Calculate center of polygon for initial map center
  const center = useMemo(() => {
    if (!polygon || polygon.length === 0) {
      return [37.3352, -121.8811]; // Default to SJSU coordinates
    }
    const avgLat = polygon.reduce((sum, p) => sum + p.lat, 0) / polygon.length;
    const avgLon = polygon.reduce((sum, p) => sum + p.lon, 0) / polygon.length;
    return [avgLat, avgLon];
  }, [polygon]);

  // Polygon styling based on whether user is inside or outside
  const polygonColor = isWithinGeofence ? '#10b981' : '#ef4444'; // green if inside, red if outside
  const polygonOptions = {
    color: polygonColor,
    fillColor: polygonColor,
    fillOpacity: 0.2,
    weight: 3,
  };

  // User marker position
  const userPosition = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : null;

  return (
    <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-gray-300">
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render the geofence polygon */}
        {polygonPositions.length > 0 && (
          <Polygon
            positions={polygonPositions}
            pathOptions={polygonOptions}
          />
        )}

        {/* Render user location marker and accuracy circle */}
        {userPosition && (
          <>
            <Marker position={userPosition} />
            {userLocation.accuracy && (
              <Circle
                center={userPosition}
                radius={userLocation.accuracy}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1,
                  weight: 2,
                }}
              />
            )}
          </>
        )}

        {/* Auto-adjust map bounds */}
        <MapBoundsUpdater polygon={polygon} userLocation={userLocation} />
      </MapContainer>
    </div>
  );
}
