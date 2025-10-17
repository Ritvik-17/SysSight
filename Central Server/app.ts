import express = require('express');
import path = require('path');
import fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());


const DataFile = path.join(__dirname, 'agent-data.json');


function readAgentData(): any[] {
  try {
    if (fs.existsSync(DataFile)) {
      const raw = fs.readFileSync(DataFile, 'utf-8');
      return JSON.parse(raw);
    }
    return [];
  } catch (err) {
    console.error('Failed to read data file:', err);
    return [];
  }
}


function saveAgentData(data: any[]) {
  try {
    fs.writeFileSync(DataFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write data file:', err);
  }
}


app.get('/', (req: any, res: any) => {
  res.send('Server is running!');
});


app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});


app.post('/agent-data', (req: any, res: any) => {
  const { hostname, cpuUsage, memoryUsage } = req.body;

  if (!hostname || cpuUsage === undefined || memoryUsage === undefined) {
    return res.status(400).send('Invalid data');
  }

  const timestamp = new Date().toISOString();

  const agentEntry = { hostname, cpuUsage, memoryUsage, createdAt: timestamp };

  console.log('📥 Received data from agent:', agentEntry);

 
  const allData = readAgentData();

  allData.push(agentEntry);


  saveAgentData(allData);

  res.status(200).send('Data received, logged, and stored');
});


app.get('/agent-data', (req: any, res: any) => {
  const allData = readAgentData();
  res.json(allData);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
