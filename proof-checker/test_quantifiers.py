"""
Test cases for quantifier logic rules in the proof checker
"""

import requests
import json

# Test Universal Introduction (∀I)
def test_universal_intro():
    """Test ∀I: From P(a) where 'a' is arbitrary, infer ∀x.P(x)"""
    proof_request = {
        "gamma": "",  # No premises
        "phi": "∀x.P(x)",
        "proof": """show ∀x.P(x)
  P(a) :AS
  ∀x.P(x) :UI 2"""
    }
    
    response = requests.post(
        "http://localhost:8003/check",
        json=proof_request
    )
    
    result = response.json()
    print("Test ∀I:", result)
    return result['ok']

# Test Universal Elimination (∀E)
def test_universal_elim():
    """Test ∀E: From ∀x.P(x), infer P(t) for any term t"""
    proof_request = {
        "gamma": "∀x.P(x)",
        "phi": "P(a)",
        "proof": """P(a) :UE 1"""
    }
    
    response = requests.post(
        "http://localhost:8003/check",
        json=proof_request
    )
    
    result = response.json()
    print("Test ∀E:", result)
    return result['ok']

# Test Existential Introduction (∃I)
def test_existential_intro():
    """Test ∃I: From P(t), infer ∃x.P(x)"""
    proof_request = {
        "gamma": "P(a)",
        "phi": "∃x.P(x)",
        "proof": """∃x.P(x) :EI 1"""
    }
    
    response = requests.post(
        "http://localhost:8003/check",
        json=proof_request
    )
    
    result = response.json()
    print("Test ∃I:", result)
    return result['ok']

# Test Existential Elimination (∃E)
def test_existential_elim():
    """Test ∃E: From ∃x.P(x) and subproof P(a) ⊢ Q, infer Q"""
    proof_request = {
        "gamma": "∃x.P(x), ∀x.(P(x)→Q)",
        "phi": "Q",
        "proof": """show Q
  P(a) :AS
  ∀x.(P(x)→Q) :R 2
  P(a)→Q :UE 4
  Q :MP 3,5
:EE 1,3-6"""
    }
    
    response = requests.post(
        "http://localhost:8003/check",
        json=proof_request
    )
    
    result = response.json()
    print("Test ∃E:", result)
    return result['ok']

# Test complex quantifier proof
def test_complex_quantifier():
    """Test complex proof with multiple quantifiers"""
    proof_request = {
        "gamma": "∀x.(P(x)→Q(x)), ∃x.P(x)",
        "phi": "∃x.Q(x)",
        "proof": """show ∃x.Q(x)
  P(a) :AS
  ∀x.(P(x)→Q(x)) :R 1
  P(a)→Q(a) :UE 4
  Q(a) :MP 3,5
  ∃x.Q(x) :EI 6
:EE 2,3-7"""
    }
    
    response = requests.post(
        "http://localhost:8003/check",
        json=proof_request
    )
    
    result = response.json()
    print("Test Complex:", result)
    return result['ok']

if __name__ == "__main__":
    print("Testing Quantifier Logic Rules...")
    print("=" * 50)
    
    try:
        all_pass = True
        all_pass &= test_universal_elim()
        all_pass &= test_existential_intro()
        all_pass &= test_universal_intro()
        all_pass &= test_existential_elim()
        all_pass &= test_complex_quantifier()
        
        print("=" * 50)
        print("All tests passed!" if all_pass else "Some tests failed!")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to proof checker service at localhost:8003")
        print("Make sure the proof checker is running with: cd proof-checker && python app.py")