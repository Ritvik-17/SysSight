"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var path = require("path");
var app = express();
var PORT = process.env.PORT || 4000;
app.use(express.json());
// Default route
app.get('/', function (req, res) {
    res.send('Server is running!');
});
app.get('/dashboard', function (req, res) {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});
// Route to receive agent data
app.post('/agent-data', function (req, res) {
    var _a = req.body, hostname = _a.hostname, cpuUsage = _a.cpuUsage, memoryUsage = _a.memoryUsage;
    console.log('Received data from agent:', { hostname: hostname, cpuUsage: cpuUsage, memoryUsage: memoryUsage });
    res.status(200).send('Data received');
});
app.get('/agent-data', function (req, res) {
    res.status(200).send('Hello, i will send agent data later');
});
app.listen(PORT, function () {
    console.log("\uD83D\uDE80 Server running on port ".concat(PORT));
});
