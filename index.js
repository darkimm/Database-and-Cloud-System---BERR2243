const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const port = 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;

async function connectToMongoDB() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("✅ Connected to MongoDB!");
        db = client.db("week4DB");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
    }
}
connectToMongoDB();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- API ROUTES ---

//---------------------------users---------------------------------//

app.post('/users', async (req, res) => {
    try {
        const result = await db.collection('users').insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ error: "Invalid user data" });
    }
});

app.post('/auth/login', async (req, res) => {
    const {email, password} = req.body;
    const user = await db.collection('users').findOne({email, password});

    if(!user) return res.status(400).json({error: 'Invalid Credentials'});
    res.status(200).json({message: 'login successful', userId: user._id});
});

app.post('/rides', async (req, res) => {
    const { customerId, pickupLocation, dropoffLocation, scheduledTime } = req.body;

    // Basic validation
    if (!customerId || !pickupLocation || !dropoffLocation) {
        return res.status(400).json({ error: 'Missing required fields: customerId, pickupLocation, dropoffLocation' });
    }

    const ride = {
        customerId: customerId,
        pickupLocation: pickupLocation,
        dropoffLocation: dropoffLocation,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : new Date(),
        status: 'pending',
        createdAt: new Date()
    };

    try {
        const result = await db.collection('rides').insertOne(ride);
        res.status(201).json({
            message: 'Ride booked successfully',
            rideId: result.insertedId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to book ride' });
    }
});

//----------------------End User------------------------//

//______________________Driver_________________________//

app.post('/drivers', async (req, res) => {
    try {
        const result = await db.collection('drivers').insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ error: "Invalid user data" });
    }
});

app.put('/drivers/:id/vehicle', async (req, res) => {
    try {
        const result = await db.collection('drivers').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { vehicle: req.body.vehicle } }
        );

        res.status(200).json({ updated: result.modifiedCount });
    } catch (err) {
        res.status(400).json({ error: "Failed to update vehicle details" });
    }
});

app.put('/rides/:id/complete', async (req, res) => {
    try {
        const result = await db.collection('rides').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: 'completed' } }
        );

        res.status(200).json({ updated: result.modifiedCount });
    } catch (err) {
        res.status(400).json({ error: "Failed to mark ride as completed" });
    }
});

//------------------------------End Drivers----------------------------//

//===============================ADMIN===============================//

app.post('/auth/admin-login', async (req, res) => {
    const {username, password} = req.body;
    const user = await db.collection('admin').findOne({username, password});

    if(!admin) return res.status(401).json({error: 'Invalid Credentials'});
    res.status(200).json({message: 'Admin login successful'});
});

app.put('/drivers/:id/status', async (req, res) => {
    const{ status } = req.body;
    if (!['approved','rejected'].includes(status)){
        return res.status(400).json({error: 'Invalid status'});
    }
    
    try {
        const result = await db.collection('rides').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: status } }
        );

        res.status(200).json({ updated: result.modifiedCount });
    } catch (err) {
        res.status(400).json({ error: "Failed to update driver status" });
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await db.collection('users').find().toArray();
        res.status(200).json(users);
    } catch (err) {
        res.status(404).json({ error: 'Failed to fetch users' });
    }
});

app.put('/users/:id', async (req, res) => {
    try {
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        res.status(200).json({ updated: result.modifiedCount });
    } catch (err) {
        res.status(400).json({ error: 'Failed to update user' });
    }
});

app.delete('/users/:id', async (req, res) => {
    try {
        await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
        res.status(200).send();
    } catch (err) {
        res.status(400).json({ error: 'Failed to delete user' });
    }
});

//_______________________________ADMIN_________________________________//

app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
