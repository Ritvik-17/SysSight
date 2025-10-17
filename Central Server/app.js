"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var path = require("path");
var fs = require("fs");
var app = express();
var PORT = process.env.PORT || 4000;
app.use(express.json());
// File to store agent data
var DATA_FILE = path.join(__dirname, 'agent-data.json');
// Helper function to read JSON file
function readAgentData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            var raw = fs.readFileSync(DATA_FILE, 'utf-8');
            return JSON.parse(raw);
        }
        return [];
    }
    catch (err) {
        console.error('Failed to read data file:', err);
        return [];
    }
}
// Helper function to save JSON file
function saveAgentData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    }
    catch (err) {
        console.error('Failed to write data file:', err);
    }
}
// Default route
app.get('/', function (req, res) {
    res.send('Server is running!');
});
// Serve dashboard HTML
app.get('/dashboard', function (req, res) {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});
// POST route to receive agent data
app.post('/agent-data', function (req, res) {
    var _a = req.body, hostname = _a.hostname, cpuUsage = _a.cpuUsage, memoryUsage = _a.memoryUsage;
    if (!hostname || cpuUsage === undefined || memoryUsage === undefined) {
        return res.status(400).send('Invalid data');
    }
    var timestamp = new Date().toISOString();
    // Create data object
    var agentEntry = { hostname: hostname, cpuUsage: cpuUsage, memoryUsage: memoryUsage, createdAt: timestamp };
    // Log to console
    console.log('📥 Received data from agent:', agentEntry);
    // Read existing data
    var allData = readAgentData();
    // Append new entry
    allData.push(agentEntry);
    // Save to JSON file
    saveAgentData(allData);
    res.status(200).send('Data received, logged, and stored');
});
// Optional: GET all agent data
app.get('/agent-data', function (req, res) {
    var allData = readAgentData();
    res.json(allData);
});
app.listen(PORT, function () {
    console.log("\uD83D\uDE80 Server running on port ".concat(PORT));
});
