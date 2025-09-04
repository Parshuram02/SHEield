import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { 
    MapPin, 
    Navigation, 
    Phone, 
    Clock, 
    Star, 
    AlertTriangle,
    CheckCircle,
    Loader2,
    Crosshair,
    Building2,
    Heart,
    Shield,
    Store,
    Car
} from 'lucide-react';

interface Place {
    place_id: string;
    name: string;
    vicinity: string;
    rating?: number;
    user_ratings_total?: number;
    opening_hours?: {
        open_now: boolean;
    };
    types: string[];
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    distance?: number;
    duration?: number;
}

interface Location {
    lat: number;
    lng: number;
    accuracy?: number;
}

interface SafePlacesProps {
    onLocationSelect?: (place: Place) => void;
    emergencyMode?: boolean;
}

const SafePlaces: React.FC<SafePlacesProps> = ({ onLocationSelect, emergencyMode = false }) => {
    const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
    const [places, setPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(false);
    const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchRadius, setSearchRadius] = useState(2000); // 2km default
    const [error, setError] = useState<string | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);

    const placeCategories = [
        { value: 'all', label: 'All Safe Places', icon: <Shield className="w-4 h-4" /> },
        { value: 'police', label: 'Police Stations', icon: <Shield className="w-4 h-4" /> },
        { value: 'hospital', label: 'Hospitals', icon: <Heart className="w-4 h-4" /> },
        { value: 'fire_station', label: 'Fire Stations', icon: <Building2 className="w-4 h-4" /> },
        { value: 'pharmacy', label: 'Pharmacies', icon: <Heart className="w-4 h-4" /> },
        { value: 'convenience_store', label: '24-Hour Stores', icon: <Store className="w-4 h-4" /> }
    ];

    // Load Google Maps API
    useEffect(() => {
        const loadGoogleMaps = () => {
            if (window.google && window.google.maps) {
                setMapLoaded(true);
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => setMapLoaded(true);
            script.onerror = () => setError('Failed to load Google Maps');
            document.head.appendChild(script);
        };

        if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
            loadGoogleMaps();
        } else {
            setError('Google Maps API key not configured');
        }
    }, []);

    // Initialize map when API is loaded
    useEffect(() => {
        if (mapLoaded && mapRef.current && currentLocation) {
            const map = new google.maps.Map(mapRef.current, {
                center: { lat: currentLocation.lat, lng: currentLocation.lng },
                zoom: 14,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                styles: emergencyMode ? getEmergencyMapStyle() : undefined
            });

            // Add current location marker
            new google.maps.Marker({
                position: { lat: currentLocation.lat, lng: currentLocation.lng },
                map,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
                            <circle cx="12" cy="12" r="3" fill="white"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(24, 24),
                    anchor: new google.maps.Point(12, 12)
                },
                title: 'Your Location'
            });

            googleMapRef.current = map;
        }
    }, [mapLoaded, currentLocation, emergencyMode]);

    const getEmergencyMapStyle = () => {
        return [
            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
            {
                featureType: 'administrative.locality',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#d59563' }]
            },
            {
                featureType: 'poi',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#d59563' }]
            },
            {
                featureType: 'poi.park',
                elementType: 'geometry',
                stylers: [{ color: '#263c3f' }]
            },
            {
                featureType: 'poi.park',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#6b9a76' }]
            },
            {
                featureType: 'road',
                elementType: 'geometry',
                stylers: [{ color: '#38414e' }]
            },
            {
                featureType: 'road',
                elementType: 'geometry.stroke',
                stylers: [{ color: '#212a37' }]
            },
            {
                featureType: 'road',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#9ca5b3' }]
            },
            {
                featureType: 'road.highway',
                elementType: 'geometry',
                stylers: [{ color: '#746855' }]
            },
            {
                featureType: 'road.highway',
                elementType: 'geometry.stroke',
                stylers: [{ color: '#1f2835' }]
            },
            {
                featureType: 'road.highway',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#f3d19c' }]
            },
            {
                featureType: 'transit',
                elementType: 'geometry',
                stylers: [{ color: '#2f3948' }]
            },
            {
                featureType: 'transit.station',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#d59563' }]
            },
            {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#17263c' }]
            },
            {
                featureType: 'water',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#515c6d' }]
            },
            {
                featureType: 'water',
                elementType: 'labels.text.stroke',
                stylers: [{ color: '#17263c' }]
            }
        ];
    };

    const requestLocationPermission = async () => {
        try {
            if (!navigator.geolocation) {
                setError('Geolocation is not supported by this browser');
                return;
            }

            setLoading(true);
            setError(null);

            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });

            const location: Location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };

            setCurrentLocation(location);
            setLocationPermission('granted');
            await fetchNearbyPlaces(location);
        } catch (err: any) {
            console.error('Location error:', err);
            if (err.code === 1) {
                setError('Location access denied. Please enable location permissions.');
                setLocationPermission('denied');
            } else if (err.code === 2) {
                setError('Location unavailable. Please check your GPS settings.');
            } else if (err.code === 3) {
                setError('Location request timed out. Please try again.');
            } else {
                setError('Failed to get location. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchNearbyPlaces = async (location: Location) => {
        try {
            setLoading(true);
            setError(null);

            const categories = selectedCategory === 'all' 
                ? ['police', 'hospital', 'fire_station', 'pharmacy', 'convenience_store']
                : [selectedCategory];

            const allPlaces: Place[] = [];

            for (const category of categories) {
                const response = await fetch('/api/places/nearby', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': 'your-secret-key' // This should come from your auth system
                    },
                    body: JSON.stringify({
                        lat: location.lat,
                        lng: location.lng,
                        radius: searchRadius,
                        type: category
                    })
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch ${category} places`);
                }

                const data = await response.json();
                allPlaces.push(...data.places);
            }

            // Remove duplicates and sort by distance
            const uniquePlaces = allPlaces.filter((place, index, self) => 
                index === self.findIndex(p => p.place_id === place.place_id)
            );

            setPlaces(uniquePlaces);
            addMarkersToMap(uniquePlaces);
        } catch (err: any) {
            console.error('Error fetching places:', err);
            setError('Failed to fetch nearby places. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const addMarkersToMap = (places: Place[]) => {
        if (!googleMapRef.current) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        places.forEach((place, index) => {
            const marker = new google.maps.Marker({
                position: { lat: place.geometry.location.lat, lng: place.geometry.location.lng },
                map: googleMapRef.current,
                title: place.name,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" fill="#10B981" stroke="white" stroke-width="2"/>
                            <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${index + 1}</text>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(24, 24),
                    anchor: new google.maps.Point(12, 12)
                }
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 8px; max-width: 200px;">
                        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${place.name}</h3>
                        <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${place.vicinity}</p>
                        ${place.rating ? `<p style="margin: 0; font-size: 12px;">⭐ ${place.rating} (${place.user_ratings_total} reviews)</p>` : ''}
                        ${place.opening_hours ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: ${place.opening_hours.open_now ? '#10B981' : '#EF4444'};">${place.opening_hours.open_now ? 'Open now' : 'Closed'}</p>` : ''}
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(googleMapRef.current, marker);
            });

            markersRef.current.push(marker);
        });
    };

    const getDirections = (place: Place) => {
        if (!currentLocation) return;
        
        const origin = `${currentLocation.lat},${currentLocation.lng}`;
        const destination = `${place.geometry.location.lat},${place.geometry.location.lng}`;
        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
        window.open(url, '_blank');
    };

    const getCategoryIcon = (types: string[]) => {
        if (types.includes('police')) return <Shield className="w-4 h-4 text-blue-500" />;
        if (types.includes('hospital')) return <Heart className="w-4 h-4 text-red-500" />;
        if (types.includes('fire_station')) return <Building2 className="w-4 h-4 text-orange-500" />;
        if (types.includes('pharmacy')) return <Heart className="w-4 h-4 text-green-500" />;
        if (types.includes('convenience_store')) return <Store className="w-4 h-4 text-purple-500" />;
        return <MapPin className="w-4 h-4 text-gray-500" />;
    };

    const getCategoryLabel = (types: string[]) => {
        if (types.includes('police')) return 'Police Station';
        if (types.includes('hospital')) return 'Hospital';
        if (types.includes('fire_station')) return 'Fire Station';
        if (types.includes('pharmacy')) return 'Pharmacy';
        if (types.includes('convenience_store')) return '24-Hour Store';
        return 'Safe Place';
    };

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        if (currentLocation) {
            fetchNearbyPlaces(currentLocation);
        }
    };

    const handleRadiusChange = (radius: string) => {
        setSearchRadius(parseInt(radius));
        if (currentLocation) {
            fetchNearbyPlaces(currentLocation);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {emergencyMode ? 'Emergency Safe Places' : 'Find Safe Places'}
                    </h1>
                    <p className="text-gray-600">
                        Locate nearby emergency services and safe locations
                    </p>
                </div>
                {emergencyMode && (
                    <Badge variant="destructive" className="text-sm">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Emergency Mode
                    </Badge>
                )}
            </div>

            {/* Location Permission */}
            {locationPermission === 'prompt' && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <Crosshair className="w-12 h-12 mx-auto text-blue-500" />
                            <div>
                                <h3 className="text-lg font-semibold">Enable Location Access</h3>
                                <p className="text-gray-600">
                                    We need your location to find the nearest safe places
                                </p>
                            </div>
                            <Button onClick={requestLocationPermission} disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Getting Location...
                                    </>
                                ) : (
                                    <>
                                        <MapPin className="w-4 h-4 mr-2" />
                                        Enable Location
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Location Denied */}
            {locationPermission === 'denied' && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Location access is required to find safe places. Please enable location permissions in your browser settings.
                    </AlertDescription>
                </Alert>
            )}

            {/* Error Display */}
            {error && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Controls */}
            {currentLocation && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="category">Category</Label>
                                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {placeCategories.map((category) => (
                                            <SelectItem key={category.value} value={category.value}>
                                                <div className="flex items-center">
                                                    {category.icon}
                                                    <span className="ml-2">{category.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="radius">Search Radius</Label>
                                <Select value={searchRadius.toString()} onValueChange={handleRadiusChange}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1000">1 km</SelectItem>
                                        <SelectItem value="2000">2 km</SelectItem>
                                        <SelectItem value="5000">5 km</SelectItem>
                                        <SelectItem value="10000">10 km</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button 
                                    onClick={() => fetchNearbyPlaces(currentLocation)}
                                    disabled={loading}
                                    variant="outline"
                                    className="w-full"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Searching...
                                        </>
                                    ) : (
                                        <>
                                            <Crosshair className="w-4 h-4 mr-2" />
                                            Refresh
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Map and Places */}
            {currentLocation && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Map */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Map View</CardTitle>
                            <CardDescription>
                                Your location and nearby safe places
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div 
                                ref={mapRef} 
                                className="w-full h-96 rounded-lg border"
                                style={{ minHeight: '384px' }}
                            />
                        </CardContent>
                    </Card>

                    {/* Places List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Safe Places</CardTitle>
                            <CardDescription>
                                {places.length} places found within {searchRadius / 1000}km
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {places.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        {loading ? (
                                            <div className="flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                                Searching for places...
                                            </div>
                                        ) : (
                                            'No safe places found in this area'
                                        )}
                                    </div>
                                ) : (
                                    places.map((place, index) => (
                                        <div key={place.place_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start space-x-3 flex-1">
                                                    <div className="flex-shrink-0">
                                                        {getCategoryIcon(place.types)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            <h3 className="font-semibold text-gray-900 truncate">
                                                                {place.name}
                                                            </h3>
                                                            <Badge variant="outline" className="text-xs">
                                                                {getCategoryLabel(place.types)}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-2">{place.vicinity}</p>
                                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                            {place.rating && (
                                                                <div className="flex items-center">
                                                                    <Star className="w-3 h-3 mr-1" />
                                                                    {place.rating} ({place.user_ratings_total})
                                                                </div>
                                                            )}
                                                            {place.opening_hours && (
                                                                <div className="flex items-center">
                                                                    <Clock className="w-3 h-3 mr-1" />
                                                                    {place.opening_hours.open_now ? 'Open now' : 'Closed'}
                                                                </div>
                                                            )}
                                                            {place.distance && (
                                                                <div className="flex items-center">
                                                                    <MapPin className="w-3 h-3 mr-1" />
                                                                    {(place.distance / 1000).toFixed(1)}km
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col space-y-2 ml-4">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => getDirections(place)}
                                                    >
                                                        <Navigation className="w-4 h-4 mr-2" />
                                                        Directions
                                                    </Button>
                                                    {onLocationSelect && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => onLocationSelect(place)}
                                                        >
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                            Select
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default SafePlaces;


