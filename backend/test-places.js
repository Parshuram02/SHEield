require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000';
const API_KEY = process.env.API_KEY || 'your-secret-key';

async function testPlacesAPI() {
    console.log('🧪 Testing Places API...\n');

    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await axios.get(`${API_BASE_URL}/api/places/health`);
        console.log('✅ Health Check:', healthResponse.data);
        console.log('');

        // Test 2: Nearby Places Search
        console.log('2️⃣ Testing Nearby Places Search...');
        const nearbyResponse = await axios.post(`${API_BASE_URL}/api/places/nearby`, {
            lat: 40.7589,
            lng: -73.9851,
            radius: 2000,
            type: 'police'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            }
        });
        console.log('✅ Nearby Places:', {
            success: nearbyResponse.data.success,
            count: nearbyResponse.data.count,
            places: nearbyResponse.data.places.slice(0, 3).map(p => ({
                name: p.name,
                vicinity: p.vicinity,
                distance: p.distance,
                types: p.types
            }))
        });
        console.log('');

        // Test 3: Emergency Services
        console.log('3️⃣ Testing Emergency Services...');
        const emergencyResponse = await axios.post(`${API_BASE_URL}/api/places/emergency`, {
            lat: 40.7589,
            lng: -73.9851,
            radius: 5000
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            }
        });
        console.log('✅ Emergency Services:', {
            success: emergencyResponse.data.success,
            count: emergencyResponse.data.count,
            grouped: Object.keys(emergencyResponse.data.grouped).reduce((acc, key) => {
                acc[key] = emergencyResponse.data.grouped[key].length;
                return acc;
            }, {})
        });
        console.log('');

        // Test 4: Place Details (if we have a place_id)
        if (nearbyResponse.data.places.length > 0) {
            console.log('4️⃣ Testing Place Details...');
            const placeId = nearbyResponse.data.places[0].place_id;
            const detailsResponse = await axios.get(`${API_BASE_URL}/api/places/details/${placeId}`, {
                headers: {
                    'x-api-key': API_KEY
                }
            });
            console.log('✅ Place Details:', {
                success: detailsResponse.data.success,
                place: {
                    name: detailsResponse.data.place.name,
                    address: detailsResponse.data.place.formatted_address,
                    phone: detailsResponse.data.place.formatted_phone_number
                }
            });
            console.log('');
        }

        // Test 5: Directions
        console.log('5️⃣ Testing Directions...');
        const directionsResponse = await axios.post(`${API_BASE_URL}/api/places/directions`, {
            origin: '40.7589,-73.9851',
            destination: '40.7505,-73.9934',
            mode: 'driving'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            }
        });
        console.log('✅ Directions:', {
            success: directionsResponse.data.success,
            routes: directionsResponse.data.directions.routes?.length || 0
        });
        console.log('');

        console.log('🎉 All Places API tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('💡 Make sure API_KEY is set in your .env file');
        }
        if (error.response?.status === 500) {
            console.log('💡 Check if Google Maps API key is configured');
        }
    }
}

// Test different place types
async function testAllPlaceTypes() {
    console.log('🔍 Testing All Place Types...\n');

    const placeTypes = ['police', 'hospital', 'fire_station', 'pharmacy', 'convenience_store'];
    const testLocation = { lat: 40.7589, lng: -73.9851, radius: 2000 };

    for (const type of placeTypes) {
        try {
            console.log(`Testing ${type}...`);
            const response = await axios.post(`${API_BASE_URL}/api/places/nearby`, {
                ...testLocation,
                type
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY
                }
            });

            console.log(`✅ ${type}: ${response.data.count} places found`);
            
            if (response.data.places.length > 0) {
                const firstPlace = response.data.places[0];
                console.log(`   📍 Nearest: ${firstPlace.name} (${(firstPlace.distance / 1000).toFixed(1)}km)`);
            }
        } catch (error) {
            console.log(`❌ ${type}: ${error.response?.data?.error || error.message}`);
        }
    }
    console.log('');
}

// Run tests
async function runAllTests() {
    await testPlacesAPI();
    await testAllPlaceTypes();
}

// Check if running directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { testPlacesAPI, testAllPlaceTypes };


