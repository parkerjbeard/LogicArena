"""
Test cases for the machine solver
"""

from machine_solver import MachineSolver

def test_simple_proofs():
    """Test simple proof finding"""
    solver = MachineSolver(max_depth=10)
    
    test_cases = [
        # Modus Ponens
        {
            'premises': ['P', 'P → Q'],
            'conclusion': 'Q',
            'expected_length': 1
        },
        # Modus Tollens
        {
            'premises': ['P → Q', '¬Q'],
            'conclusion': '¬P',
            'expected_length': 1
        },
        # Hypothetical Syllogism
        {
            'premises': ['P → Q', 'Q → R'],
            'conclusion': 'P → R',
            'expected_length': 3  # Assume P, derive R via MP twice, then →I
        },
        # Conjunction
        {
            'premises': ['P', 'Q'],
            'conclusion': 'P ∧ Q',
            'expected_length': 1
        },
        # Disjunction Intro
        {
            'premises': ['P'],
            'conclusion': 'P ∨ Q',
            'expected_length': 1
        }
    ]
    
    for i, test in enumerate(test_cases):
        print(f"\nTest {i+1}: {test['premises']} ⊢ {test['conclusion']}")
        
        proof = solver.find_proof(test['premises'], test['conclusion'])
        
        if proof:
            print("Proof found:")
            print(solver.format_proof(proof))
            
            # Count non-premise lines
            proof_length = len([line for line in proof if not (line.rule.value == "Assumption" and line.cited_lines == [])])
            print(f"Proof length: {proof_length} (expected: {test['expected_length']})")
        else:
            print("No proof found!")

def test_optimal_length_verification():
    """Test optimal length verification"""
    solver = MachineSolver(max_depth=15)
    
    puzzles = [
        {
            'premises': ['P → Q', 'Q → R', 'P'],
            'conclusion': 'R',
            'claimed_optimal': 2
        },
        {
            'premises': ['(P ∧ Q) → R', 'P', 'Q'],
            'conclusion': 'R',
            'claimed_optimal': 2
        },
        {
            'premises': ['P → (Q → R)', 'P', 'Q'],
            'conclusion': 'R',
            'claimed_optimal': 2
        }
    ]
    
    for i, puzzle in enumerate(puzzles):
        print(f"\n\nPuzzle {i+1}:")
        print(f"Premises: {puzzle['premises']}")
        print(f"Conclusion: {puzzle['conclusion']}")
        print(f"Claimed optimal length: {puzzle['claimed_optimal']}")
        
        result = solver.verify_optimal_length(
            puzzle['premises'],
            puzzle['conclusion'],
            puzzle['claimed_optimal']
        )
        
        if result['valid']:
            print(f"Found proof of length: {result['found_length']}")
            print(f"Is optimal claim correct? {result['is_optimal']}")
            print("\nProof:")
            print(result['proof'])
        else:
            print(f"Error: {result['error']}")

def test_complex_proof():
    """Test a more complex proof"""
    solver = MachineSolver(max_depth=20)
    
    # De Morgan's Law
    premises = ['¬(P ∧ Q)']
    conclusion = '¬P ∨ ¬Q'
    
    print("\n\nComplex proof test: De Morgan's Law")
    print(f"Premises: {premises}")
    print(f"Conclusion: {conclusion}")
    
    proof = solver.find_proof(premises, conclusion)
    
    if proof:
        print("\nProof found:")
        print(solver.format_proof(proof))
    else:
        print("No proof found (this is expected - De Morgan requires more sophisticated rules)")

def test_parse_formula():
    """Test formula parsing"""
    solver = MachineSolver()
    
    formulas = [
        "P",
        "¬P",
        "P ∧ Q",
        "P ∨ Q",
        "P → Q",
        "P ↔ Q",
        "(P → Q) ∧ (Q → R)",
        "¬(P ∨ Q)"
    ]
    
    print("\n\nFormula parsing test:")
    for formula in formulas:
        structure = solver.parse_formula_structure(formula)
        print(f"{formula}: {structure}")

if __name__ == "__main__":
    print("Testing Machine Solver for Natural Deduction")
    print("=" * 60)
    
    test_parse_formula()
    test_simple_proofs()
    test_optimal_length_verification()
    test_complex_proof()
    
    print("\n" + "=" * 60)
    print("Testing completed!")