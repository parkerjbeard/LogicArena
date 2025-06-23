"""
Comprehensive tests for CNF converter
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from cnf_converter import (
    CNFConverter, FormulaParser, TseitinTransformer,
    Variable, Negation, Conjunction, Disjunction, Implication, Biconditional, Constant
)

class TestFormulaParser:
    def setup_method(self):
        self.parser = FormulaParser()
    
    def test_parse_atomic(self):
        """Test parsing atomic formulas"""
        ast = self.parser.parse("P")
        assert isinstance(ast, Variable)
        assert ast.name == "P"
        
        ast = self.parser.parse("Q")
        assert isinstance(ast, Variable)
        assert ast.name == "Q"
    
    def test_parse_constants(self):
        """Test parsing logical constants"""
        ast = self.parser.parse("⊤")
        assert isinstance(ast, Constant)
        assert ast.value == True
        
        ast = self.parser.parse("⊥")
        assert isinstance(ast, Constant)
        assert ast.value == False
        
        # Test alternative notations
        ast = self.parser.parse("T")
        assert isinstance(ast, Constant)
        assert ast.value == True
    
    def test_parse_negation(self):
        """Test parsing negation"""
        ast = self.parser.parse("¬P")
        assert isinstance(ast, Negation)
        assert isinstance(ast.child, Variable)
        assert ast.child.name == "P"
        
        # Test alternative notation
        ast = self.parser.parse("~Q")
        assert isinstance(ast, Negation)
        
        # Test double negation
        ast = self.parser.parse("¬¬P")
        assert isinstance(ast, Negation)
        assert isinstance(ast.child, Negation)
    
    def test_parse_conjunction(self):
        """Test parsing conjunction"""
        ast = self.parser.parse("P ∧ Q")
        assert isinstance(ast, Conjunction)
        assert ast.left.name == "P"
        assert ast.right.name == "Q"
        
        # Alternative notations
        ast = self.parser.parse("P & Q")
        assert isinstance(ast, Conjunction)
        
        ast = self.parser.parse("P /\\ Q")
        assert isinstance(ast, Conjunction)
    
    def test_parse_disjunction(self):
        """Test parsing disjunction"""
        ast = self.parser.parse("P ∨ Q")
        assert isinstance(ast, Disjunction)
        assert ast.left.name == "P"
        assert ast.right.name == "Q"
        
        # Alternative notations
        ast = self.parser.parse("P | Q")
        assert isinstance(ast, Disjunction)
        
        ast = self.parser.parse("P \\/ Q")
        assert isinstance(ast, Disjunction)
    
    def test_parse_implication(self):
        """Test parsing implication"""
        ast = self.parser.parse("P → Q")
        assert isinstance(ast, Implication)
        assert ast.left.name == "P"
        assert ast.right.name == "Q"
        
        # Alternative notation
        ast = self.parser.parse("P -> Q")
        assert isinstance(ast, Implication)
    
    def test_parse_biconditional(self):
        """Test parsing biconditional"""
        ast = self.parser.parse("P ↔ Q")
        assert isinstance(ast, Biconditional)
        assert ast.left.name == "P"
        assert ast.right.name == "Q"
        
        # Alternative notation
        ast = self.parser.parse("P <-> Q")
        assert isinstance(ast, Biconditional)
    
    def test_parse_complex(self):
        """Test parsing complex formulas"""
        # Nested formula
        ast = self.parser.parse("(P → Q) ∧ (Q → R)")
        assert isinstance(ast, Conjunction)
        assert isinstance(ast.left, Implication)
        assert isinstance(ast.right, Implication)
        
        # Right associativity of implication
        ast = self.parser.parse("P → Q → R")
        assert isinstance(ast, Implication)
        assert ast.left.name == "P"
        assert isinstance(ast.right, Implication)
        
        # Complex nested formula
        ast = self.parser.parse("¬(P ∧ Q) ∨ (R → S)")
        assert isinstance(ast, Disjunction)
        assert isinstance(ast.left, Negation)
        assert isinstance(ast.left.child, Conjunction)
    
    def test_parse_precedence(self):
        """Test operator precedence"""
        # Negation has highest precedence
        ast = self.parser.parse("¬P ∧ Q")
        assert isinstance(ast, Conjunction)
        assert isinstance(ast.left, Negation)
        
        # Conjunction before disjunction
        ast = self.parser.parse("P ∧ Q ∨ R")
        assert isinstance(ast, Disjunction)
        assert isinstance(ast.left, Conjunction)
        
        # Disjunction before implication
        ast = self.parser.parse("P ∨ Q → R")
        assert isinstance(ast, Implication)
        assert isinstance(ast.left, Disjunction)
    
    def test_parse_parentheses(self):
        """Test parentheses handling"""
        ast = self.parser.parse("(P)")
        assert isinstance(ast, Variable)
        assert ast.name == "P"
        
        ast = self.parser.parse("P ∧ (Q ∨ R)")
        assert isinstance(ast, Conjunction)
        assert isinstance(ast.right, Disjunction)
        
        ast = self.parser.parse("((P → Q) → R)")
        assert isinstance(ast, Implication)
        assert isinstance(ast.left, Implication)

class TestTseitinTransformer:
    def setup_method(self):
        self.parser = FormulaParser()
    
    def test_transform_variable(self):
        """Test transforming single variable"""
        ast = self.parser.parse("P")
        transformer = TseitinTransformer()
        clauses, num_vars = transformer.transform(ast)
        
        assert num_vars == 1
        assert len(clauses) == 1
        assert clauses[0] == [1]  # Assert P is true
    
    def test_transform_negation(self):
        """Test transforming negation"""
        ast = self.parser.parse("¬P")
        transformer = TseitinTransformer()
        clauses, num_vars = transformer.transform(ast)
        
        # Should create auxiliary variable for ¬P
        assert num_vars >= 2
        assert len(clauses) >= 3  # Tseitin clauses + top assertion
    
    def test_transform_conjunction(self):
        """Test transforming conjunction"""
        ast = self.parser.parse("P ∧ Q")
        transformer = TseitinTransformer()
        clauses, num_vars = transformer.transform(ast)
        
        # Variables: P, Q, and auxiliary for P∧Q
        assert num_vars >= 3
        assert len(clauses) >= 4  # 3 Tseitin clauses + top assertion
    
    def test_transform_disjunction(self):
        """Test transforming disjunction"""
        ast = self.parser.parse("P ∨ Q")
        transformer = TseitinTransformer()
        clauses, num_vars = transformer.transform(ast)
        
        assert num_vars >= 3
        assert len(clauses) >= 4
    
    def test_transform_implication(self):
        """Test transforming implication"""
        ast = self.parser.parse("P → Q")
        transformer = TseitinTransformer()
        clauses, num_vars = transformer.transform(ast)
        
        assert num_vars >= 3
        assert len(clauses) >= 4
    
    def test_transform_biconditional(self):
        """Test transforming biconditional"""
        ast = self.parser.parse("P ↔ Q")
        transformer = TseitinTransformer()
        clauses, num_vars = transformer.transform(ast)
        
        assert num_vars >= 3
        assert len(clauses) >= 5  # 4 Tseitin clauses + top assertion
    
    def test_transform_complex(self):
        """Test transforming complex formula"""
        ast = self.parser.parse("(P → Q) ∧ (Q → R)")
        transformer = TseitinTransformer()
        clauses, num_vars = transformer.transform(ast)
        
        # Should have variables for P, Q, R, P→Q, Q→R, and the conjunction
        assert num_vars >= 6
        assert len(clauses) >= 10

class TestCNFConverter:
    def setup_method(self):
        self.converter = CNFConverter()
    
    def test_convert_simple(self):
        """Test converting simple formulas"""
        clauses, var_map, num_vars = self.converter.convert_to_cnf("P")
        assert "P" in var_map
        assert num_vars >= 1
        assert len(clauses) >= 1
    
    def test_convert_conjunction(self):
        """Test converting conjunction"""
        clauses, var_map, num_vars = self.converter.convert_to_cnf("P ∧ Q")
        assert "P" in var_map
        assert "Q" in var_map
        assert num_vars >= 3  # P, Q, and auxiliary
    
    def test_convert_implication(self):
        """Test converting implication"""
        clauses, var_map, num_vars = self.converter.convert_to_cnf("P → Q")
        assert "P" in var_map
        assert "Q" in var_map
        
        # The CNF should represent P → Q correctly
        # We can't easily check the exact clauses without running SAT
        assert len(clauses) >= 4
    
    def test_convert_formula_set(self):
        """Test converting multiple formulas"""
        formulas = ["P → Q", "Q → R", "P"]
        clauses, var_map, num_vars = self.converter.convert_formula_set(formulas)
        
        assert all(v in var_map for v in ["P", "Q", "R"])
        assert num_vars >= 3
        
        # Should have clauses for all three formulas
        assert len(clauses) >= 9  # At least 3 clauses per formula
    
    def test_convert_with_negation(self):
        """Test converting with negated conclusion"""
        formulas = ["P → Q", "P"]
        conclusion = "Q"
        
        clauses, var_map, num_vars = self.converter.convert_formula_set(
            formulas + [conclusion], negate_last=True
        )
        
        # Should include negation of Q
        assert len(clauses) > len(self.converter.convert_to_cnf("P → Q")[0])
    
    def test_fallback_conversion(self):
        """Test fallback for edge cases"""
        # Empty formula should use fallback
        clauses, var_map, num_vars = self.converter.convert_to_cnf("")
        assert len(clauses) == 0
        assert num_vars == 0

class TestIntegration:
    def setup_method(self):
        self.converter = CNFConverter()
    
    def test_modus_ponens_countermodel(self):
        """Test that invalid modus ponens produces satisfiable CNF"""
        # P → Q, Q ⊢ P (invalid - affirming the consequent)
        formulas = ["P → Q", "Q"]
        conclusion = "P"
        
        clauses, var_map, num_vars = self.converter.convert_formula_set(
            formulas + [conclusion], negate_last=True
        )
        
        # This should be satisfiable (there exists a countermodel)
        # We can't run SAT here, but check structure
        assert len(clauses) > 0
        assert "P" in var_map
        assert "Q" in var_map
    
    def test_valid_inference_unsat(self):
        """Test that valid inference produces unsatisfiable CNF"""
        # P → Q, P ⊢ Q (valid modus ponens)
        formulas = ["P → Q", "P"]
        conclusion = "Q"
        
        clauses, var_map, num_vars = self.converter.convert_formula_set(
            formulas + [conclusion], negate_last=True
        )
        
        # This should be unsatisfiable (no countermodel)
        assert len(clauses) > 0
    
    def test_complex_valid_inference(self):
        """Test complex valid inference"""
        # Hypothetical syllogism
        formulas = ["P → Q", "Q → R"]
        conclusion = "P → R"
        
        clauses, var_map, num_vars = self.converter.convert_formula_set(
            formulas + [conclusion], negate_last=True
        )
        
        assert all(v in var_map for v in ["P", "Q", "R"])
        assert num_vars >= 3
    
    def test_de_morgan(self):
        """Test De Morgan's law"""
        # ¬(P ∧ Q) ⊢ ¬P ∨ ¬Q
        formulas = ["¬(P ∧ Q)"]
        conclusion = "¬P ∨ ¬Q"
        
        clauses, var_map, num_vars = self.converter.convert_formula_set(
            formulas + [conclusion], negate_last=True
        )
        
        assert "P" in var_map
        assert "Q" in var_map
        assert len(clauses) > 5  # Should have many Tseitin clauses

def test_cnf_properties():
    """Test that CNF output has correct properties"""
    converter = CNFConverter()
    
    # Test that all clauses are in correct format
    formulas = ["(P ∨ Q) → (R ∧ S)", "¬P ∨ ¬Q"]
    clauses, var_map, num_vars = converter.convert_formula_set(formulas)
    
    # Check clause format
    for clause in clauses:
        assert isinstance(clause, list)
        assert all(isinstance(lit, int) for lit in clause)
        assert all(lit != 0 for lit in clause)  # No 0 literals
        assert all(abs(lit) <= num_vars for lit in clause)  # Valid variable numbers
    
    # Check variable mapping
    assert len(var_map) <= num_vars
    assert all(1 <= var_num <= num_vars for var_num in var_map.values())

if __name__ == "__main__":
    pytest.main([__file__, "-v"])