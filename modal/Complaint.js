const mongoose = require('mongoose');

let complaintCounter = 1; //  Keep counter in memory.  In real app, store in DB.

function generateComplaintId() {
    const prefix = 'C'; //  Complaint ID prefix
    const paddedCounter = String(complaintCounter).padStart(7, '0'); // Pad with 0s
    complaintCounter++;  // Increment for next complaint.
    return `${prefix}${paddedCounter}`; // e.g., C0000001, C0000002, etc.
}

const complaintSchema = new mongoose.Schema({
        _id: {  
        type: String,
        default: generateComplaintId, 
    },
    phoneNumber: {
        type: String,
        required: true,
        match: /^[0-9]{10}$/ // Validation: 10-digit number
    },
    complaint: {
        type: String,
        required: false, 
        default: "" 
    },
    address: {
        type: String,
        required: true
    },
    emergency: {
        type: Boolean,
        default: false
    },
    status: { 
        type: String,
        enum: ['Pending', 'In Progress', 'Resolved', 'Cancelled'],
        default: 'Pending' 
    },
    createdAt: { 
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
