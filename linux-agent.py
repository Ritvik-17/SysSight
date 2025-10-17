import psutil
import time
import json
import platform
import os
import requests  # make sure to install this with: pip install requests

# Get server URL (you can update this later)
SERVER_URL = "https://syssight-plqp.onrender.com/agent-data"
INTERVAL = int(os.environ.get("INTERVAL", 5))  # seconds between pushes
port = int(os.environ.get("PORT", 4000))

def get_system_info():
    info = {
        "hostname": platform.node(),
        "os": platform.system(),
        "os_version": platform.version(),
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage('/').percent
    }
    return info

if __name__ == "__main__":
    while True:
        data = get_system_info()

        try:
            # Send the data to the central server
            response = requests.post(SERVER_URL, json=data)
            print(f"✅ Sent data to server: {response.status_code}")
        except Exception as e:
            print(f"❌ Failed to send data: {e}")

        time.sleep(INTERVAL)
