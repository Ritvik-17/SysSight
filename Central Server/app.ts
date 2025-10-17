import express = require('express');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Default route
app.get('/', (req: any, res: any) => {
  res.send('Server is running!');
});

// Route to receive agent data
app.post('/agent-data', (req: any, res: any) => {
  const { hostname, cpuUsage, memoryUsage } = req.body;
  console.log('Received data from agent:', { hostname, cpuUsage, memoryUsage });
  res.status(200).send('Data received');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
