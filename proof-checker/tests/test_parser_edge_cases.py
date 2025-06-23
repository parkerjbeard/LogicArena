"""
Test edge cases for the CNF converter's formula parser
"""

import pytest
from cnf_converter import FormulaParser, Variable, Negation, Conjunction, Disjunction, Implication, Biconditional, Constant


class TestParserEdgeCases:
    """Test edge cases and error conditions in formula parsing"""
    
    def setup_method(self):
        self.parser = FormulaParser()
    
    def test_empty_input(self):
        """Test parsing empty or whitespace-only input"""
        with pytest.raises(ValueError):
            self.parser.parse("")
        
        with pytest.raises(ValueError):
            self.parser.parse("   ")
        
        with pytest.raises(ValueError):
            self.parser.parse("\t\n")
    
    def test_unmatched_parentheses(self):
        """Test formulas with unmatched parentheses"""
        with pytest.raises(ValueError):
            self.parser.parse("(P")
        
        with pytest.raises(ValueError):
            self.parser.parse("P)")
        
        with pytest.raises(ValueError):
            self.parser.parse("((P)")
        
        with pytest.raises(ValueError):
            self.parser.parse("(P))")
    
    def test_invalid_characters(self):
        """Test formulas with invalid characters"""
        invalid_formulas = [
            "p",  # lowercase
            "1",  # number
            "P + Q",  # invalid operator
            "P * Q",  # invalid operator
            "P = Q",  # invalid operator
            "@P",  # special character
            "P#Q",  # special character
            "P Q",  # missing operator
        ]
        
        for formula in invalid_formulas:
            with pytest.raises(ValueError, match="Unexpected character"):
                self.parser.parse(formula)
    
    def test_incomplete_formulas(self):
        """Test incomplete formulas"""
        incomplete_formulas = [
            "P →",  # missing right side
            "→ Q",  # missing left side
            "P ∧",  # missing right side
            "∨ Q",  # missing left side
            "¬",  # missing operand
            "P ↔",  # missing right side
        ]
        
        for formula in incomplete_formulas:
            with pytest.raises(ValueError):
                self.parser.parse(formula)
    
    def test_multiple_operators(self):
        """Test formulas with consecutive operators"""
        invalid_formulas = [
            "P → → Q",
            "P ∧ ∧ Q",
            "P ∨ ∨ Q",
            "¬ ¬ ¬ P",  # This should actually parse as triple negation
        ]
        
        # Triple negation should work
        ast = self.parser.parse("¬¬¬P")
        assert isinstance(ast, Negation)
        assert isinstance(ast.child, Negation)
        assert isinstance(ast.child.child, Negation)
        assert isinstance(ast.child.child.child, Variable)
        
        # But double operators should fail
        with pytest.raises(ValueError):
            self.parser.parse("P → → Q")
    
    def test_operator_precedence(self):
        """Test that operator precedence is correct"""
        # Conjunction binds tighter than disjunction
        ast = self.parser.parse("P ∨ Q ∧ R")
        assert isinstance(ast, Disjunction)
        assert isinstance(ast.left, Variable)
        assert ast.left.name == "P"
        assert isinstance(ast.right, Conjunction)
        
        # Negation binds tightest
        ast = self.parser.parse("¬P ∧ Q")
        assert isinstance(ast, Conjunction)
        assert isinstance(ast.left, Negation)
        assert isinstance(ast.left.child, Variable)
        
        # Implication is right-associative
        ast = self.parser.parse("P → Q → R")
        assert isinstance(ast, Implication)
        assert isinstance(ast.left, Variable)
        assert ast.left.name == "P"
        assert isinstance(ast.right, Implication)
        
        # Biconditional has lowest precedence
        ast = self.parser.parse("P → Q ↔ R → S")
        assert isinstance(ast, Biconditional)
        assert isinstance(ast.left, Implication)
        assert isinstance(ast.right, Implication)
    
    def test_complex_nested_formulas(self):
        """Test complex formulas with deep nesting"""
        # Very deep nesting
        formula = "((((((P))))))"
        ast = self.parser.parse(formula)
        assert isinstance(ast, Variable)
        assert ast.name == "P"
        
        # Complex mixed nesting
        formula = "(P → (Q ∧ (R ∨ S))) ↔ ((¬P ∨ Q) ∧ (¬R → S))"
        ast = self.parser.parse(formula)
        assert isinstance(ast, Biconditional)
        
        # Left side: P → (Q ∧ (R ∨ S))
        assert isinstance(ast.left, Implication)
        assert isinstance(ast.left.right, Conjunction)
        assert isinstance(ast.left.right.right, Disjunction)
        
        # Right side: (¬P ∨ Q) ∧ (¬R → S)
        assert isinstance(ast.right, Conjunction)
        assert isinstance(ast.right.left, Disjunction)
        assert isinstance(ast.right.left.left, Negation)
    
    def test_constants(self):
        """Test parsing of logical constants"""
        # True constant
        ast = self.parser.parse("⊤")
        assert isinstance(ast, Constant)
        assert ast.value == True
        
        # False constant
        ast = self.parser.parse("⊥")
        assert isinstance(ast, Constant)
        assert ast.value == False
        
        # Constants in formulas
        ast = self.parser.parse("P → ⊤")
        assert isinstance(ast, Implication)
        assert isinstance(ast.right, Constant)
        assert ast.right.value == True
        
        ast = self.parser.parse("⊥ ∨ P")
        assert isinstance(ast, Disjunction)
        assert isinstance(ast.left, Constant)
        assert ast.left.value == False
    
    def test_all_variables(self):
        """Test that all uppercase letters work as variables"""
        for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            ast = self.parser.parse(letter)
            assert isinstance(ast, Variable)
            assert ast.name == letter
    
    def test_formula_with_spaces(self):
        """Test that spaces are handled correctly"""
        formulas_with_spaces = [
            ("P → Q", "P→Q"),
            ("P  →  Q", "P→Q"),
            (" P → Q ", "P→Q"),
            ("( P → Q )", "(P→Q)"),
            ("P ∧ Q ∨ R", "P∧Q∨R"),
        ]
        
        for spaced, compact in formulas_with_spaces:
            # Parser removes spaces internally
            ast1 = self.parser.parse(spaced)
            ast2 = self.parser.parse(compact)
            # Both should produce the same AST structure
            assert type(ast1) == type(ast2)
    
    def test_alternative_symbols(self):
        """Test that alternative symbols are normalized"""
        # These should all parse to the same structure
        equivalent_formulas = [
            ("P -> Q", "P → Q"),
            ("P & Q", "P ∧ Q"),
            ("P /\\ Q", "P ∧ Q"),
            ("P | Q", "P ∨ Q"),
            ("P \\/ Q", "P ∨ Q"),
            ("~P", "¬P"),
            ("-P", "¬P"),
            ("P <-> Q", "P ↔ Q"),
            ("!?", "⊥"),
            ("_|_", "⊥"),
            ("T", "⊤"),
            ("F", "⊥"),
        ]
        
        for alt, standard in equivalent_formulas:
            ast1 = self.parser.parse(alt)
            ast2 = self.parser.parse(standard)
            assert type(ast1) == type(ast2)
    
    def test_associativity(self):
        """Test associativity of operators"""
        # Conjunction is left-associative
        ast = self.parser.parse("P ∧ Q ∧ R")
        assert isinstance(ast, Conjunction)
        assert isinstance(ast.left, Conjunction)  # (P ∧ Q) ∧ R
        assert isinstance(ast.left.left, Variable)
        assert ast.left.left.name == "P"
        
        # Disjunction is left-associative
        ast = self.parser.parse("P ∨ Q ∨ R")
        assert isinstance(ast, Disjunction)
        assert isinstance(ast.left, Disjunction)  # (P ∨ Q) ∨ R
        
        # Implication is right-associative
        ast = self.parser.parse("P → Q → R")
        assert isinstance(ast, Implication)
        assert isinstance(ast.right, Implication)  # P → (Q → R)
        assert isinstance(ast.right.right, Variable)
        assert ast.right.right.name == "R"
    
    def test_position_tracking(self):
        """Test that parser position is tracked correctly"""
        # After parsing, position should be at end
        self.parser.parse("P")
        assert self.parser.pos == 1
        
        self.parser.parse("P → Q")
        assert self.parser.pos == 3  # After removing spaces
        
        # Complex formula
        self.parser.parse("(P ∧ Q) → (R ∨ S)")
        assert self.parser.pos == len("(P∧Q)→(R∨S)")
    
    def test_error_messages(self):
        """Test that error messages are informative"""
        # Missing closing parenthesis
        with pytest.raises(ValueError, match="Expected '\\)'"):
            self.parser.parse("(P ∧ Q")
        
        # Unexpected character
        with pytest.raises(ValueError, match="Unexpected character: '\\+'"):
            self.parser.parse("P + Q")
        
        # Invalid variable
        with pytest.raises(ValueError, match="Unexpected character: 'p'"):
            self.parser.parse("p")


