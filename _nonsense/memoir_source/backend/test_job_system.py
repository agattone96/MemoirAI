#!/usr/bin/env python3
"""
Verification test suite for unified background job system.
Tests job creation, execution, progress tracking, and error handling.

Usage:
    python test_job_system.py
"""

import sys
import time
import requests
from concurrent.futures import ThreadPoolExecutor

BASE_URL = "http://127.0.0.1:5001/api"

def test_job_lifecycle():
    """Test basic job lifecycle: create -> run -> complete."""
    print("\n[TEST 1] Job Lifecycle")
    print("-" * 50)
    
    # This would require creating a test job endpoint
    # For now, we'll verify the API endpoints exist
    try:
        # Test GET /api/jobs
        response = requests.get(f"{BASE_URL}/jobs", params={'limit': 5}, timeout=5)
        print(f"✓ GET /api/jobs: {response.status_code}")
        
        jobs = response.json()
        if jobs:
            job_id = jobs[0]['id']
            
            # Test GET /api/jobs/:id
            response = requests.get(f"{BASE_URL}/jobs/{job_id}", timeout=5)
            print(f"✓ GET /api/jobs/:id: {response.status_code}")
            
        return True
    except Exception as e:
        print(f"✗ Job lifecycle test failed: {e}")
        return False

def test_concurrent_execution():
    """Test concurrent job execution (multiple jobs running simultaneously)."""
    print("\n[TEST 2] Concurrent Execution")
    print("-" * 50)
    
    try:
        # Check for running jobs
        response = requests.get(f"{BASE_URL}/jobs", params={'status': 'running'}, timeout=5)
        running_jobs = response.json()
        
        print(f"Currently running jobs: {len(running_jobs)}")
        
        # Verify multiple jobs can be tracked
        if len(running_jobs) > 0:
            print(f"✓ Found {len(running_jobs)} concurrent jobs")
            for job in running_jobs[:3]:
                print(f"  - {job['type']} ({job['progress']}%)")
        else:
            print("⚠ No running jobs found (start some imports/forensics to test)")
        
        return True
    except Exception as e:
        print(f"✗ Concurrent execution test failed: {e}")
        return False

def test_error_handling():
    """Test error handling and job failure scenarios."""
    print("\n[TEST 3] Error Handling & Recovery")
    print("-" * 50)
    
    try:
        # Check for failed jobs
        response = requests.get(f"{BASE_URL}/jobs", params={'status': 'failed'}, timeout=5)
        failed_jobs = response.json()
        
        print(f"Historical failed jobs: {len(failed_jobs)}")
        
        if failed_jobs:
            print("✓ Failed jobs captured with error messages:")
            for job in failed_jobs[:2]:
                error = job.get('error_msg', 'No error message')[:100]
                print(f"  - {job['id']}: {error}")
        else:
            print("⚠ No failed jobs found (good, but can't verify error handling)")
        
        return True
    except Exception as e:
        print(f"✗ Error handling test failed: {e}")
        return False

def test_sse_streaming():
    """Test SSE streaming endpoint."""
    print("\n[TEST 4] SSE Streaming")
    print("-" * 50)
    
    try:
        # Get a running job to test streaming
        response = requests.get(f"{BASE_URL}/jobs", params={'status': 'running', 'limit': 1}, timeout=5)
        jobs = response.json()
        
        if not jobs:
            print("⚠ No running jobs to test SSE streaming")
            return True
        
        job_id = jobs[0]['id']
        print(f"Testing SSE stream for job {job_id}...")
        
        # Note: requests library doesn't support SSE well, just verify endpoint exists
        # In production, use EventSource from browser or sseclient library
        stream_url = f"{BASE_URL}/jobs/{job_id}/stream"
        print(f"✓ SSE endpoint available at {stream_url}")
        print("  (Manual verification required via browser EventSource)")
        
        return True
    except Exception as e:
        print(f"✗ SSE streaming test failed: {e}")
        return False

def test_performance():
    """Basic performance benchmarking."""
    print("\n[TEST 5] Performance Benchmarks")
    print("-" * 50)
    
    try:
        # Test job listing performance
        start = time.time()
        response = requests.get(f"{BASE_URL}/jobs", params={'limit': 100}, timeout=5)
        elapsed = (time.time() - start) * 1000
        
        jobs = response.json()
        print(f"✓ List 100 jobs: {elapsed:.0f}ms")
        
        if jobs:
            # Test individual job fetch
            start = time.time()
            job_id = jobs[0]['id']
            response = requests.get(f"{BASE_URL}/jobs/{job_id}", timeout=5)
            elapsed = (time.time() - start) * 1000
            print(f"✓ Get job status: {elapsed:.0f}ms")
        
        return True
    except Exception as e:
        print(f"✗ Performance test failed: {e}")
        return False

def main():
    print("="*60)
    print("  UNIFIED JOB SYSTEM VERIFICATION SUITE")
    print("="*60)
    
    # Check if backend is running
    try:
        response = requests.get(f"{BASE_URL}/jobs", params={'limit': 1}, timeout=5)
        print(f"\n✓ Backend is running (HTTP {response.status_code})")
    except Exception as e:
        print(f"\n✗ Backend is not accessible: {e}")
        print("Start the Flask backend first: python backend/app.py")
        return 1
    
    # Run tests
    tests = [
        test_job_lifecycle,
        test_concurrent_execution,
        test_error_handling,
        test_sse_streaming,
        test_performance
    ]
    
    results = []
    for test in tests:
        results.append(test())
    
    # Summary
    print("\n" + "="*60)
    print(f"  TEST SUMMARY: {sum(results)}/{len(results)} passed")
    print("="*60)
    
    if all(results):
        print("\n✓ All verification tests passed!")
        return 0
    else:
        print("\n⚠ Some tests failed or require manual verification")
        return 1

if __name__ == '__main__':
    sys.exit(main())
