const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const moment = require('moment-timezone'); 

app.use(express.json());

const MONGO_URL = process.env.MONGO_URL;
console.log(MONGO_URL);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
}));

mongoose.connect(MONGO_URL)
    .then(() => {
        console.log('MongoDB connected');
    })
    .catch(err => {
        console.error('MongoDB initial connection error:', err);
    });



const Complaint = require('./modal/Complaint'); 

app.post('/complaint', async (req, res) => {
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
        console.error('Error saving complaint:', error);
        res.status(500).json({ message: 'Failed to save complaint', error: error.message });
    }
});

app.get('/complaints', async (req, res) => {
    try {
        const complaints = await Complaint.find().lean(); 
        const complaintsIST = complaints.map(complaint => ({
            ...complaint,
            createdAt: moment.utc(complaint.createdAt).tz('Asia/Kolkata').format(),
            updatedAt: moment.utc(complaint.updatedAt).tz('Asia/Kolkata').format(),
        }));
        res.status(200).json(complaintsIST);
    } catch (error) {
        console.error("Error fetching all complaints:", error);
        res.status(500).json({ error: 'Failed to fetch complaints.', error: error.message });
    }
});

app.patch('/complaints/:id', async (req, res) => {
    try {
        const complaintId = req.params.id;
        const newStatus = req.body.status;

        const updatedComplaint = await Complaint.findByIdAndUpdate(
            complaintId,
            { status: newStatus, updatedAt: Date.now() },
            { new: true, runValidators: true } //  Added runValidators
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
        console.error('Error updating complaint status:', error);
        res.status(500).json({ message: 'Failed to update complaint status', error: error.message });
    }
});

app.delete('/complaints/:id', async (req, res) => {
    try {
        const complaintId = req.params.id;

        const deletedComplaint = await Complaint.findByIdAndDelete(complaintId);

        if (!deletedComplaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        res.status(200).json({ message: 'Complaint deleted successfully' });
    } catch (error) {
        console.error('Error deleting complaint:', error);
        res.status(500).json({ message: 'Failed to delete complaint', error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send("Hello from the quickfix server");
});

app.get('/hi', (req, res) => {
    res.send("Hello World");
});

module.exports = app;
