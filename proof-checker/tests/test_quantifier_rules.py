"""
Comprehensive tests for quantifier logic rules
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from quantifier_rules import QuantifierHandler, QuantifiedFormula

class TestQuantifierHandler:
    def setup_method(self):
        self.handler = QuantifierHandler()
    
    def test_parse_quantified_formula(self):
        """Test parsing of quantified formulas"""
        test_cases = [
            # Input, Expected quantifier, variable, formula
            ("∀x.P(x)", "∀", "x", "P(x)"),
            ("∃y.Q(y)", "∃", "y", "Q(y)"),
            ("∀x:P(x)", "∀", "x", "P(x)"),  # Colon notation
            ("∀x P(x)", "∀", "x", "P(x)"),  # Space notation
            ("forall x.P(x)", "∀", "x", "P(x)"),  # Word notation
            ("exists y.Q(y)", "∃", "y", "Q(y)"),
            ("∀(x).R(x,y)", "∀", "x", "R(x,y)"),  # Parentheses
        ]
        
        for formula, expected_q, expected_v, expected_f in test_cases:
            result = self.handler.parse_quantified_formula(formula)
            assert result is not None, f"Failed to parse: {formula}"
            assert result.quantifier == expected_q
            assert result.variable == expected_v
            assert result.formula == expected_f
    
    def test_extract_free_variables(self):
        """Test extraction of free variables"""
        test_cases = [
            ("P(x)", {"x"}),
            ("P(x,y)", {"x", "y"}),
            ("∀x.P(x)", set()),  # x is bound
            ("∀x.P(x,y)", {"y"}),  # only y is free
            ("P(x) ∧ Q(y)", {"x", "y"}),
            ("∀x.(P(x) → Q(y))", {"y"}),
            ("R(a,b,c)", {"a", "b", "c"}),
        ]
        
        for formula, expected in test_cases:
            result = self.handler.extract_free_variables(formula)
            assert result == expected, f"Formula: {formula}, Expected: {expected}, Got: {result}"
    
    def test_substitute(self):
        """Test variable substitution"""
        test_cases = [
            # (formula, var, term, expected)
            ("P(x)", "x", "a", "P(a)"),
            ("P(x,y)", "x", "b", "P(b,y)"),
            ("P(x) ∧ Q(x)", "x", "c", "P(c) ∧ Q(c)"),
            ("R(x,y,z)", "y", "a", "R(x,a,z)"),
            ("P(x,x)", "x", "t", "P(t,t)"),  # Multiple occurrences
        ]
        
        for formula, var, term, expected in test_cases:
            result = self.handler.substitute(formula, var, term)
            assert result == expected, f"Substitute {var}→{term} in {formula}: Expected {expected}, Got {result}"
    
    def test_would_capture(self):
        """Test variable capture detection"""
        test_cases = [
            # (formula, var, term, should_capture)
            ("∀x.P(x)", "y", "x", True),  # Would capture x
            ("∀x.P(x)", "y", "z", False),  # No capture
            ("∃y.Q(y)", "x", "y", True),  # Would capture y
            ("P(x)", "x", "y", False),  # No quantifiers, no capture
        ]
        
        for formula, var, term, should_capture in test_cases:
            result = self.handler.would_capture(formula, var, term)
            assert result == should_capture, f"Capture test failed for {formula}"
    
    def test_is_arbitrary_constant(self):
        """Test arbitrary constant checking"""
        # Constant 'a' is arbitrary if it doesn't appear in context
        assert self.handler.is_arbitrary_constant("a", [])
        assert self.handler.is_arbitrary_constant("b", ["P(a)", "Q(c)"])
        assert not self.handler.is_arbitrary_constant("a", ["P(a)"])
        assert not self.handler.is_arbitrary_constant("x", ["∀y.R(x,y)"])
    
    def test_validate_universal_intro(self):
        """Test Universal Introduction validation"""
        test_cases = [
            # (premise, conclusion, arbitrary_const, context, should_be_valid)
            ("P(a)", "∀x.P(x)", "a", [], True),  # Valid: a is arbitrary
            ("P(a)", "∀x.P(x)", "a", ["Q(a)"], False),  # Invalid: a appears in context
            ("P(b)", "∀x.P(x)", "b", [], True),  # Valid with different constant
            ("Q(a,b)", "∀x.Q(x,b)", "a", [], True),  # Partial generalization
            ("P(a)", "∀y.P(y)", "a", [], True),  # Different variable name is OK
        ]
        
        for premise, conclusion, const, context, should_be_valid in test_cases:
            valid, error = self.handler.validate_universal_intro(premise, conclusion, const, context)
            assert valid == should_be_valid, f"∀I validation failed: {premise} → {conclusion}, Error: {error}"
    
    def test_validate_universal_elim(self):
        """Test Universal Elimination validation"""
        test_cases = [
            # (premise, conclusion, term, should_be_valid)
            ("∀x.P(x)", "P(a)", "a", True),
            ("∀x.P(x)", "P(b)", "b", True),
            ("∀y.Q(y)", "Q(c)", "c", True),
            ("∀x.R(x,y)", "R(a,y)", "a", True),
            ("∀x.P(x)", "P(y)", "y", True),  # Can instantiate with variable
            ("P(a)", "P(b)", "b", False),  # Not a universal formula
        ]
        
        for premise, conclusion, term, should_be_valid in test_cases:
            valid, error = self.handler.validate_universal_elim(premise, conclusion, term)
            assert valid == should_be_valid, f"∀E validation failed: {premise} → {conclusion}, Error: {error}"
    
    def test_validate_existential_intro(self):
        """Test Existential Introduction validation"""
        test_cases = [
            # (premise, conclusion, should_be_valid)
            ("P(a)", "∃x.P(x)", True),
            ("P(b)", "∃x.P(x)", True),
            ("Q(a,b)", "∃x.Q(x,b)", True),
            ("Q(a,b)", "∃y.Q(a,y)", True),
            ("P(a)", "∃x.Q(x)", False),  # Different predicate
            ("P(a)", "∀x.P(x)", False),  # Wrong quantifier
        ]
        
        for premise, conclusion, should_be_valid in test_cases:
            valid, error = self.handler.validate_existential_intro(premise, conclusion)
            assert valid == should_be_valid, f"∃I validation failed: {premise} → {conclusion}, Error: {error}"
    
    def test_validate_existential_elim(self):
        """Test Existential Elimination validation"""
        test_cases = [
            # Complex rule - testing basic cases
            ("∃x.P(x)", "P(a)", "Q", "Q", "a", True),  # Valid basic case
            ("∃x.P(x)", "P(b)", "Q", "Q", "b", True),  # Different constant
            ("∃x.P(x)", "P(a)", "Q(a)", "Q(a)", "a", False),  # Constant appears in conclusion
            ("P(a)", "P(a)", "Q", "Q", "a", False),  # Not existential
        ]
        
        for exist_prem, assumption, subproof_conc, final_conc, fresh, should_be_valid in test_cases:
            valid, error = self.handler.validate_existential_elim(
                exist_prem, assumption, subproof_conc, final_conc, fresh
            )
            assert valid == should_be_valid, f"∃E validation failed, Error: {error}"
    
    def test_normalize_formula(self):
        """Test formula normalization"""
        test_cases = [
            ("P", "P"),
            ("P & Q", "P ∧ Q"),
            ("P | Q", "P ∨ Q"),
            ("P -> Q", "P → Q"),
            ("~P", "¬P"),
            ("forall x.P(x)", "∀x.P(x)"),
            ("exists y.Q(y)", "∃y.Q(y)"),
            ("P   &   Q", "P ∧ Q"),  # Extra spaces
        ]
        
        for input_f, expected in test_cases:
            result = self.handler.normalize_formula(input_f)
            assert result == expected, f"Normalization failed: {input_f} → {result}, expected {expected}"
    
    def test_fresh_variable_generation(self):
        """Test fresh variable generation"""
        vars = []
        for _ in range(10):
            var = self.handler.get_fresh_variable()
            assert var not in vars, f"Generated duplicate variable: {var}"
            vars.append(var)
            assert len(var) == 1 and var.islower(), f"Invalid variable format: {var}"

def test_integration_with_proof_checker():
    """Test integration scenarios"""
    handler = QuantifierHandler()
    
    # Simulate a proof sequence
    context = ["∀x.P(x)", "∀x.(P(x) → Q(x))"]
    
    # Universal elimination
    valid, _ = handler.validate_universal_elim("∀x.P(x)", "P(a)", "a")
    assert valid
    
    # Another universal elimination
    valid, _ = handler.validate_universal_elim("∀x.(P(x) → Q(x))", "P(a) → Q(a)", "a")
    assert valid
    
    # Now we should be able to derive Q(a) via modus ponens
    # Then use universal introduction if 'a' was arbitrary
    context_for_ui = ["∀x.P(x)", "∀x.(P(x) → Q(x))"]  # 'a' doesn't appear
    valid, _ = handler.validate_universal_intro("Q(a)", "∀x.Q(x)", "a", context_for_ui)
    assert valid

if __name__ == "__main__":
    pytest.main([__file__, "-v"])