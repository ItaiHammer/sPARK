'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// components
import AppHeader from '../../components/AppHeader.jsx';
import StatusViewPage from '../../pages/StatusViewPage.jsx';

function ArrivalPlaceholder() {
    return (
        <div>
            <h3>Plan Your Arrival</h3>
            <p>Arrival planning UI will go here.</p>
        </div>
    );
}

export default function SimpleForecastPage() {
    const pages = [
        { id: 'status', name: 'Status View', component: StatusViewPage },
        {
            id: 'arrival',
            name: 'Plan Your Arrival',
            component: ArrivalPlaceholder,
        },
    ];

    const [activePage, setActivePage] = useState(pages[0].id);

    const active = pages.find((p) => p.id === activePage) || pages[0];

    return (
        <main>
            <AppHeader
                locationName="SJSU"
                pages={pages}
                onChange={setActivePage}
                initialPage={activePage}
            />

            <div>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={active.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                    >
                        {active.component ? <active.component /> : null}
                    </motion.div>
                </AnimatePresence>
            </div>
        </main>
    );
}
