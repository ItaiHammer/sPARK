'use client';
import React from 'react';
import { motion } from 'framer-motion';

// CSS
import styles from './GarageCard.module.css';

// Contexts
import { useUI } from '@/contexts/UI/UI.context';

export default function GarageCard({ order }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{
                opacity: 1,
                y: 0,
                transition: {
                    duration: 0.6,
                    delay: (order + 1) * 0.2,
                },
            }}
            className={styles.GarageCard}
        >
            <div className={styles.GarageCardHeader}>
                <div className={styles.GarageCardHeaderTitleContainer}>
                    <div className={styles.GarageCardHeaderTitleContainerLeft}>
                        <motion.div
                            animate={{
                                '--glow-blur': ['4px', '10px', '4px'],
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 3,
                                ease: 'easeInOut',
                            }}
                            className={styles.GarageCardHeaderLiveIndicator}
                        />
                        <h3 className={styles.GarageCardHeaderTitle}>
                            South Campus Garage
                        </h3>
                    </div>

                    <h3 className={styles.GarageCardHeaderOccupancyText}>
                        87%
                    </h3>
                </div>

                <div className={styles.GarageCardHeaderOccupancyContainer}>
                    <div
                        className={
                            styles.GarageCardHeaderOccupancyLabelContainer
                        }
                    >
                        <img
                            src="/icons/car_icon.svg"
                            className={
                                styles.GarageCardHeaderOccupancyLabelContainerIcon
                            }
                        />
                        <div className={styles.GarageCardHeaderOccupancyLabel}>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                }}
                            >
                                50/
                                <p
                                    className={
                                        styles.GarageCardHeaderOccupancyLabelDenominator
                                    }
                                >
                                    4000
                                </p>
                            </div>
                            <p
                                className={
                                    styles.GarageCardHeaderOccupancyLabelText
                                }
                            >
                                spots available
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
