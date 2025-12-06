'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DateTime } from 'luxon';

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
        </main>
    );
}
