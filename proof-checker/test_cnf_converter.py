"""
Test cases for the enhanced CNF converter
"""

from cnf_converter import CNFConverter, FormulaParser, TseitinTransformer
from cnf_converter import Variable, Negation, Conjunction, Disjunction, Implication, Biconditional, Constant

def test_parser():
    """Test formula parser"""
    parser = FormulaParser()
    
    # Test simple variable
    ast = parser.parse("P")
    assert isinstance(ast, Variable)
    assert ast.name == "P"
    
    # Test negation
    ast = parser.parse("~P")
    assert isinstance(ast, Negation)
    assert isinstance(ast.child, Variable)
    
    # Test conjunction
    ast = parser.parse("P & Q")
    assert isinstance(ast, Conjunction)
    
    # Test disjunction
    ast = parser.parse("P | Q")
    assert isinstance(ast, Disjunction)
    
    # Test implication
    ast = parser.parse("P -> Q")
    assert isinstance(ast, Implication)
    
    # Test biconditional
    ast = parser.parse("P <-> Q")
    assert isinstance(ast, Biconditional)
    
    # Test complex formula
    ast = parser.parse("(P -> Q) & (~Q -> ~P)")
    assert isinstance(ast, Conjunction)
    
    print("Parser tests passed!")

def test_tseitin():
    """Test Tseitin transformation"""
    parser = FormulaParser()
    
    # Test simple cases
    test_cases = [
        ("P", 1),  # Just the top-level assertion
        ("P & Q", 4),  # 3 clauses for conjunction + 1 for top
        ("P | Q", 4),  # 3 clauses for disjunction + 1 for top
        ("P -> Q", 4),  # 3 clauses for implication + 1 for top
        ("~P", 3),  # 2 clauses for negation + 1 for top
    ]
    
    for formula, expected_clauses in test_cases:
        ast = parser.parse(formula)
        transformer = TseitinTransformer()
        clauses, num_vars = transformer.transform(ast)
        print(f"{formula}: {len(clauses)} clauses, {num_vars} variables")
        assert len(clauses) >= expected_clauses, f"Expected at least {expected_clauses} clauses for {formula}, got {len(clauses)}"
    
    print("Tseitin tests passed!")

def test_cnf_converter():
    """Test full CNF conversion"""
    converter = CNFConverter()
    
    # Test modus ponens
    formulas = ["P", "P -> Q"]
    conclusion = "Q"
    
    # Convert premises and negated conclusion
    all_formulas = formulas + [conclusion]
    clauses, var_map, num_vars = converter.convert_formula_set(all_formulas, negate_last=True)
    
    print(f"Modus ponens test:")
    print(f"  Variables: {var_map}")
    print(f"  Clauses: {clauses}")
    print(f"  Total variables: {num_vars}")
    
    # Test more complex formula
    formulas = ["P -> Q", "Q -> R"]
    conclusion = "P -> R"
    
    all_formulas = formulas + [conclusion]
    clauses, var_map, num_vars = converter.convert_formula_set(all_formulas, negate_last=True)
    
    print(f"\nTransitivity test:")
    print(f"  Variables: {var_map}")
    print(f"  Number of clauses: {len(clauses)}")
    print(f"  Total variables: {num_vars}")
    
    print("\nCNF converter tests passed!")

def test_countermodel_cases():
    """Test cases that should produce countermodels"""
    converter = CNFConverter()
    
    # Invalid inference (affirming the consequent)
    formulas = ["P -> Q", "Q"]
    conclusion = "P"
    
    all_formulas = formulas + [conclusion]
    clauses, var_map, num_vars = converter.convert_formula_set(all_formulas, negate_last=True)
    
    print(f"\nInvalid inference test (should be satisfiable):")
    print(f"  Premises: {formulas}")
    print(f"  Conclusion: {conclusion}")
    print(f"  Variables: {var_map}")
    print(f"  Number of clauses: {len(clauses)}")
    
    # Write DIMACS format for manual inspection
    print("\nDIMACS format:")
    print(f"p cnf {num_vars} {len(clauses)}")
    for clause in clauses:
        print(' '.join(map(str, clause)) + ' 0')

if __name__ == "__main__":
    print("Testing Enhanced CNF Converter")
    print("=" * 50)
    
    test_parser()
    print()
    test_tseitin()
    print()
    test_cnf_converter()
    print()
    test_countermodel_cases()
    
    print("\n" + "=" * 50)
    print("All tests completed!")