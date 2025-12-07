'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './AppHeader.module.css';

export default function AppHeader({ pages = [], initialPage, onChange }) {
    const [activePage, setActivePage] = useState(
        initialPage ?? (pages[0]?.id || '')
    );

    return (
        <header>
            <div className={styles.brandBar}>
                <h1 className={styles.brand}>SPARK</h1>
                {/* <img src="/spark-logo.svg" className={styles.brand} /> */}
            </div>

            <div
                className={styles.tabSection}
                style={{
                    '--num-pages': pages.length,
                    '--active-index': pages.findIndex(
                        (p) => p.id === activePage
                    ),
                }}
            >
                <div className={styles.tabSectionRow}>
                    {pages.map((p) => {
                        const isActive = p.id === activePage;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                className={styles.tab}
                                onClick={() => {
                                    setActivePage(p.id);
                                    onChange?.(p.id);
                                }}
                            >
                                <p
                                    className={`${styles.tabText} ${
                                        isActive ? styles.tabTextActive : ''
                                    }`}
                                >
                                    {p.name}
                                </p>
                            </button>
                        );
                    })}
                </div>
                <div className={styles.tabUnderlineContainer}>
                    <div className={styles.tabUnderline}></div>
                </div>
            </div>
        </header>
    );
}
