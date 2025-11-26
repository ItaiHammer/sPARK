'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DateTime } from 'luxon';
import { useLocationTracking } from '@/lib/location/locationservices';
import { isWithinGeoFence } from '@/lib/location/polygeofence';

export default function SimpleForecastPage() {
    const { location_id } = useParams();
    const [time, setTime] = useState(DateTime.now().toFormat('HH:mm'));
    const [date, setDate] = useState(DateTime.now().toISODate());

    // location information
    const [locationId, setLocationId] = useState(location_id.toLowerCase());
    const [locationName, setLocationName] = useState();
    const [garages, setGarages] = useState([]);

    const authHeaders = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-API-Key': `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_API_KEY}`,
        },
    };

    useEffect(() => {
        async function load() {
            try {
                // get location info
                const locationRes = await fetch(
                    `/api/locations/${locationId}`,
                    authHeaders
                );

                const locationJson = await locationRes.json();
                const location = locationJson.data || {};

                setLocationName(location.name || locationId.toUpperCase());

                // get all lots for this location
                const lotsRes = await fetch(
                    `/api/locations/${locationId}/lots`,
                    authHeaders
                );
                const lotsJson = await lotsRes.json();
                const lots = lotsJson.data || [];

                // for each lot, get the forecast at the chosen time
                const results = [];
                const combinedTime = DateTime.fromISO(`${date}T${time}`, {
                    zone: 'local',
                })
                    .toUTC()
                    .toISO();

                for (const lot of lots) {
                    const fRes = await fetch(
                        `/api/forecast/point?location_id=${locationId}&lot_id=${lot.lot_id}&time=${combinedTime}`,
                        authHeaders
                    );
                    const fJson = await fRes.json();
                    const point = fJson?.data?.point ?? 'N/A';
                    results.push(`${lot.name || lot.lot_id}: ${point}% full`);
                }

                setGarages(results);
            } catch (err) {
                setGarages([`Error loading forecasts: ${err.message}`]);
            }
        }

        load();
    }, [locationId, time, date]);


    //TESTING FOR PERMITER -> feel free to add parameters in devtesting
    const testPolygon = [
        { lat: 37.249033, lon: -121.809786 },  // Northwest corner
        { lat: 37.249138, lon: -121.809723 },  // Northeast corner
        { lat: 37.249081, lon: -121.809451 },  // Southeast corner
        { lat: 37.248889, lon: -121.809527 },  // Southwest corner
    ];

    // Use the location tracking hook - will update based on interval
    //locationtracking is a hook
    const { location, error: locationError } = useLocationTracking(10);



    return (
        <main style={{ padding: 20 }}>
            <h1>Forecasting Web App - {locationName}</h1>

            <div style={{ marginBottom: 10 }}>
                <label>
                    Time:{' '}
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                    />
                </label>{' '}
                <label>
                    Date:{' '}
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </label>{' '}
                <label>
                    Location:{' '}
                    <input
                        type="text"
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                    />
                </label>
            </div>

            <h3>Results:</h3>
            <pre>
                {garages.length === 0
                    ? 'Loading...'
                    : garages.map((line, i) => <div key={i}>{line}</div>)}
            </pre>

                
            {/*
            functional testing space for location services component
             - Note location component requires client-side rendering (use-client)    
            */}

            <div className = "mt-4">
                {locationError && <p style={{color: 'red'}}>Location Error: {locationError}</p>}
                {location ? (
                    <>
                        <p>Your coords are {location.latitude}, {location.longitude}</p>

                        {location.accuracy && <p>Accuracy: ±{Math.round(location.accuracy)} meters</p>}

                        <p>Last updated: {new Date(location.timestamp).toLocaleTimeString()}</p>

                        <p>Within geofence: {String(isWithinGeoFence(location.latitude, location.longitude, testPolygon))}</p>
                    </>
                ) : (
                    <p>Loading location...</p>
                )}
            </div>


        </main>
    );
}
