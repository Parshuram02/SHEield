const axios = require('axios');
const config = require('../config');

class PlacesController {
    constructor() {
        this.googleMapsApiKey = config.googleMaps.apiKey;
        this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    }

    /**
     * Get nearby places using Google Places API
     */
    async getNearbyPlaces(req, res) {
        try {
            const { lat, lng, radius = 2000, type } = req.body;

            if (!lat || !lng) {
                return res.status(400).json({
                    success: false,
                    error: 'Latitude and longitude are required'
                });
            }

            if (!type) {
                return res.status(400).json({
                    success: false,
                    error: 'Place type is required'
                });
            }

            // Validate place types
            const validTypes = [
                'police', 'hospital', 'fire_station', 'pharmacy', 
                'convenience_store', 'gas_station', 'bank', 'post_office'
            ];

            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid place type'
                });
            }

            // Make request to Google Places API
            const response = await axios.get(`${this.baseUrl}/nearbysearch/json`, {
                params: {
                    location: `${lat},${lng}`,
                    radius: radius,
                    type: type,
                    key: this.googleMapsApiKey,
                    rankby: 'distance'
                }
            });

            if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
                console.error('Google Places API error:', response.data);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch places from Google API'
                });
            }

            const places = response.data.results || [];

            // Enhance places with additional data
            const enhancedPlaces = await this.enhancePlacesData(places, lat, lng);

            res.json({
                success: true,
                places: enhancedPlaces,
                count: enhancedPlaces.length,
                searchParams: {
                    lat,
                    lng,
                    radius,
                    type
                }
            });

        } catch (error) {
            console.error('Error fetching nearby places:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Get place details by place_id
     */
    async getPlaceDetails(req, res) {
        try {
            const { placeId } = req.params;

            if (!placeId) {
                return res.status(400).json({
                    success: false,
                    error: 'Place ID is required'
                });
            }

            const response = await axios.get(`${this.baseUrl}/details/json`, {
                params: {
                    place_id: placeId,
                    key: this.googleMapsApiKey,
                    fields: 'name,formatted_address,formatted_phone_number,opening_hours,rating,user_ratings_total,website,geometry'
                }
            });

            if (response.data.status !== 'OK') {
                console.error('Google Places Details API error:', response.data);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch place details from Google API'
                });
            }

            res.json({
                success: true,
                place: response.data.result
            });

        } catch (error) {
            console.error('Error fetching place details:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Get directions between two points
     */
    async getDirections(req, res) {
        try {
            const { origin, destination, mode = 'driving' } = req.body;

            if (!origin || !destination) {
                return res.status(400).json({
                    success: false,
                    error: 'Origin and destination are required'
                });
            }

            const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
                params: {
                    origin,
                    destination,
                    mode,
                    key: this.googleMapsApiKey
                }
            });

            if (response.data.status !== 'OK') {
                console.error('Google Directions API error:', response.data);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch directions from Google API'
                });
            }

            res.json({
                success: true,
                directions: response.data
            });

        } catch (error) {
            console.error('Error fetching directions:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Get emergency services in an area
     */
    async getEmergencyServices(req, res) {
        try {
            const { lat, lng, radius = 5000 } = req.body;

            if (!lat || !lng) {
                return res.status(400).json({
                    success: false,
                    error: 'Latitude and longitude are required'
                });
            }

            // Define emergency service types
            const emergencyTypes = ['police', 'hospital', 'fire_station'];
            const allPlaces = [];

            // Fetch places for each emergency service type
            for (const type of emergencyTypes) {
                try {
                    const response = await axios.get(`${this.baseUrl}/nearbysearch/json`, {
                        params: {
                            location: `${lat},${lng}`,
                            radius: radius,
                            type: type,
                            key: this.googleMapsApiKey,
                            rankby: 'distance'
                        }
                    });

                    if (response.data.status === 'OK') {
                        allPlaces.push(...response.data.results);
                    }
                } catch (error) {
                    console.error(`Error fetching ${type} places:`, error);
                }
            }

            // Remove duplicates and sort by distance
            const uniquePlaces = this.removeDuplicatePlaces(allPlaces);
            const enhancedPlaces = await this.enhancePlacesData(uniquePlaces, lat, lng);

            // Group by type
            const groupedPlaces = this.groupPlacesByType(enhancedPlaces);

            res.json({
                success: true,
                places: enhancedPlaces,
                grouped: groupedPlaces,
                count: enhancedPlaces.length,
                searchParams: {
                    lat,
                    lng,
                    radius
                }
            });

        } catch (error) {
            console.error('Error fetching emergency services:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Enhance places data with additional information
     */
    async enhancePlacesData(places, userLat, userLng) {
        return places.map(place => {
            // Calculate distance from user
            const distance = this.calculateDistance(
                userLat, userLng,
                place.geometry.location.lat,
                place.geometry.location.lng
            );

            // Determine if place is open 24/7 (for convenience stores)
            const is24Hour = this.is24HourPlace(place);

            return {
                ...place,
                distance: Math.round(distance),
                is24Hour,
                emergencyPriority: this.getEmergencyPriority(place.types)
            };
        }).sort((a, b) => a.distance - b.distance);
    }

    /**
     * Calculate distance between two points using Haversine formula
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in kilometers
        return distance * 1000; // Convert to meters
    }

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    /**
     * Check if a place is likely to be 24/7
     */
    is24HourPlace(place) {
        const types = place.types || [];
        return types.includes('convenience_store') || 
               types.includes('gas_station') ||
               (place.name && place.name.toLowerCase().includes('24'));
    }

    /**
     * Get emergency priority for a place
     */
    getEmergencyPriority(types) {
        if (types.includes('police')) return 1;
        if (types.includes('hospital')) return 2;
        if (types.includes('fire_station')) return 3;
        if (types.includes('pharmacy')) return 4;
        return 5;
    }

    /**
     * Remove duplicate places based on place_id
     */
    removeDuplicatePlaces(places) {
        const seen = new Set();
        return places.filter(place => {
            if (seen.has(place.place_id)) {
                return false;
            }
            seen.add(place.place_id);
            return true;
        });
    }

    /**
     * Group places by their primary type
     */
    groupPlacesByType(places) {
        const grouped = {
            police: [],
            hospital: [],
            fire_station: [],
            pharmacy: [],
            convenience_store: [],
            other: []
        };

        places.forEach(place => {
            const types = place.types || [];
            if (types.includes('police')) {
                grouped.police.push(place);
            } else if (types.includes('hospital')) {
                grouped.hospital.push(place);
            } else if (types.includes('fire_station')) {
                grouped.fire_station.push(place);
            } else if (types.includes('pharmacy')) {
                grouped.pharmacy.push(place);
            } else if (types.includes('convenience_store')) {
                grouped.convenience_store.push(place);
            } else {
                grouped.other.push(place);
            }
        });

        return grouped;
    }

    /**
     * Health check for Places API
     */
    async healthCheck(req, res) {
        try {
            // Test with a simple nearby search
            const response = await axios.get(`${this.baseUrl}/nearbysearch/json`, {
                params: {
                    location: '40.7589,-73.9851', // Times Square, NYC
                    radius: 1000,
                    type: 'police',
                    key: this.googleMapsApiKey
                }
            });

            res.json({
                success: true,
                status: 'healthy',
                googleApiStatus: response.data.status,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Places API health check failed:', error);
            res.status(500).json({
                success: false,
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = new PlacesController();