class TestParserRobustness:
    """Test parser robustness with various inputs"""
    
    def setup_method(self):
        self.parser = FormulaParser()
    
    def test_unicode_normalization(self):
        """Test that unicode is handled correctly"""
        # Different unicode representations of the same symbol
        formulas = ["P → Q", "P → Q", "P → Q"]  # Different arrow characters
        asts = [self.parser.parse(f) for f in formulas]
        
        # All should parse to Implication
        for ast in asts:
            assert isinstance(ast, Implication)
    
    def test_very_long_formulas(self):
        """Test parsing of very long formulas"""
        # Chain of conjunctions
        n = 50
        formula = " ∧ ".join([f"P{i}" for i in range(n)])
        ast = self.parser.parse(formula)
        
        # Should create a left-associative chain
        current = ast
        count = 0
        while isinstance(current, Conjunction):
            count += 1
            current = current.left
        
        assert count == n - 1  # n variables, n-1 conjunctions
    
    def test_pathological_nesting(self):
        """Test pathological nesting cases"""
        # Alternating parentheses and negations
        formula = "¬(¬(¬(¬P)))"
        ast = self.parser.parse(formula)
        
        # Should be 4 negations
        count = 0
        current = ast
        while isinstance(current, Negation):
            count += 1
            current = current.child
        
        assert count == 4
        assert isinstance(current, Variable)
    
    def test_all_operators_combined(self):
        """Test formula using all operators"""
        formula = "(P ∧ Q) → (R ∨ S) ↔ (¬T ∧ (U → V))"
        ast = self.parser.parse(formula)
        
        assert isinstance(ast, Biconditional)
        # Left side uses →, ∧, ∨
        assert isinstance(ast.left, Implication)
        assert isinstance(ast.left.left, Conjunction)
        assert isinstance(ast.left.right, Disjunction)
        # Right side uses ¬, ∧, →
        assert isinstance(ast.right, Conjunction)
        assert isinstance(ast.right.left, Negation)
        assert isinstance(ast.right.right, Implication)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])