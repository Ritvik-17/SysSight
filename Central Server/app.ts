import express = require('express');
import path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Default route
app.get('/', (req: any, res: any) => {
  res.send('Server is running!');
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

// Route to receive agent data
app.post('/agent-data', (req: any, res: any) => {
  const { hostname, cpuUsage, memoryUsage } = req.body;
  console.log('Received data from agent:', { hostname, cpuUsage, memoryUsage });
  res.status(200).send('Data received');
});

app.get('/agent-data', (req: any, res: any) => {
  res.status(200).send('Hello, i will send agent data later');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
