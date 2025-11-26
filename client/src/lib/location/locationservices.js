import { useEffect, useState } from "react";
/**
 * Location request function, takes in an interval arg for request frequency. Returns a location
 * object, will continue to update location object for every refresh
 * @param {Number} interval 
 * @returns Location object -> can be subscripted with ``.longitude`` or ``.latitude``
 */
export const useLocationTracking = (interval) => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);


    interval = interval * 1000

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by this browser.");
            return;
        }

        const options = {
            enableHighAccuracy: true,  // use GPS for most precise location
            timeout: 60000, //hold for up to 60 seconds -> this is crucial for background refresh
            maximumAge: 0 //no caching
        };


        const getLocation = () => {
            console.log("[INFO]: Requesting location update");
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log("[INFO]: Location updated", {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        timestamp: new Date(position.timestamp).toISOString()
                    });
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy, //show accuracy in meters
                        timestamp: position.timestamp
                    });
                },
                (err) => {
                    console.error("[ERROR]: Failed to get location", err.message);
                    setError(err.message);
                },
                options //pass the options object
            );
        };

        //get location on initial page load
        getLocation();

        //then get the location for interval
        const intervalId = setInterval(getLocation, interval);

        const seconds = interval / 1000

        console.log("[INFO]: Location tracking started - will update every " + seconds + " seconds");

        //clear on unmount -> YOU MUST UNMOUNT OR ELSE MEMORY LEAK
        return () => {
            clearInterval(intervalId);
            console.log("[INFO]: Location tracking stopped");
        };
    }, []);


    return { location, error };
};




