import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
    latitude: number;
    longitude: number;
    address?: string;
    locationHistory?: Array<{ latitude: number; longitude: number; address?: string }>;
}

const Map: React.FC<MapProps> = ({ latitude, longitude, address, locationHistory = [] }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);

    useEffect(() => {
        if (!mapContainer.current) return;

        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example';
        mapboxgl.accessToken = mapboxToken;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [longitude, latitude],
            zoom: locationHistory.length > 1 ? 14 : 15
        });

        // Add markers for all locations in history
        const allLocations = locationHistory.length > 0 ? locationHistory : [{ latitude, longitude, address }];

        allLocations.forEach((loc, index) => {
            const isCurrentLocation = index === allLocations.length - 1;
            const markerColor = isCurrentLocation ? '#ef4444' : '#6b7280'; // Red for current, gray for history

            // Create and add marker
            new mapboxgl.Marker({ color: markerColor })
                .setLngLat([loc.longitude, loc.latitude])
                .addTo(map.current!);

            // Add popup with address and timestamp info
            const popupContent = isCurrentLocation
                ? `<strong>Current Location:</strong><br>${loc.address || `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`}`
                : `<strong>Previous Location ${index + 1}:</strong><br>${loc.address || `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`}`;

            new mapboxgl.Popup({ offset: 25 })
                .setLngLat([loc.longitude, loc.latitude])
                .setHTML(popupContent)
                .addTo(map.current!);
        });

        // Draw path if there are multiple locations
        if (allLocations.length > 1) {
            const coordinates = allLocations.map(loc => [loc.longitude, loc.latitude]);

            map.current.on('load', () => {
                map.current!.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: coordinates
                        }
                    }
                });

                map.current!.addLayer({
                    id: 'route',
                    type: 'line',
                    source: 'route',
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': '#3b82f6',
                        'line-width': 3,
                        'line-opacity': 0.7
                    }
                });
            });
        }

        return () => {
            if (map.current) {
                map.current.remove();
            }
        };
    }, [latitude, longitude, address, locationHistory]);

    return (
        <div className="relative w-full">
            <div ref={mapContainer} className="h-64 sm:h-80 md:h-96 lg:h-[28rem] xl:h-[32rem] w-full rounded-lg" />
            {!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-black px-3 py-1 rounded text-xs sm:text-sm z-10">
                    ⚠️ Add Mapbox token to .env.local
                </div>
            )}
        </div>
    );
};

export default Map;