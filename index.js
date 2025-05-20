const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const moment = require('moment-timezone');

app.use(express.json());

const MONGO_URL = process.env.MONGO_URL;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
}));

let mongooseConnection; 

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

const Complaint = require('./modal/Complaint');

// Wrap your route handlers in a function that ensures connection
const handleRequest = async (req, res, routeHandler) => {
    try {
        await connectToDatabase();
        await routeHandler(req, res); // Execute the actual route handler
    } catch (error) {
        console.error("Error in handleRequest:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    }
};

// --- Helper function for consistent error responses ---
const sendErrorResponse = (res, statusCode, message, error) => {
  console.error(message, error);
  if (!res.headersSent) { // Check if headers have already been sent
    res.status(statusCode).json({ message, error: error.message || error });
  }
};

// Route to handle creating a new complaint
app.post('/complaint', async (req, res) => {
    await handleRequest(req, res, async (req, res) => { // Wrap handler
        try {
            const complaintData = {
                phoneNumber: req.body.phoneNumber,
                complaint: req.body.complaint,
                address: req.body.address,
                emergency: req.body.emergency,
            };
            const newComplaint = new Complaint(complaintData);
            const savedComplaint = await newComplaint.save();
            res.status(201).json(savedComplaint);
        } catch (error) {
            sendErrorResponse(res, 500, 'Failed to save complaint', error);
        }
    });
});

// Route to get all complaints
app.get('/complaints', async (req, res) => {
    await handleRequest(req, res, async (req, res) => { // Wrap handler
        try {
            const complaints = await Complaint.find().lean();
            const complaintsIST = complaints.map(complaint => ({
                ...complaint,
                createdAt: moment.utc(complaint.createdAt).tz('Asia/Kolkata').format(),
                updatedAt: moment.utc(complaint.updatedAt).tz('Asia/Kolkata').format(),
            }));
            res.status(200).json(complaintsIST);
        } catch (error) {
             sendErrorResponse(res, 500, 'Failed to fetch complaints', error);
        }
    });
});

// Route to update a complaint's status
app.patch('/complaints/:id', async (req, res) => {
    await handleRequest(req, res, async (req, res) => { // Wrap handler
        try {
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
        } catch (error) {
            sendErrorResponse(res, 500, 'Failed to update complaint status', error);
        }
    });
});

// Route to delete a complaint
app.delete('/complaints/:id', async (req, res) => {
    await handleRequest(req, res, async (req, res) => {
        try {
            const complaintId = req.params.id;

            const deletedComplaint = await Complaint.findByIdAndDelete(complaintId);

            if (!deletedComplaint) {
                return res.status(404).json({ message: 'Complaint not found' });
            }

            res.status(200).json({ message: 'Complaint deleted successfully' });
        } catch (error) {
            sendErrorResponse(res, 500, 'Failed to delete complaint', error);
        }
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
