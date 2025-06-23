#!/usr/bin/env python3
"""
Simple test runner for performance optimizations
Tests basic functionality without full test framework
"""

import os
import sys
import json
import subprocess
from pathlib import Path

# Colors for output
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
NC = '\033[0m'  # No Color

def print_test(name, passed, details=""):
    """Print test result"""
    if passed:
        print(f"{GREEN}✅ {name}{NC}")
    else:
        print(f"{RED}❌ {name}{NC}")
        if details:
            print(f"   {details}")

def test_lazy_loading_components():
    """Test that lazy loading components exist"""
    print(f"\n{YELLOW}Testing Lazy Loading Components...{NC}")
    
    components = [
        "front/src/components/LazyFitchEditor.tsx",
        "front/src/components/LazyCarnapFitchEditor.tsx"
    ]
    
    all_passed = True
    for component in components:
        path = Path(component)
        exists = path.exists()
        print_test(f"{path.name} exists", exists)
        
        if exists:
            content = path.read_text()
            has_dynamic = "next/dynamic" in content
            has_loading = "loading:" in content
            has_ssr_false = "ssr: false" in content
            
            print_test(f"  - Uses next/dynamic", has_dynamic)
            print_test(f"  - Has loading component", has_loading)
            print_test(f"  - Disables SSR", has_ssr_false)
            
            all_passed = all_passed and has_dynamic and has_loading and has_ssr_false
        else:
            all_passed = False
    
    return all_passed

def test_websocket_reconnection():
    """Test WebSocket reconnection implementation"""
    print(f"\n{YELLOW}Testing WebSocket Reconnection...{NC}")
    
    ws_file = Path("front/src/lib/websocket.ts")
    
    if not ws_file.exists():
        print_test("WebSocket file exists", False)
        return False
    
    print_test("WebSocket file exists", True)
    
    content = ws_file.read_text()
    
    # Check for reconnection features
    features = {
        "ConnectionState enum": "enum ConnectionState" in content,
        "Exponential backoff": "backoffMultiplier" in content,
        "Max attempts": "maxAttempts" in content,
        "Message queue": "messageQueueRef" in content,
        "Heartbeat mechanism": "heartbeatIntervalRef" in content,
        "Reconnect function": "resetConnection" in content,
    }
    
    all_passed = True
    for feature, present in features.items():
        print_test(f"  - {feature}", present)
        all_passed = all_passed and present
    
    return all_passed

def test_bundle_optimization():
    """Test Next.js bundle optimization configuration"""
    print(f"\n{YELLOW}Testing Bundle Optimization...{NC}")
    
    config_file = Path("front/next.config.js")
    
    if not config_file.exists():
        print_test("next.config.js exists", False)
        return False
    
    print_test("next.config.js exists", True)
    
    content = config_file.read_text()
    
    # Check for optimization features
    features = {
        "SWC minify enabled": "swcMinify: true" in content,
        "Compression enabled": "compress: true" in content,
        "Code splitting configured": "splitChunks" in content,
        "Monaco chunk": "monaco:" in content,
        "Vendor chunk": "vendor:" in content,
        "UI libraries chunk": "ui:" in content,
        "Tree shaking": "sideEffects: false" in content,
    }
    
    all_passed = True
    for feature, present in features.items():
        print_test(f"  - {feature}", present)
        all_passed = all_passed and present
    
    return all_passed

def test_database_optimizations():
    """Test database optimization implementations"""
    print(f"\n{YELLOW}Testing Database Optimizations...{NC}")
    
    files_to_check = {
        "Connection pooling": "gateway/app/db/session.py",
        "Query optimizations": "gateway/app/db/query_optimizations.py",
        "Index migration": "gateway/migrations/20250622_000001_add_performance_indexes.py",
    }
    
    all_passed = True
    for feature, filepath in files_to_check.items():
        path = Path(filepath)
        exists = path.exists()
        print_test(f"{feature} file exists", exists)
        
        if exists and "session.py" in filepath:
            content = path.read_text()
            has_pool_size = "POOL_SIZE" in content
            has_queue_pool = "QueuePool" in content
            has_monitor = "ConnectionPoolMonitor" in content
            
            print_test(f"  - Pool size configured", has_pool_size)
            print_test(f"  - Uses QueuePool", has_queue_pool)
            print_test(f"  - Has connection monitor", has_monitor)
            
            all_passed = all_passed and has_pool_size and has_queue_pool and has_monitor
        elif exists and "query_optimizations.py" in filepath:
            content = path.read_text()
            has_eager_loading = "selectinload" in content and "joinedload" in content
            has_optimized_queries = "get_game_with_details" in content
            
            print_test(f"  - Uses eager loading", has_eager_loading)
            print_test(f"  - Has optimized query functions", has_optimized_queries)
            
            all_passed = all_passed and has_eager_loading and has_optimized_queries
        elif not exists:
            all_passed = False
    
    return all_passed

def test_file_structure():
    """Test that all optimization files are in place"""
    print(f"\n{YELLOW}Testing File Structure...{NC}")
    
    expected_files = [
        # Frontend
        "front/src/components/LazyFitchEditor.tsx",
        "front/src/components/LazyCarnapFitchEditor.tsx",
        "front/src/components/__tests__/LazyFitchEditor.test.tsx",
        "front/src/components/__tests__/LazyCarnapFitchEditor.test.tsx",
        "front/src/lib/__tests__/websocket.reconnection.test.tsx",
        "front/src/__tests__/bundle-optimization.test.js",
        
        # Backend
        "gateway/app/db/query_optimizations.py",
        "gateway/tests/test_db_connection_pooling.py",
        "gateway/tests/test_query_optimizations.py",
        "gateway/tests/test_db_indexes.py",
        
        # Documentation
        "PERFORMANCE_OPTIMIZATIONS.md",
        "PERFORMANCE_TESTS_SUMMARY.md",
    ]
    
    all_passed = True
    for filepath in expected_files:
        path = Path(filepath)
        exists = path.exists()
        print_test(f"{filepath}", exists)
        all_passed = all_passed and exists
    
    return all_passed

def check_services():
    """Check if required services are running"""
    print(f"\n{YELLOW}Checking Services...{NC}")
    
    services = {
        "Frontend (3000)": 3000,
        "Gateway (8000)": 8000,
        "PostgreSQL (5432)": 5432,
        "Redis (6379)": 6379,
    }
    
    import socket
    
    all_running = True
    for service, port in services.items():
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        
        is_running = result == 0
        print_test(f"{service}", is_running)
        all_running = all_running and is_running
    
    return all_running

def main():
    """Run all tests"""
    print("🧪 Performance Optimization Tests (Simple)")
    print("=" * 50)
    
    results = {
        "File Structure": test_file_structure(),
        "Lazy Loading": test_lazy_loading_components(),
        "WebSocket Reconnection": test_websocket_reconnection(),
        "Bundle Optimization": test_bundle_optimization(),
        "Database Optimizations": test_database_optimizations(),
        "Services": check_services(),
    }
    
    print(f"\n{YELLOW}=== Summary ==={NC}")
    print("=" * 50)
    
    all_passed = all(results.values())
    passed_count = sum(1 for v in results.values() if v)
    total_count = len(results)
    
    for test_name, passed in results.items():
        print_test(test_name, passed)
    
    print(f"\nTotal: {passed_count}/{total_count} test suites passed")
    
    if all_passed:
        print(f"\n{GREEN}✅ All tests passed!{NC}")
        return 0
    else:
        print(f"\n{RED}❌ Some tests failed{NC}")
        return 1

if __name__ == "__main__":
    sys.exit(main())