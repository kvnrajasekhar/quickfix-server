const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const moment = require('moment-timezone');

app.use(express.json());

// Use environment variable directly
const MONGO_URL = process.env.MONGO_URL;

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
}));

let mongooseConnection; // Store the connection

const connectToDatabase = async () => {
    if (!mongooseConnection) {
        try {
            mongoose.set('strictQuery', false); 
            mongooseConnection = await mongoose.connect(MONGO_URL, {
                useNewUrlParser: true, 
                useUnifiedTopology: true,
            });
            console.log('MongoDB connected');
        } catch (err) {
            console.error('MongoDB connection error:', err);
            throw err; // Re-throw the error to prevent the app from starting
        }
    }
    return mongooseConnection; // Return the connection
};

// Define the Complaint schema and model (assuming this is in modal/Complaint.js)
const Complaint = require('./modal/Complaint');

// Wrap your route handlers in a function that ensures connection
const handleRequest = async (req, res, routeHandler) => {
    try {
        await connectToDatabase();
        await routeHandler(req, res); // Execute the actual route handler
    } catch (error) {
        // Handle database connection errors here, or other errors
        console.error("Error in handleRequest:", error);
        if (!res.headersSent) {
             res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    }
};



// Route to handle creating a new complaint
app.post('/complaint', async (req, res) => {
    await handleRequest(req, res, async (req, res) => { // Wrap handler
        const complaintData = {
            phoneNumber: req.body.phoneNumber,
            complaint: req.body.complaint,
            address: req.body.address,
            emergency: req.body.emergency,
        };
        const newComplaint = new Complaint(complaintData);
        const savedComplaint = await newComplaint.save();
        res.status(201).json(savedComplaint);
    });
});

// Route to get all complaints
app.get('/complaints', async (req, res) => {
    await handleRequest(req, res, async (req, res) => {  // Wrap handler
        const complaints = await Complaint.find().lean();
        const complaintsIST = complaints.map(complaint => ({
            ...complaint,
            createdAt: moment.utc(complaint.createdAt).tz('Asia/Kolkata').format(),
            updatedAt: moment.utc(complaint.updatedAt).tz('Asia/Kolkata').format(),
        }));
        res.status(200).json(complaintsIST);
    });
});

// Route to update a complaint's status
app.patch('/complaints/:id', async (req, res) => {
    await handleRequest(req, res, async (req, res) => {  // Wrap handler
        const complaintId = req.params.id;
        const newStatus = req.body.status;

        const updatedComplaint = await Complaint.findByIdAndUpdate(
            complaintId,
            { status: newStatus, updatedAt: Date.now() },
            { new: true, runValidators: true }
        ).lean();

        if (!updatedComplaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }
        const updatedComplaintIST = {
          ...updatedComplaint,
          updatedAt: moment.utc(updatedComplaint.updatedAt).tz('Asia/Kolkata').format()
        }

        res.status(200).json(updatedComplaintIST);
    });
});

// Route to delete a complaint
app.delete('/complaints/:id', async (req, res) => {
    await handleRequest(req, res, async (req, res) => {
        const complaintId = req.params.id;

        const deletedComplaint = await Complaint.findByIdAndDelete(complaintId);

        if (!deletedComplaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        res.status(200).json({ message: 'Complaint deleted successfully' });
    });
});



app.get('/', (req, res) => {
    res.send("Hello from the quickfix server");
});

app.get('/hi', (req, res) => {
    res.send("Hello World");
});

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Vercel export
module.exports = app;
