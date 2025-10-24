import socketio
import psutil
import time
import platform
import json
import os
from dotenv import load_dotenv
import threading

load_dotenv()

CONFIG_PATH = "config.json"

if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, "r") as f:
        config = json.load(f)
else:
    config = {}

if "AgentId" not in config or not config["AgentId"]:
    agent_id = input("Enter Agent ID: ").strip()
    config["AgentId"] = agent_id
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=4)
else:
    agent_id = config["AgentId"]

SERVER_URL = config.get("ServerUrl", os.getenv("SERVER_URL", "http://localhost:5000"))
INTERVAL = int(config.get("PushInterval", os.getenv("PUSH_INTERVAL", 5000))) / 1000
PASSWORD = "1234"

sio = socketio.Client(reconnection=True, reconnection_attempts=5)
sender_thread_started = False

previous_net_counters = None
previous_net_time = None

def calculate_network_rate():
    global previous_net_counters, previous_net_time
    current_net = psutil.net_io_counters()
    current_time = time.time()
    if previous_net_counters is None:
        previous_net_counters = current_net
        previous_net_time = current_time
        return 0, 0
    time_delta = current_time - previous_net_time
    if time_delta == 0:
        return 0, 0
    sent_rate = (current_net.bytes_sent - previous_net_counters.bytes_sent) / time_delta
    recv_rate = (current_net.bytes_recv - previous_net_counters.bytes_recv) / time_delta
    previous_net_counters = current_net
    previous_net_time = current_time
    return sent_rate, recv_rate

def get_system_info():
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        try:
            load1, load5, load15 = psutil.getloadavg()
        except (AttributeError, OSError):
            load1 = load5 = load15 = 0.0
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        net = psutil.net_io_counters()
        net_sent_rate, net_recv_rate = calculate_network_rate()
        return {
            "hostname": platform.node(),
            "cpuUsage": round(cpu_percent, 2),
            "memoryUsage": round(mem.percent, 2),
            "diskUsage": round(disk.percent, 2),
            "netBytesSent": net.bytes_sent,
            "netBytesRecv": net.bytes_recv,
            "netSentRate": round(net_sent_rate, 2),
            "netRecvRate": round(net_recv_rate, 2),
            "load1": round(load1, 2),
            "load5": round(load5, 2),
            "load15": round(load15, 2),
            "os": platform.system(),
            "os_version": platform.version(),
        }
    except Exception:
        return None

def send_data_loop():
    while True:
        try:
            metrics = get_system_info()
            if metrics:
                payload = {"agentId": agent_id, "password": PASSWORD, **metrics}
                sio.emit("system_data", payload)
                print(f"Sent data: CPU={metrics['cpuUsage']}%, Mem={metrics['memoryUsage']}%, NetUp={metrics['netSentRate']:.0f}B/s")
        except Exception as e:
            print(f"Error sending data: {e}")
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
    print("Connection failed:", e)

@sio.on("request_processes")
def handle_process_request(data):
    try:
        procs = []
        for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
            try:
                procs.append(p.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        print(f"Sending {len(procs)} processes")
        sio.emit("processes_response", {"agentId": agent_id, "processes": procs})
    except Exception as e:
        print(f"Error gathering processes: {e}")

if __name__ == "__main__":
    try:
        print(f"Connecting to {SERVER_URL} as Agent '{agent_id}'...")
        sio.connect(SERVER_URL)
        sio.wait()
    except KeyboardInterrupt:
        print("Agent stopped manually.")
    except Exception as e:
        print(f"Failed to start agent: {e}")