const express = require('express');
const axios = require('axios');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings').transit_realtime; // GTFS Decoder
require('dotenv').config();
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(cors());

// Train Lines Data
const TRAINS = [
    { name: 'ACESr', url: process.env.ACESr },
    { name: 'BDFMSf', url: process.env.BDFMsf },
    { name: 'G', url: process.env.G },
    { name: 'JZ', url: process.env.JZ },
    { name: 'NQRW', url: process.env.NQRW },
    { name: 'L', url: process.env.L },
    { name: '1234567S', url: process.env['1234567S'] },
    { name: 'SIR', url: process.env.SIR }
];

// Route for Train Data
app.get('/all-train-data', async (req, res) => {
    console.log('✅ Received request for /all-train-data');
    const results = [];

    const fetchPromises = TRAINS.map(async (line) => {
        console.log(`🔎 Fetching data from: ${line.url}`);
        try {
            const response = await axios.get(line.url, { responseType: 'arraybuffer' });

            const feed = GtfsRealtimeBindings.FeedMessage.decode(response.data);

            console.log(`✅ Successfully decoded data for ${line.name}`);
            results.push({
                line: line.name,
                data: feed.entity
                    .map(entity => ({
                        tripId: entity.tripUpdate?.trip?.tripId || 'N/A',
                        routeId: entity.tripUpdate?.trip?.routeId || 'N/A',
                        arrivalTime: entity.tripUpdate?.stopTimeUpdate?.[0]?.arrival?.time?.low
                            ? new Date(entity.tripUpdate.stopTimeUpdate[0].arrival.time.low * 1000).toLocaleTimeString()
                            : 'N/A',
                        vehiclePosition: entity.vehicle?.position || {}
                    }))
                    .filter(entry => entry.tripId !== 'N/A' && entry.arrivalTime !== 'N/A')
            });
        } catch (error) {
            console.error(`❌ Error fetching data for ${line.name}: ${error.message}`);
            
            if (error.response) {
                console.error(`🔎 Status Code: ${error.response.status}`);
                console.error(`🔎 Error Data:`, error.response.data);
            } else if (error.request) {
                console.error(`❌ No response received for ${line.name}`);
            } else {
                console.error(`❌ Request Error:`, error.message);
            }

            results.push({ line: line.name, error: `Failed to fetch data for ${line.name}` });
        }
    });

    await Promise.all(fetchPromises);

    console.log('✅ Sending decoded data back to frontend:', results);
    res.json(results);
});

// Test Route for `.env` Confirmation
app.get('/test-env', (req, res) => {
    res.json({
        ACESr: process.env.ACESr,
        BDFMSf: process.env.BDFMsf,
        G: process.env.G,
        JZ: process.env.JZ,
        NQRW: process.env.NQRW,
        L: process.env.L,
        "1234567S": process.env['1234567S'],
        SIR: process.env.SIR
    });
});

// Default Route
app.get('/', (req, res) => {
    res.send('MTA Train Tracker Backend is Running!');
});

// Start the Server
app.listen(PORT, () => {
    console.log(`🚂 Server running on http://localhost:${PORT}`);
});


