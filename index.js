const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId} = require('mongodb');
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

app.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;

    // Basic validation
    if (!username || !email || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified' });
    }

    try {
        const existing = await db.collection('users').findOne({ email });
        if (existing) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const result = await db.collection('users').insertOne({
            username,
            email,
            password,
            role,
            createdAt: new Date()
        });

        res.status(201).json({ message: 'Account registered successfully', userId: result.insertedId });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Failed to register account' });
    }
});


app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await db.collection('users').findOne({ email, password });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.status(200).json({
            message: 'Login successful',
            userId: user._id,
            username: user.username,
            role: user.role
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
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
    const { driverId, name, email, phone, password, vehicle } = req.body;

    if (!driverId || !name || !email || !phone || !password) {
        return res.status(400).json({ error: "Missing required driver information" });
    }

    try {
        const existing = await db.collection('drivers').findOne({ driverId });
        if (existing) {
            return res.status(409).json({ error: "Driver already registered with this ID" });
        }

        const driver = {
            driverId,
            name,
            email,
            phone,
            password,
            vehicle,
            status: "pending",
            createdAt: new Date()
        };

        const result = await db.collection('drivers').insertOne(driver);
        res.status(201).json({ message: "Driver registered", id: result.insertedId });
    } catch (err) {
        res.status(500).json({ error: "Failed to register driver" });
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

app.put('/rides/:id/ridestatus', async (req, res) => {
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

app.put('/drivers/:id/status', async (req, res) => {
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value. Must be "approved" or "rejected".' });
    }

    try {
        const result = await db.collection('drivers').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: status } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: "Driver not found or already updated" });
        }

        res.status(200).json({ message: `Driver status updated to ${status}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update driver status" });
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
        const result = await db.collection('users').deleteOne({
            _id: new ObjectId(req.params.id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('❌ Delete user error:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

//_______________________________ADMIN_________________________________//

app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});