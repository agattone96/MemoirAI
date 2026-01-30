import sys
import os
import requests
import subprocess
import time
import signal

def run_test():
    print("--- Verifying Key Enforcement ---")
    
    # 1. Start Backend WITHOUT Key
    print("1. Starting backend WITHOUT MEMOIR_DB_KEY...")
    env = os.environ.copy()
    env['FLASK_DEBUG'] = '0' # Disable reloader to prevent zombie processes
    if 'MEMOIR_DB_KEY' in env:
        del env['MEMOIR_DB_KEY']
        
    proc = subprocess.Popen(
        ['python3', 'backend/app.py'],
        cwd=os.getcwd(),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for startup
    # Increase wait just in case
    time.sleep(20)
    
    if proc.poll() is not None:
        print(f"FAIL: Process died early. Return code: {proc.returncode}")
        print(f"STDERR: {proc.stderr.read().decode()}")
        print(f"STDOUT: {proc.stdout.read().decode()}")
        # Check Health
    try:
        response = requests.get('http://localhost:5001/api/health/db')
        print(f"Response: {response.status_code} {response.json()}")
        
        if response.status_code == 423:
            print("SUCCESS: Received 423 Locked as expected.")
        else:
            print(f"FAIL: Expected 423, got {response.status_code}")
            
    except Exception as e:
        print(f"FAIL: Request error: {e}")
        
    # Cleanup
    try:
        os.kill(proc.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    
    # 2. Start Backend WITH Key (Simulate Electron)
    print("\n2. Starting backend WITH MEMOIR_DB_KEY...")
    env['MEMOIR_DB_KEY'] = 'test_key_123'
    
    proc = subprocess.Popen(
        ['python3', 'backend/app.py'],
        cwd=os.getcwd(),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    time.sleep(5)
    
    try:
        response = requests.get('http://localhost:5001/api/health/db')
        print(f"Response: {response.status_code} {response.json()}")
        
        if response.status_code == 200:
            print("SUCCESS: Received 200 OK with valid key.")
        else:
             print(f"FAIL: Expected 200, got {response.status_code}")
             
    except Exception as e:
        print(f"FAIL: Request error: {e}")
        
    os.kill(proc.pid, signal.SIGTERM)

if __name__ == "__main__":
    run_test()
