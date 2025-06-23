#!/usr/bin/env python3
"""
Run all comprehensive tests for the proof checker
"""

import subprocess
import sys
import os
from pathlib import Path

def run_tests():
    """Run all test files and collect results"""
    
    # Get the tests directory
    tests_dir = Path(__file__).parent
    project_root = tests_dir.parent
    
    # Change to project root for imports to work
    os.chdir(project_root)
    
    # Test files to run
    test_files = [
        "tests/test_comprehensive_parsing.py",
        "tests/test_parser_edge_cases.py", 
        "tests/test_countermodel_generation.py",
        "tests/test_quantifier_rules.py",
        "tests/test_cnf_converter.py",
        "tests/test_machine_solver.py",
        "tests/test_api_integration.py"
    ]
    
    results = {}
    total_passed = 0
    total_failed = 0
    
    print("=" * 80)
    print("RUNNING COMPREHENSIVE PROOF CHECKER TESTS")
    print("=" * 80)
    print()
    
    for test_file in test_files:
        if not os.path.exists(test_file):
            print(f"⚠️  Skipping {test_file} (not found)")
            continue
            
        print(f"Running {test_file}...")
        print("-" * 40)
        
        try:
            # Run pytest with verbose output
            result = subprocess.run(
                [sys.executable, "-m", "pytest", test_file, "-v", "--tb=short"],
                capture_output=True,
                text=True
            )
            
            # Parse output for test counts
            output_lines = result.stdout.split('\n')
            for line in output_lines:
                if "passed" in line or "failed" in line:
                    print(line)
            
            # Extract pass/fail counts
            if result.returncode == 0:
                # Look for summary line
                for line in reversed(output_lines):
                    if "passed" in line:
                        # Extract number of passed tests
                        import re
                        match = re.search(r'(\d+) passed', line)
                        if match:
                            passed = int(match.group(1))
                            total_passed += passed
                            results[test_file] = {"status": "✅", "passed": passed, "failed": 0}
                        break
            else:
                # Tests failed
                passed = 0
                failed = 0
                for line in reversed(output_lines):
                    if "passed" in line or "failed" in line:
                        import re
                        passed_match = re.search(r'(\d+) passed', line)
                        failed_match = re.search(r'(\d+) failed', line)
                        if passed_match:
                            passed = int(passed_match.group(1))
                        if failed_match:
                            failed = int(failed_match.group(1))
                        if passed_match or failed_match:
                            break
                
                total_passed += passed
                total_failed += failed
                results[test_file] = {"status": "❌", "passed": passed, "failed": failed}
                
                # Show failures
                print("\nFailures:")
                print(result.stdout)
                if result.stderr:
                    print("Errors:")
                    print(result.stderr)
        
        except Exception as e:
            print(f"Error running {test_file}: {e}")
            results[test_file] = {"status": "💥", "error": str(e)}
            total_failed += 1
        
        print()
    
    # Summary
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print()
    
    for test_file, result in results.items():
        if result["status"] == "✅":
            print(f"{result['status']} {test_file}: {result['passed']} passed")
        elif result["status"] == "❌":
            print(f"{result['status']} {test_file}: {result['passed']} passed, {result['failed']} failed")
        else:
            print(f"{result['status']} {test_file}: {result.get('error', 'Unknown error')}")
    
    print()
    print(f"Total: {total_passed} passed, {total_failed} failed")
    print()
    
    if total_failed > 0:
        print("❌ Some tests failed!")
        return 1
    else:
        print("✅ All tests passed!")
        return 0


if __name__ == "__main__":
    sys.exit(run_tests())