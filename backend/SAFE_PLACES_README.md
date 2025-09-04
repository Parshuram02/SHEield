# Safe Places Feature Documentation

## Overview

The Safe Places feature helps users find nearby emergency services and safe locations during emergencies. It integrates with Google Places API to provide real-time location data, directions, and emergency service information.

## Features

### 🗺️ **Interactive Map**
- Real-time Google Maps integration
- Current location tracking
- Custom markers for different place types
- Emergency mode with dark theme
- Click-to-view place details

### 📍 **Location Services**
- Geolocation permission handling
- High-accuracy GPS positioning
- Fallback location options
- Location error handling

### 🏥 **Emergency Services Search**
- Police stations
- Hospitals
- Fire stations
- Pharmacies
- 24-hour convenience stores

### 🧭 **Smart Features**
- Distance calculation using Haversine formula
- Priority-based emergency service ranking
- Opening hours detection
- 24/7 place identification
- Duplicate removal and sorting

### 📱 **User Experience**
- Mobile-responsive design
- Emergency mode styling
- Loading states and error handling
- One-click directions to Google Maps
- Place selection for emergency contacts

## Architecture

### Frontend Components

#### `SafePlaces.tsx`
Main component handling:
- Google Maps API loading
- Geolocation requests
- Place search and filtering
- Map rendering and markers
- User interactions

#### Key Features:
```typescript
interface SafePlacesProps {
  onLocationSelect?: (place: Place) => void;
  emergencyMode?: boolean;
}
```

### Backend API

#### `PlacesController`
Handles all Google Places API interactions:
- Nearby place search
- Place details retrieval
- Directions calculation
- Emergency services grouping
- Distance calculations

#### API Endpoints:
- `POST /api/places/nearby` - Search nearby places
- `GET /api/places/details/:placeId` - Get place details
- `POST /api/places/directions` - Get directions
- `POST /api/places/emergency` - Get emergency services
- `GET /api/places/health` - Health check

## Configuration

### Environment Variables

#### Backend (.env)
```bash
# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Application
API_KEY=your_secret_key
```

#### Frontend (.env)
```bash
# Google Maps API (for client-side)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Google Maps API Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing

2. **Enable APIs**
   - Places API
   - Maps JavaScript API
   - Directions API
   - Geocoding API

3. **Create API Key**
   - Go to APIs & Services > Credentials
   - Create API Key
   - Restrict to your domain for security

4. **Set Restrictions**
   - HTTP referrers: `localhost:3000/*`, `yourdomain.com/*`
   - API restrictions: Enable only required APIs

## Usage

### Basic Implementation

```typescript
import SafePlaces from '@/components/SafePlaces';

function App() {
  return (
    <SafePlaces 
      onLocationSelect={(place) => {
        console.log('Selected:', place.name);
        // Handle place selection
      }}
      emergencyMode={false}
    />
  );
}
```

### Emergency Mode

```typescript
<SafePlaces 
  emergencyMode={true}
  onLocationSelect={(place) => {
    // Send to emergency contacts
    sendEmergencyAlert({
      type: 'safe_place_selected',
      place: place,
      location: currentLocation
    });
  }}
/>
```

### API Usage Examples

#### Search Nearby Places
```javascript
const response = await fetch('/api/places/nearby', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-secret-key'
  },
  body: JSON.stringify({
    lat: 40.7589,
    lng: -73.9851,
    radius: 2000,
    type: 'police'
  })
});
```

#### Get Emergency Services
```javascript
const response = await fetch('/api/places/emergency', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-secret-key'
  },
  body: JSON.stringify({
    lat: 40.7589,
    lng: -73.9851,
    radius: 5000
  })
});
```

## Data Models

### Place Object
```typescript
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
  is24Hour?: boolean;
  emergencyPriority?: number;
}
```

### Location Object
```typescript
interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}
```

## Emergency Priority System

Places are ranked by emergency priority:
1. **Police Stations** (Priority 1) - Immediate law enforcement
2. **Hospitals** (Priority 2) - Medical emergencies
3. **Fire Stations** (Priority 3) - Fire and rescue
4. **Pharmacies** (Priority 4) - Medical supplies
5. **24-Hour Stores** (Priority 5) - General safety

## Testing

### Run Test Script
```bash
cd backend
node test-places.js
```

### Test Coverage
- Health check endpoint
- Nearby places search
- Emergency services grouping
- Place details retrieval
- Directions calculation
- All place types validation

## Security Considerations

### API Key Protection
- Backend proxy to hide Google API key
- Domain restrictions on Google API key
- Rate limiting on API endpoints
- Authentication middleware

### Location Privacy
- User consent for geolocation
- Secure location data handling
- No persistent location storage
- Clear privacy policy

## Error Handling

### Common Issues
1. **Location Permission Denied**
   - User-friendly error message
   - Instructions to enable location
   - Fallback to manual location input

2. **Google Maps API Errors**
   - Graceful degradation
   - Error logging and monitoring
   - Fallback to list view

3. **Network Issues**
   - Retry mechanisms
   - Offline mode indicators
   - Cached place data

## Performance Optimization

### Frontend
- Lazy loading of Google Maps
- Debounced search requests
- Efficient marker management
- Image optimization for icons

### Backend
- Response caching
- Batch API requests
- Efficient distance calculations
- Database indexing

## Integration Points

### Emergency System
- Trigger safe places search on emergency
- Send selected place to contacts
- Include place in emergency evidence
- Emergency mode styling

### Evidence System
- Log place searches in evidence
- Store selected safe places
- Include place data in alerts
- Track user location history

## Future Enhancements

### Planned Features
- Offline place database
- Custom safe place marking
- Route optimization
- Real-time place status
- Integration with local emergency services
- Voice-guided directions
- Accessibility improvements

### Advanced Features
- Machine learning for place recommendations
- Predictive emergency routing
- Community-sourced safe places
- Integration with ride-sharing services
- Real-time traffic integration

## Troubleshooting

### Common Problems

#### Maps Not Loading
- Check Google Maps API key
- Verify API restrictions
- Check network connectivity
- Clear browser cache

#### Location Not Working
- Enable location permissions
- Check GPS settings
- Try different browsers
- Test on mobile device

#### API Errors
- Verify API key configuration
- Check rate limits
- Review error logs
- Test with health endpoint

## Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Run test scripts
4. Check Google Cloud Console
5. Review browser console errors

## License

This feature is part of the SHEield safety application and follows the same licensing terms.


