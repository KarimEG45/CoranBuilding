from fastapi import APIRouter
import time
import threading
import os
import signal
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Global state
last_heartbeat = time.time()
shutdown_timer_active = False

@router.post("/heartbeat")
def heartbeat():
    global last_heartbeat
    last_heartbeat = time.time()
    return {"status": "alive"}

def monitor_shutdown():
    global last_heartbeat
    logger.info("Shutdown monitor started. Waiting for heartbeats...")
    
    while True:
        time.sleep(5)  # Check every 5 seconds
        elapsed = time.time() - last_heartbeat
        
        # If no heartbeat for 60 seconds, shut down
        if elapsed > 60:
            logger.warning(f"No heartbeat for {elapsed:.1f}s. Force shutting down...")
            os._exit(0) # More reliable on Windows than SIGTERM
            break

def start_shutdown_monitor():
    global shutdown_timer_active, last_heartbeat
    if not shutdown_timer_active:
        # Reset heartbeat so we don't shutdown immediately on startup
        last_heartbeat = time.time()
        threading.Thread(target=monitor_shutdown, daemon=True).start()
        shutdown_timer_active = True
