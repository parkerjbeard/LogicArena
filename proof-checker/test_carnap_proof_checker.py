#!/usr/bin/env python3
"""Test script for the Carnap-compatible proof checker service"""

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

def test_simple_mp():
    """Test a simple modus ponens proof"""
    print("Testing simple modus ponens (Carnap syntax)...")
    
    proof_data = {
        "gamma": "P→Q, P",  # Premises: P implies Q, and P
        "phi": "Q",         # Conclusion: Q
        "proof": """Q    :MP 1,2"""  # Carnap syntax
    }
    
    response = requests.post(f"{BASE_URL}/verify", json=proof_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_conjunction():
    """Test conjunction introduction"""
    print("Testing conjunction introduction (Carnap syntax)...")
    
    proof_data = {
        "gamma": "P, Q",    # Premises: P and Q
        "phi": "P/\\Q",     # Conclusion: P and Q
        "proof": """P/\\Q    :&I 1,2"""
    }
    
    response = requests.post(f"{BASE_URL}/verify", json=proof_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_conditional_proof():
    """Test a conditional proof with show statement"""
    print("Testing conditional proof with show (Carnap syntax)...")
    
    proof_data = {
        "gamma": "",        # No premises
        "phi": "P->P",      # Conclusion: P implies P (tautology)
        "proof": """Show P->P
    P    :AS
:CD 2"""
    }
    
    response = requests.post(f"{BASE_URL}/verify", json=proof_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_complex_proof():
    """Test a more complex proof with nested shows"""
    print("Testing complex proof with nested shows...")
    
    proof_data = {
        "gamma": "",
        "phi": "P->(Q->P)",
        "proof": """Show P->(Q->P)
    P    :AS
    Show Q->P
        Q    :AS
        P    :R 2
    :CD 4
:CD 2-5"""
    }
    
    response = requests.post(f"{BASE_URL}/verify", json=proof_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_direct_derivation():
    """Test direct derivation"""
    print("Testing direct derivation...")
    
    proof_data = {
        "gamma": "P/\\Q",
        "phi": "P",
        "proof": """Show P
    P    :&E 1
:DD 2"""
    }
    
    response = requests.post(f"{BASE_URL}/verify", json=proof_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_space_indentation():
    """Test that space-based indentation is properly recognized"""
    print("Testing space-based indentation (4 spaces per level)...")
    
    # This proof uses exactly 4 spaces for indentation
    proof_data = {
        "gamma": "P->Q, Q->R",
        "phi": "P->R",
        "proof": """Show P->R
    P    :AS
    Q    :MP 1,2
    R    :MP 2,3
:CD 2-4"""
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
        "proof": """Q    :MP 1"""  # Invalid application
    }
    
    response = requests.post(f"{BASE_URL}/verify", json=proof_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_mixed_operators():
    """Test proof with various logical operators"""
    print("Testing proof with mixed operators...")
    
    proof_data = {
        "gamma": "P\\/Q, ~P",
        "phi": "Q",
        "proof": """Q    :MTP 1,2"""  # Modus Tollendo Ponens
    }
    
    response = requests.post(f"{BASE_URL}/verify", json=proof_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_syntax_guide():
    """Test the syntax guide endpoint"""
    print("Testing syntax guide endpoint...")
    response = requests.get(f"{BASE_URL}/syntax-guide")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

if __name__ == "__main__":
    print("=== Carnap-Compatible Proof Checker Tests ===\n")
    
    try:
        test_health()
    except Exception as e:
        print(f"Health check failed: {e}")
        print("Make sure the proof checker service is running on port 5003")
        exit(1)
    
    # Test basic proofs
    test_simple_mp()
    test_conjunction()
    test_conditional_proof()
    test_direct_derivation()
    
    # Test complex features
    test_complex_proof()
    test_space_indentation()
    test_mixed_operators()
    
    # Test error handling
    test_invalid_proof()
    
    # Test documentation
    test_syntax_guide()
    
    print("\n=== Tests Complete ===")
    print("\nKey features tested:")
    print("✓ Colon-based justifications (formula :rule lines)")
    print("✓ Show statements for subproofs")
    print("✓ Space-based indentation (4 spaces per level)")
    print("✓ QED lines (:DD, :CD, :ID)")
    print("✓ Carnap rule abbreviations (PR, AS, MP, etc.)")
    print("✓ Multiple operator notations (-> or →, /\\ or ∧, etc.)")