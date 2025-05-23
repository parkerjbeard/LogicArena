#!/usr/bin/env python3
"""Test script for the proof checker service"""

import requests
import json

# Base URL for the proof checker service
BASE_URL = "http://localhost:5003"

def test_health():
    """Test the health endpoint"""
    print("Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_valid_proof():
    """Test a valid modus ponens proof"""
    print("Testing valid modus ponens proof...")
    
    proof_data = {
        "gamma": "P→Q, P",  # Premises: P implies Q, and P
        "phi": "Q",         # Conclusion: Q
        "proof": """Q [1,2 MP]"""  # Simple modus ponens
    }
    
    response = requests.post(f"{BASE_URL}/verify", json=proof_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_valid_conjunction():
    """Test a valid conjunction introduction"""
    print("Testing valid conjunction introduction...")
    
    proof_data = {
        "gamma": "P, Q",    # Premises: P and Q
        "phi": "P∧Q",       # Conclusion: P and Q
        "proof": """P∧Q [1,2 ∧I]"""
    }
    
    response = requests.post(f"{BASE_URL}/verify", json=proof_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_conditional_proof():
    """Test a conditional proof with subproof"""
    print("Testing conditional proof...")
    
    proof_data = {
        "gamma": "P→Q",     # Premise: P implies Q
        "phi": "P→Q",       # Conclusion: P implies Q (trivial for testing)
        "proof": """P→Q [1 Reit]"""
    }
    
    response = requests.post(f"{BASE_URL}/verify", json=proof_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_invalid_proof():
    """Test an invalid proof"""
    print("Testing invalid proof...")
    
    proof_data = {
        "gamma": "P",       # Premise: P
        "phi": "Q",         # Conclusion: Q (doesn't follow)
        "proof": """Q [1 MP]"""  # Invalid application
    }
    
    response = requests.post(f"{BASE_URL}/verify", json=proof_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_complex_proof():
    """Test a more complex proof with subproofs"""
    print("Testing complex proof with subproofs...")
    
    proof_data = {
        "gamma": "",        # No premises
        "phi": "P→P",       # Conclusion: P implies P (tautology)
        "proof": """{
P [Assume]
}
P→P [1-2 →I]"""
    }
    
    response = requests.post(f"{BASE_URL}/verify", json=proof_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_invalid_sequent():
    """Test a proof attempt for an invalid sequent"""
    print("Testing invalid sequent (should generate countermodel)...")
    
    proof_data = {
        "gamma": "P∨Q",     # Premise: P or Q
        "phi": "P",         # Conclusion: P (doesn't necessarily follow)
        "proof": """P [1]"""
    }
    
    response = requests.post(f"{BASE_URL}/verify", json=proof_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

if __name__ == "__main__":
    print("=== Proof Checker Service Tests ===\n")
    
    try:
        test_health()
    except Exception as e:
        print(f"Health check failed: {e}")
        print("Make sure the proof checker service is running on port 5003")
        exit(1)
    
    test_valid_proof()
    test_valid_conjunction()
    test_conditional_proof()
    test_invalid_proof()
    test_complex_proof()
    test_invalid_sequent()
    
    print("\n=== Tests Complete ===")