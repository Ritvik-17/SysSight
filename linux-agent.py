import psutil
import time
import json
import platform
import os
import requests
from dotenv import load_dotenv

CONFIG_PATH = "config.json"

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
# Load or create config.json
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, "r") as f:
        config = json.load(f)
else:
    config = {}

# Prompt for Agent ID if not already set
if "AgentId" not in config or not config["AgentId"]:
    agent_id = input("Enter Agent ID: ").strip()
    config["AgentId"] = agent_id

    # Save the updated config with AgentId
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=4)

# Extract configuration values
SERVER_URL = config.get("ServerUrl")
INTERVAL = int(config.get("PushInterval", 10000)) // 1000  # convert ms → seconds
PASSWORD = config.get("Password", "")
AGENT_ID = os.environ.get("AGENT_ID")

def get_system_info():
    info = {
        "hostname": platform.node(),
        "cpuUsage": psutil.cpu_percent(interval=1),
        "memoryUsage": psutil.virtual_memory().percent
    }
    return info

if __name__ == "__main__":
    while True:
        data = get_system_info()

        try:
            payload = {
                "password": PASSWORD,
                "agentId": AGENT_ID,
                **data
            }

            response = requests.post(SERVER_URL, json=payload)
            print(f"✅ Sent data from {AGENT_ID}: {response.status_code}")
        except Exception as e:
            print(f"❌ Failed to send data: {e}")

        time.sleep(INTERVAL)
