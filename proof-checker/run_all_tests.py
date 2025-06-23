#!/usr/bin/env python3
"""
Run all proof checker tests and generate a report
"""

import subprocess
import sys
import os
import time
from datetime import datetime

def run_test_file(test_file):
    """Run a single test file and return results"""
    print(f"\n{'='*60}")
    print(f"Running {test_file}")
    print('='*60)
    
    start_time = time.time()
    
    try:
        result = subprocess.run(
            [sys.executable, test_file, "-v"],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        elapsed = time.time() - start_time
        
        # Print output
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        return {
            'file': test_file,
            'passed': result.returncode == 0,
            'elapsed': elapsed,
            'stdout': result.stdout,
            'stderr': result.stderr
        }
        
    except subprocess.TimeoutExpired:
        print(f"TIMEOUT: Test took longer than 60 seconds")
        return {
            'file': test_file,
            'passed': False,
            'elapsed': 60,
            'stdout': '',
            'stderr': 'Timeout'
        }
    except Exception as e:
        print(f"ERROR: {e}")
        return {
            'file': test_file,
            'passed': False,
            'elapsed': 0,
            'stdout': '',
            'stderr': str(e)
        }

def main():
    """Run all tests and generate summary"""
    print("LogicArena Proof Checker - Comprehensive Test Suite")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test files to run
    test_files = [
        "test_quantifiers.py",
        "test_cnf_converter.py", 
        "test_machine_solver.py",
        "tests/test_quantifier_rules.py",
        "tests/test_cnf_converter.py",
        "tests/test_machine_solver.py",
        "tests/test_api_integration.py"
    ]
    
    # Filter to existing files
    existing_tests = []
    for test_file in test_files:
        if os.path.exists(test_file):
            existing_tests.append(test_file)
        elif os.path.exists(os.path.join(os.path.dirname(__file__), test_file)):
            existing_tests.append(os.path.join(os.path.dirname(__file__), test_file))
    
    print(f"\nFound {len(existing_tests)} test files")
    
    # Run all tests
    results = []
    total_start = time.time()
    
    for test_file in existing_tests:
        result = run_test_file(test_file)
        results.append(result)
    
    total_elapsed = time.time() - total_start
    
    # Generate summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for r in results if r['passed'])
    failed = len(results) - passed
    
    print(f"\nTotal test files: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Total time: {total_elapsed:.2f} seconds")
    
    if failed > 0:
        print("\nFailed tests:")
        for result in results:
            if not result['passed']:
                print(f"  - {result['file']}")
                if result['stderr']:
                    print(f"    Error: {result['stderr'][:100]}...")
    
    # Detailed results
    print("\nDetailed Results:")
    for result in results:
        status = "PASS" if result['passed'] else "FAIL"
        print(f"  {result['file']:<40} {status:>6} ({result['elapsed']:>6.2f}s)")
    
    # Count individual test cases from pytest output
    total_tests = 0
    passed_tests = 0
    for result in results:
        if 'passed' in result['stdout']:
            # Parse pytest output
            import re
            match = re.search(r'(\d+) passed', result['stdout'])
            if match:
                passed_tests += int(match.group(1))
            match = re.search(r'(\d+) failed', result['stdout'])
            if match:
                total_tests += int(match.group(1))
            total_tests += passed_tests
    
    if total_tests > 0:
        print(f"\nIndividual test cases: ~{total_tests} total")
    
    print("\n" + "="*60)
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    # Change to proof-checker directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Install pytest if needed
    try:
        import pytest
    except ImportError:
        print("Installing pytest...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pytest"], check=True)
    
    main()