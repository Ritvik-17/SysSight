# Syssight

A real-time, multi-host performance monitoring tool. This project provides a central dashboard to visualize live and historical system metrics, view running processes, and receive alerts—all powered by a lightweight agent, a Node.js backend, and an Angular frontend.

Demo Video link: https://www.mediafire.com/file/r3e7ekwksudg8cn/SysSight+recording.mp4/file
---

## Features

- **Lightweight Python Agent**:  
  A minimal-impact agent using `psutil` collects key system metrics (CPU, Memory, Disk, Network, Load Average) from each monitored host.

- **Real-time Monitoring**:  
  The central dashboard displays live metrics from all connected hosts. Data is pushed continuously from agents to the server via Socket.io and broadcast to the dashboard for instant updates.

- **Historical Data Visualization**:  
  The server stores time-series metrics in MongoDB, allowing the dashboard to render interactive, historical graphs for CPU, memory, and network activity using Chart.js.

- **Host-Specific Views**:  
  Users can select any host from the dashboard to drill down into its specific live metrics and historical performance graphs.

- **On-Demand Process Viewer**:  
  You can request a paginated list of all running processes (including PID, name, CPU%, and Memory%) from a specific host at any time. This data is fetched on-demand and is **not stored** in the database to conserve resources.

- **Simple Frontend Alerting**:  
  The Angular dashboard generates a visual popup alert if any host's incoming metrics breach predefined client-side thresholds.

---

## Tech Stack

| Layer                     | Technology                   |
| ------------------------- | ---------------------------- |
| Frontend                  | Angular                      |
| Styling                   | Tailwind CSS                 |
| Charting                  | Chart.js                     |
| Backend                   | Node.js, Express             |
| Real-time Communication   | Socket.io                    |
| Database                  | MongoDB (for historical metrics) |
| Linux Agent               | Python, psutil               |

---

## Architecture Overview

The system is composed of three main parts:

### 1. Agent (`agent.py`)
- Python script that runs on each monitored Linux host.
- Uses `psutil` to collect system metrics at a configurable interval.
- Connects to the Node.js server via Socket.io to continuously push metric data.
- Listens for on-demand requests from the server (e.g., "get process list").

### 2. Server (`server.js`)
- Node.js/Express application acting as the central hub.
- Listens for Socket.io connections from agents and frontend.
- Receives metric data from agents, timestamps it, and stores it in MongoDB.
- Broadcasts live metrics to all connected dashboard clients.
- Provides REST APIs for the frontend to query historical data (for graphs).
- Relays on-demand requests (like "get processes") from the frontend to the specific agent.

### 3. Frontend (Angular)
- Single-page application serving as the user dashboard.
- Connects to the server via Socket.io to receive live metric broadcasts.
- Uses Chart.js to render graphs by fetching data from the server's REST API.
- Provides the UI for selecting hosts, viewing paginated process lists, and viewing alerts.

---

## Implemented features

- Core features (real-time metrics, historical visualization, process viewer, and frontend alerts) are fully implemented.

---

## Project Screenshots

<img width="956" height="440" alt="syssight2" src="https://github.com/user-attachments/assets/40be68ec-ea0e-48cc-a86c-7defe2565326" />
<img width="940" height="429" alt="syssight1" src="https://github.com/user-attachments/assets/072b2dc9-4e6e-46e7-8c21-b4a312b96a2a" />
<img width="942" height="428" alt="syssight" src="https://github.com/user-attachments/assets/fc0a5e6b-0903-47f5-9c2b-84fb41ddd610" />


---

## Hosted At

https://syssight-plqp.onrender.com/dashboard
