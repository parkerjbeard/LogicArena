#!/usr/bin/env python3
"""
Example script demonstrating the admin proof testing endpoints.

This script shows how to:
1. Test if a proof is valid
2. Test if a puzzle configuration is solvable
3. Generate machine proofs for puzzles
"""

import asyncio
import httpx
import json
from typing import Dict, Any


# Configuration
API_BASE_URL = "http://localhost:8000"
ADMIN_TOKEN = "your-admin-jwt-token-here"  # Replace with actual admin token


async def test_proof(gamma: str, phi: str, proof: str, best_len: int = None) -> Dict[str, Any]:
    """Test if a proof is valid for the given premises and conclusion."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_BASE_URL}/api/admin/test-proof",
            json={
                "gamma": gamma,
                "phi": phi,
                "proof": proof,
                "best_len": best_len
            },
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
        )
        response.raise_for_status()
        return response.json()


async def test_puzzle(gamma: str, phi: str, difficulty: int, best_len: int, generate_proof: bool = True) -> Dict[str, Any]:
    """Test if a puzzle configuration is valid and solvable."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_BASE_URL}/api/admin/test-puzzle",
            json={
                "gamma": gamma,
                "phi": phi,
                "difficulty": difficulty,
                "best_len": best_len,
                "generate_proof": generate_proof
            },
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
        )
        response.raise_for_status()
        return response.json()


async def main():
    """Run example tests."""
    print("LogicArena Admin Proof Testing Examples\n")
    print("=" * 50)
    
    # Example 1: Test a simple valid proof
    print("\n1. Testing a simple valid proof (Modus Ponens):")
    print("   Premises: P, P → Q")
    print("   Conclusion: Q")
    
    proof1 = """P :PR
P → Q :PR
Q :MP 1,2"""
    
    result1 = await test_proof("P, P → Q", "Q", proof1, best_len=3)
    print(f"\n   Valid: {result1['valid']}")
    print(f"   Lines: {result1.get('lines', 'N/A')}")
    print(f"   Rules used: {', '.join(result1.get('rules_used', []))}")
    if result1.get('optimality'):
        print(f"   Optimality score: {result1['optimality']['optimality_score']}%")
    
    # Example 2: Test an invalid proof
    print("\n\n2. Testing an invalid proof:")
    print("   Premises: P, Q → R")
    print("   Conclusion: R")
    
    proof2 = """P :PR
Q → R :PR
R :MP 1,2"""  # Invalid: P is not Q
    
    result2 = await test_proof("P, Q → R", "R", proof2)
    print(f"\n   Valid: {result2['valid']}")
    if result2.get('error'):
        print(f"   Error: {result2['error']}")
    if result2.get('counter_model'):
        print(f"   Counter-model: {json.dumps(result2['counter_model'], indent=2)}")
    
    # Example 3: Test a puzzle configuration
    print("\n\n3. Testing a puzzle configuration:")
    print("   Premises: P ∨ Q, P → R, Q → S")
    print("   Conclusion: R ∨ S")
    print("   Difficulty: 3, Best length: 5")
    
    result3 = await test_puzzle(
        "P ∨ Q, P → R, Q → S",
        "R ∨ S",
        difficulty=3,
        best_len=5,
        generate_proof=True
    )
    
    print(f"\n   Valid: {result3['valid']}")
    print(f"   Solvable: {result3['solvable']}")
    if result3.get('actual_best_len'):
        print(f"   Actual best length: {result3['actual_best_len']}")
        print(f"   Best length matches: {result3['best_len_matches']}")
    if result3.get('warnings'):
        print("   Warnings:")
        for warning in result3['warnings']:
            print(f"     - {warning}")
    if result3.get('machine_proof'):
        print(f"\n   Generated proof:")
        for line in result3['machine_proof'].split('\n'):
            print(f"     {line}")
    
    # Example 4: Test an unsolvable puzzle
    print("\n\n4. Testing an unsolvable puzzle:")
    print("   Premises: P")
    print("   Conclusion: Q")
    
    result4 = await test_puzzle("P", "Q", difficulty=1, best_len=1, generate_proof=False)
    
    print(f"\n   Valid: {result4['valid']}")
    print(f"   Solvable: {result4['solvable']}")
    if result4.get('counter_model'):
        print(f"   Counter-model: {json.dumps(result4['counter_model'], indent=2)}")
    if result4.get('warnings'):
        print("   Warnings:")
        for warning in result4['warnings']:
            print(f"     - {warning}")
    
    # Example 5: Test a complex proof with subproofs
    print("\n\n5. Testing a complex proof with conditional derivation:")
    print("   Premises: P → (Q → R)")
    print("   Conclusion: (P ∧ Q) → R")
    
    proof5 = """P → (Q → R) :PR
Show (P ∧ Q) → R
    P ∧ Q :AS
    P :∧E 3
    Q :∧E 3
    Q → R :→E 1,4
    R :→E 6,5
:CD 3-7"""
    
    result5 = await test_proof("P → (Q → R)", "(P ∧ Q) → R", proof5, best_len=8)
    print(f"\n   Valid: {result5['valid']}")
    print(f"   Depth: {result5.get('depth', 'N/A')}")
    if result5.get('syntax_info'):
        print(f"   Syntax: {result5['syntax_info']}")
    if result5.get('suggestions'):
        print("   Suggestions:")
        for suggestion in result5['suggestions']:
            print(f"     - {suggestion}")
    
    print("\n" + "=" * 50)
    print("Testing complete!")


if __name__ == "__main__":
    # Note: You need to replace ADMIN_TOKEN with a valid admin JWT token
    # You can get this by logging in as an admin user and checking the
    # access_token in localStorage or by using the login endpoint
    
    print("\nNOTE: This script requires:")
    print("1. The LogicArena API gateway running on localhost:8000")
    print("2. The proof-checker service running")
    print("3. A valid admin JWT token (update ADMIN_TOKEN in the script)")
    print("\nTo get an admin token, you can:")
    print("- Login as admin via the web UI and check localStorage")
    print("- Use: curl -X POST http://localhost:8000/api/auth/login/email \\")
    print('       -H "Content-Type: application/json" \\')
    print('       -d \'{"email": "admin@example.com", "password": "your-password"}\'')
    
    try:
        asyncio.run(main())
    except httpx.HTTPStatusError as e:
        print(f"\nError: {e}")
        print("Make sure you have a valid admin token and all services are running.")
    except Exception as e:
        print(f"\nUnexpected error: {e}")