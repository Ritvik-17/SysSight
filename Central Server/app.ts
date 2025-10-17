import express = require('express');
import path = require('path');
import fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// File to store agent data
const DATA_FILE = path.join(__dirname, 'agent-data.json');

// Helper function to read JSON file
function readAgentData(): any[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
    return [];
  } catch (err) {
    console.error('Failed to read data file:', err);
    return [];
  }
}

// Helper function to save JSON file
function saveAgentData(data: any[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write data file:', err);
  }
}

// Default route
app.get('/', (req: any, res: any) => {
  res.send('Server is running!');
});

// Serve dashboard HTML
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

// POST route to receive agent data
app.post('/agent-data', (req: any, res: any) => {
  const { hostname, cpuUsage, memoryUsage } = req.body;

  if (!hostname || cpuUsage === undefined || memoryUsage === undefined) {
    return res.status(400).send('Invalid data');
  }

  const timestamp = new Date().toISOString();

  // Create data object
  const agentEntry = { hostname, cpuUsage, memoryUsage, createdAt: timestamp };

  // Log to console
  console.log('📥 Received data from agent:', agentEntry);

  // Read existing data
  const allData = readAgentData();

  // Append new entry
  allData.push(agentEntry);

  // Save to JSON file
  saveAgentData(allData);

  res.status(200).send('Data received, logged, and stored');
});

// Optional: GET all agent data
app.get('/agent-data', (req: any, res: any) => {
  const allData = readAgentData();
  res.json(allData);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
