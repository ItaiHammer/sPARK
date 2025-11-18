'use client';

import { useState, useEffect } from 'react';

export default function SimpleForecastPage({ params }) {
    const [time, setTime] = useState('12:00');
    const [date, setDate] = useState('2025-11-17');

    // location information
    const [locationId, setLocationId] = useState(
        (params.location_id || 'sjsu').toLowerCase()
    );
    const [garages, setGarages] = useState([]);

    useEffect(() => {
        async function load() {
            try {
                // get all lots for this location
                const lotsRes = await fetch(
                    `/api/locations/${locationId}/lots`
                );
                const lotsJson = await lotsRes.json();
                const lots = lotsJson.data || [];

                // for each lot, get the forecast at the chosen time
                const results = [];
                for (const lot of lots) {
                    const fRes = await fetch(
                        `/api/forecast/point?location_id=${locationId}&lot_id=${lot.lot_id}&time=${time}&date=${date}`
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
            <h1>Forecasting Web App - {locationId.toUpperCase()}</h1>

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
                </label>
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
