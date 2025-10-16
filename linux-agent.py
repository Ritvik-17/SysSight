import psutil
import time
import json
import platform
import os

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
        print(json.dumps(data, indent=2))
        time.sleep(5)
