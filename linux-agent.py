import socketio
import psutil
import time
import platform
import json
import os
from dotenv import load_dotenv
import threading

# === Load .env (optional) ===
load_dotenv()

CONFIG_PATH = "config.json"

# === Load config ===
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, "r") as f:
        config = json.load(f)
else:
    config = {}

# === Get or prompt Agent ID ===
if "AgentId" not in config or not config["AgentId"]:
    agent_id = input("Enter Agent ID: ").strip()
    config["AgentId"] = agent_id
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=4)
else:
    agent_id = config["AgentId"]

# === Server details ===
SERVER_URL = config.get("ServerUrl", os.getenv("SERVER_URL", "http://localhost:5000"))
INTERVAL = int(config.get("PushInterval", os.getenv("PUSH_INTERVAL", 5000))) / 1000  # ms → s
PASSWORD = config.get("Password", os.getenv("AGENT_TOKEN", "1234"))

# === Socket.IO client ===
sio = socketio.Client(reconnection=True, reconnection_attempts=5)
sender_thread_started = False  # Prevent multiple threads

# === System info ===
def get_system_info():
    try:
        load1, load5, load15 = psutil.getloadavg()
    except (AttributeError, OSError):
        load1 = load5 = load15 = 0.0

    net = psutil.net_io_counters()
    disk = psutil.disk_usage("/")
    return {
        "hostname": platform.node(),
        "cpuUsage": psutil.cpu_percent(interval=None),
        "memoryUsage": psutil.virtual_memory().percent,
        "diskUsage": disk.percent,
        "netBytesSent": net.bytes_sent,
        "netBytesRecv": net.bytes_recv,
        "load1": load1,
        "load5": load5,
        "load15": load15,
    }

# === Background sender ===
def send_data_loop():
    while True:
        try:
            metrics = get_system_info()
            payload = {"agentId": agent_id, "password": PASSWORD, **metrics}
            sio.emit("system_data", payload)
            print(f" Sent data: {payload}")
        except Exception as e:
            print(f"  Error sending data: {e}")
        time.sleep(INTERVAL)


@sio.event
def connect():
    global sender_thread_started
    print("Connected to server:", SERVER_URL)
    sio.emit("register_agent", {"agentId": agent_id, "password": PASSWORD})
    if not sender_thread_started:
        threading.Thread(target=send_data_loop, daemon=True).start()
        sender_thread_started = True

@sio.event
def disconnect():
    print("Disconnected from server.")

@sio.event
def connect_error(e):
    print("Connection failed: ", e)


@sio.on("request_processes")
def handle_process_request(data):
    procs = []
    for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
        procs.append(p.info)
    sio.emit("processes_response", {"agentId": agent_id, "processes": procs})



if __name__ == "__main__":
    try:
        print(f"Connecting to {SERVER_URL} as Agent '{agent_id}'...")
        sio.connect(SERVER_URL)
        sio.wait()  # Keep the main thread alive to listen for events
    except KeyboardInterrupt:
        print("\n Agent stopped manually.")
    except Exception as e:
        print(f" Failed to start agent: {e}")
