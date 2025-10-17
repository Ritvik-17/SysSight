"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var path = require("path");
var fs = require("fs");
var app = express();
var PORT = process.env.PORT || 4000;
app.use(express.json());
var DataFile = path.join(__dirname, 'agent-data.json');
function readAgentData() {
    try {
        if (fs.existsSync(DataFile)) {
            var raw = fs.readFileSync(DataFile, 'utf-8');
            return JSON.parse(raw);
        }
        return [];
    }
    catch (err) {
        console.error('Failed to read data file:', err);
        return [];
    }
}
function saveAgentData(data) {
    try {
        fs.writeFileSync(DataFile, JSON.stringify(data, null, 2), 'utf-8');
    }
    catch (err) {
        console.error('Failed to write data file:', err);
    }
}
app.get('/', function (req, res) {
    res.send('Server is running!');
});
app.get('/dashboard', function (req, res) {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});
app.post('/agent-data', function (req, res) {
    var _a = req.body, hostname = _a.hostname, cpuUsage = _a.cpuUsage, memoryUsage = _a.memoryUsage;
    if (!hostname || cpuUsage === undefined || memoryUsage === undefined) {
        return res.status(400).send('Invalid data');
    }
    var timestamp = new Date().toISOString();
    var agentEntry = { hostname: hostname, cpuUsage: cpuUsage, memoryUsage: memoryUsage, createdAt: timestamp };
    console.log('📥 Received data from agent:', agentEntry);
    var allData = readAgentData();
    allData.push(agentEntry);
    saveAgentData(allData);
    res.status(200).send('Data received, logged, and stored');
});
app.get('/agent-data', function (req, res) {
    var allData = readAgentData();
    res.json(allData);
});
app.listen(PORT, function () {
    console.log("\uD83D\uDE80 Server running on port ".concat(PORT));
});
