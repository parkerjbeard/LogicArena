#!/usr/bin/env python3
"""Test script comparing our syntax with Carnap syntax"""

import requests
import json

BASE_URL = "http://localhost:5003"

def test_comparison():
    """Compare our syntax with Carnap syntax"""
    
    print("=== Syntax Comparison Test ===\n")
    
    # Test 1: Simple Modus Ponens
    print("1. MODUS PONENS")
    print("-" * 50)
    
    # Our current syntax
    print("Our Current Syntax:")
    proof_data_ours = {
        "gamma": "P→Q, P",
        "phi": "Q",
        "proof": """Q [1,2 MP]"""
    }
    print(f"Proof:\n{proof_data_ours['proof']}")
    
    # Carnap syntax
    print("\nCarnap Syntax:")
    proof_data_carnap = {
        "gamma": "P→Q, P",
        "phi": "Q",
        "proof": """Q    :MP 1,2"""
    }
    print(f"Proof:\n{proof_data_carnap['proof']}")
    print()
    
    # Test 2: Conditional Proof
    print("2. CONDITIONAL PROOF")
    print("-" * 50)
    
    # Our current syntax
    print("Our Current Syntax:")
    proof_data_ours = {
        "gamma": "",
        "phi": "P→P",
        "proof": """{
P [Assume]
}
P→P [1-2 →I]"""
    }
    print(f"Proof:\n{proof_data_ours['proof']}")
    
    # Carnap syntax
    print("\nCarnap Syntax:")
    proof_data_carnap = {
        "gamma": "",
        "phi": "P->P",
        "proof": """Show P->P
    P    :AS
:CD 2"""
    }
    print(f"Proof:\n{proof_data_carnap['proof']}")
    print()
    
    # Test 3: Complex proof with conjunction
    print("3. CONJUNCTION INTRODUCTION")
    print("-" * 50)
    
    # Our current syntax
    print("Our Current Syntax:")
    proof_data_ours = {
        "gamma": "P, Q",
        "phi": "P∧Q",
        "proof": """P∧Q [1,2 ∧I]"""
    }
    print(f"Proof:\n{proof_data_ours['proof']}")
    
    # Carnap syntax
    print("\nCarnap Syntax:")
    proof_data_carnap = {
        "gamma": "P, Q",
        "phi": "P/\\Q",
        "proof": """P/\\Q    :&I 1,2"""
    }
    print(f"Proof:\n{proof_data_carnap['proof']}")
    print()
    
    # Test 4: Nested subproofs
    print("4. NESTED SUBPROOFS")
    print("-" * 50)
    
    # Our current syntax
    print("Our Current Syntax:")
    proof_data_ours = {
        "gamma": "",
        "phi": "P→(Q→P)",
        "proof": """{
P [Assume]
{
Q [Assume]
P [2 Reit]
}
Q→P [3-5 →I]
}
P→(Q→P) [2-6 →I]"""
    }
    print(f"Proof:\n{proof_data_ours['proof']}")
    
    # Carnap syntax (with indentation)
    print("\nCarnap Syntax:")
    proof_data_carnap = {
        "gamma": "",
        "phi": "P->(Q->P)",
        "proof": """Show P->(Q->P)
    P    :AS
    Show Q->P
        Q    :AS
        P    :R 2
    :CD 4
:CD 2"""
    }
    print(f"Proof:\n{proof_data_carnap['proof']}")
    print()

def test_carnap_syntax_validation():
    """Test if Carnap syntax can be validated"""
    
    print("\n=== Testing Carnap Syntax Validation ===\n")
    
    test_cases = [
        {
            "name": "Simple MP",
            "data": {
                "gamma": "P->Q, P",
                "phi": "Q",
                "proof": "Q    :MP 1,2"
            }
        },
        {
            "name": "Conjunction",
            "data": {
                "gamma": "P, Q",
                "phi": "P/\\Q",
                "proof": "P/\\Q    :&I 1,2"
            }
        },
        {
            "name": "Conditional Proof",
            "data": {
                "gamma": "",
                "phi": "P->P",
                "proof": """Show P->P
    P    :AS
:CD 2"""
            }
        },
        {
            "name": "Reiteration",
            "data": {
                "gamma": "P",
                "phi": "P",
                "proof": "P    :R 1"
            }
        }
    ]
    
    for test in test_cases:
        print(f"Testing: {test['name']}")
        print(f"Proof:\n{test['data']['proof']}")
        
        # This would need the Carnap-compatible checker running
        # response = requests.post(f"{BASE_URL}/verify", json=test['data'])
        # print(f"Result: {'✓ Valid' if response.json().get('ok') else '✗ Invalid'}")
        print("(Would be validated with Carnap-compatible checker)")
        print("-" * 30)
        print()

if __name__ == "__main__":
    print("CARNAP SYNTAX COMPATIBILITY TEST")
    print("=" * 60)
    print()
    
    test_comparison()
    test_carnap_syntax_validation()
    
    print("\nKEY DIFFERENCES:")
    print("1. Justification format: [rule lines] vs :rule lines")
    print("2. Premise notation: [Premise] vs :PR")
    print("3. Assumption notation: [Assume] vs :AS")
    print("4. Subproof notation: {...} vs indentation + show")
    print("5. Rule order: lines before rule vs rule before lines")
    print()
    print("To make LogicArena compatible with Carnap, we need to:")
    print("- Update the parser to handle ':' justification separator")
    print("- Support 'show' statements and indentation-based subproofs")
    print("- Accept Carnap rule abbreviations (PR, AS, MP, etc.)")
    print("- Handle QED lines for closing subproofs")