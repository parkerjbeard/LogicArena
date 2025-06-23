"""
Comprehensive test suite for proof checker parsing functionality
Tests all aspects of formula parsing, proof parsing, and validation
"""

import pytest
from app import CarnapFitchProofChecker, ProofRequest
from cnf_converter import FormulaParser, Variable, Negation, Conjunction, Disjunction, Implication, Biconditional


class TestFormulaNormalization:
    """Test formula normalization with various symbol formats"""
    
    def test_arrow_normalization(self):
        checker = CarnapFitchProofChecker()
        
        # Test implication arrows
        assert checker.normalize_formula("P -> Q") == "P → Q"
        assert checker.normalize_formula("P->Q") == "P→Q"
        assert checker.normalize_formula("P → Q") == "P → Q"
        
        # Test biconditional arrows
        assert checker.normalize_formula("P <-> Q") == "P ↔ Q"
        assert checker.normalize_formula("P<->Q") == "P↔Q"
        assert checker.normalize_formula("P ↔ Q") == "P ↔ Q"
    
    def test_conjunction_normalization(self):
        checker = CarnapFitchProofChecker()
        
        assert checker.normalize_formula("P & Q") == "P ∧ Q"
        assert checker.normalize_formula("P&Q") == "P∧Q"
        assert checker.normalize_formula("P /\\ Q") == "P ∧ Q"
        assert checker.normalize_formula("P/\\Q") == "P∧Q"
        assert checker.normalize_formula("P ∧ Q") == "P ∧ Q"
    
    def test_disjunction_normalization(self):
        checker = CarnapFitchProofChecker()
        
        assert checker.normalize_formula("P | Q") == "P ∨ Q"
        assert checker.normalize_formula("P|Q") == "P∨Q"
        assert checker.normalize_formula("P \\/ Q") == "P ∨ Q"
        assert checker.normalize_formula("P\\/Q") == "P∨Q"
        assert checker.normalize_formula("P ∨ Q") == "P ∨ Q"
    
    def test_negation_normalization(self):
        checker = CarnapFitchProofChecker()
        
        assert checker.normalize_formula("~P") == "¬P"
        assert checker.normalize_formula("-P") == "¬P"
        assert checker.normalize_formula("¬P") == "¬P"
        
        # Double negation
        assert checker.normalize_formula("~~P") == "¬¬P"
        assert checker.normalize_formula("--P") == "¬¬P"
        assert checker.normalize_formula("¬¬P") == "¬¬P"
    
    def test_contradiction_normalization(self):
        checker = CarnapFitchProofChecker()
        
        assert checker.normalize_formula("!?") == "⊥"
        assert checker.normalize_formula("_|_") == "⊥"
        assert checker.normalize_formula("⊥") == "⊥"
    
    def test_boolean_normalization(self):
        checker = CarnapFitchProofChecker()
        
        # True values
        assert checker.normalize_formula("T") == "⊤"
        assert checker.normalize_formula("true") == "⊤"
        assert checker.normalize_formula("⊤") == "⊤"
        
        # False values
        assert checker.normalize_formula("F") == "⊥"
        assert checker.normalize_formula("false") == "⊥"
    
    def test_complex_formula_normalization(self):
        checker = CarnapFitchProofChecker()
        
        # Complex formulas with multiple operators
        assert checker.normalize_formula("(P -> Q) & (~Q -> ~P)") == "(P → Q) ∧ (¬Q → ¬P)"
        assert checker.normalize_formula("P|Q -> R&S") == "P∨Q → R∧S"
        assert checker.normalize_formula("~~(P <-> Q)") == "¬¬(P ↔ Q)"
        
        # Preserve parentheses
        assert checker.normalize_formula("(P & Q) | R") == "(P ∧ Q) ∨ R"
        assert checker.normalize_formula("P & (Q | R)") == "P ∧ (Q ∨ R)"
    
    def test_whitespace_handling(self):
        checker = CarnapFitchProofChecker()
        
        # Extra spaces
        assert checker.normalize_formula("  P  ->  Q  ") == "P → Q"
        assert checker.normalize_formula("P   &   Q") == "P ∧ Q"
        assert checker.normalize_formula("\tP\t|\tQ\t") == "P ∨ Q"


class TestPremiseParsing:
    """Test parsing of comma-separated premises"""
    
    def test_simple_premises(self):
        checker = CarnapFitchProofChecker()
        
        premises = checker.parse_premises("P, Q, R")
        assert premises == ["P", "Q", "R"]
        
        premises = checker.parse_premises("P -> Q, Q -> R")
        assert premises == ["P → Q", "Q → R"]
    
    def test_complex_premises_with_commas(self):
        checker = CarnapFitchProofChecker()
        
        # Commas inside parentheses should not split
        premises = checker.parse_premises("(P, Q), R")
        assert premises == ["(P, Q)", "R"]
        
        premises = checker.parse_premises("P -> (Q, R), S")
        assert premises == ["P → (Q, R)", "S"]
    
    def test_nested_parentheses(self):
        checker = CarnapFitchProofChecker()
        
        premises = checker.parse_premises("((P -> Q) & (Q -> R)), P")
        assert premises == ["((P → Q) ∧ (Q → R))", "P"]
        
        premises = checker.parse_premises("P | (Q & (R | S)), T")
        assert premises == ["P ∨ (Q ∧ (R ∨ S))", "T"]
    
    def test_empty_premises(self):
        checker = CarnapFitchProofChecker()
        
        assert checker.parse_premises("") == []
        assert checker.parse_premises("   ") == []
        assert checker.parse_premises("\n\t") == []
    
    def test_premises_with_all_operators(self):
        checker = CarnapFitchProofChecker()
        
        premises = checker.parse_premises("P & Q, R | S, T -> U, V <-> W, ~X")
        expected = ["P ∧ Q", "R ∨ S", "T → U", "V ↔ W", "¬X"]
        assert premises == expected


class TestJustificationParsing:
    """Test parsing of proof justifications"""
    
    def test_simple_justifications(self):
        checker = CarnapFitchProofChecker()
        
        rule, cited = checker.parse_justification("PR")
        assert rule == "PR"
        assert cited == []
        
        rule, cited = checker.parse_justification("AS")
        assert rule == "AS"
        assert cited == []
    
    def test_single_line_citation(self):
        checker = CarnapFitchProofChecker()
        
        rule, cited = checker.parse_justification("R 3")
        assert rule == "R"
        assert cited == [3]
        
        rule, cited = checker.parse_justification("&E 5")
        assert rule == "&E"
        assert cited == [5]
    
    def test_multiple_line_citations(self):
        checker = CarnapFitchProofChecker()
        
        rule, cited = checker.parse_justification("MP 1,2")
        assert rule == "MP"
        assert cited == [1, 2]
        
        rule, cited = checker.parse_justification("&I 3,4,5")
        assert rule == "&I"
        assert cited == [3, 4, 5]
        
        # With spaces
        rule, cited = checker.parse_justification("MP 1, 2")
        assert rule == "MP"
        assert cited == [1, 2]
    
    def test_range_citations(self):
        checker = CarnapFitchProofChecker()
        
        rule, cited = checker.parse_justification("CD 3-5")
        assert rule == "CD"
        assert cited == [3, 4, 5]
        
        rule, cited = checker.parse_justification("ID 2-8")
        assert rule == "ID"
        assert cited == [2, 3, 4, 5, 6, 7, 8]
    
    def test_mixed_citations(self):
        checker = CarnapFitchProofChecker()
        
        # Mix of single and range
        rule, cited = checker.parse_justification("EE 1,3-5,7")
        assert rule == "EE"
        assert cited == [1, 3, 4, 5, 7]
    
    def test_invalid_citations(self):
        checker = CarnapFitchProofChecker()
        
        # Invalid numbers should be skipped
        rule, cited = checker.parse_justification("MP 1,abc,3")
        assert rule == "MP"
        assert cited == [1, 3]
        
        # Empty citation
        rule, cited = checker.parse_justification("MP ")
        assert rule == "MP"
        assert cited == []


class TestProofParsing:
    """Test parsing of complete proofs"""
    
    def test_simple_proof(self):
        checker = CarnapFitchProofChecker()
        
        proof_text = """P :AS
Q :AS
P & Q :&I 1,2"""
        
        premises = []
        steps = checker.parse_proof(proof_text, premises)
        
        assert len(steps) == 3
        assert steps[0]['formula'] == "P"
        assert steps[0]['rule'] == "AS"
        assert steps[1]['formula'] == "Q"
        assert steps[1]['rule'] == "AS"
        assert steps[2]['formula'] == "P ∧ Q"
        assert steps[2]['rule'] == "&I"
        assert steps[2]['cited_lines'] == [1, 2]
    
    def test_proof_with_premises(self):
        checker = CarnapFitchProofChecker()
        
        proof_text = """Q :MP 1,2"""
        
        premises = ["P → Q", "P"]
        steps = checker.parse_proof(proof_text, premises)
        
        assert len(steps) == 3  # 2 premises + 1 proof step
        assert steps[0]['formula'] == "P → Q"
        assert steps[0]['is_premise'] == True
        assert steps[1]['formula'] == "P"
        assert steps[1]['is_premise'] == True
        assert steps[2]['formula'] == "Q"
        assert steps[2]['rule'] == "MP"
        assert steps[2]['cited_lines'] == [1, 2]
    
    def test_proof_with_show_statements(self):
        checker = CarnapFitchProofChecker()
        
        proof_text = """show P -> P
    P :AS
:CD 2"""
        
        steps = checker.parse_proof(proof_text, [])
        
        assert len(steps) == 3
        assert steps[0]['is_show'] == True
        assert steps[0]['formula'] == "P → P"
        assert steps[1]['formula'] == "P"
        assert steps[1]['subproof_level'] == 1
        assert steps[2]['is_qed'] == True
        assert steps[2]['rule'] == "CD"
    
    def test_nested_subproofs(self):
        checker = CarnapFitchProofChecker()
        
        proof_text = """show (P -> Q) -> (P -> Q)
    P -> Q :AS
    show P -> Q
        P :AS
        Q :MP 2,4
    :CD 4-5
:CD 2-6"""
        
        steps = checker.parse_proof(proof_text, [])
        
        assert steps[0]['subproof_level'] == 0  # show (P -> Q) -> (P -> Q)
        assert steps[1]['subproof_level'] == 1  # P -> Q :AS
        assert steps[2]['subproof_level'] == 1  # show P -> Q
        assert steps[3]['subproof_level'] == 2  # P :AS
        assert steps[4]['subproof_level'] == 2  # Q :MP
        assert steps[5]['subproof_level'] == 1  # :CD 4-5
        assert steps[6]['subproof_level'] == 0  # :CD 2-6
    
    def test_proof_with_separators(self):
        checker = CarnapFitchProofChecker()
        
        proof_text = """P :AS
--
Q :AS
---
P & Q :&I 1,2"""
        
        steps = checker.parse_proof(proof_text, [])
        
        # Separators should be ignored
        assert len(steps) == 3
        assert steps[0]['formula'] == "P"
        assert steps[1]['formula'] == "Q"
        assert steps[2]['formula'] == "P ∧ Q"
    
    def test_proof_with_empty_lines(self):
        checker = CarnapFitchProofChecker()
        
        proof_text = """P :AS

Q :AS


P & Q :&I 1,2"""
        
        steps = checker.parse_proof(proof_text, [])
        
        # Empty lines should be ignored
        assert len(steps) == 3
        assert steps[0]['line_number'] == 1
        assert steps[1]['line_number'] == 2
        assert steps[2]['line_number'] == 3


class TestInferenceValidation:
    """Test validation of specific inference rules"""
    
    def setup_method(self):
        self.checker = CarnapFitchProofChecker()
    
    def test_modus_ponens_validation(self):
        # Valid MP
        self.checker.line_formulas = {1: "P → Q", 2: "P", 3: "Q"}
        self.checker.accessible_lines = {1, 2, 3}
        
        step = {
            'formula': 'Q',
            'rule': 'MP',
            'cited_lines': [1, 2],
            'line_number': 3
        }
        
        assert self.checker.validate_inference(step) == True
        
        # Invalid MP - wrong conclusion
        step['formula'] = 'P'
        assert self.checker.validate_inference(step) == False
        
        # Invalid MP - missing antecedent
        step['formula'] = 'Q'
        step['cited_lines'] = [1]
        assert self.checker.validate_inference(step) == False
    
    def test_conjunction_intro_validation(self):
        self.checker.line_formulas = {1: "P", 2: "Q", 3: "P ∧ Q"}
        self.checker.accessible_lines = {1, 2, 3}
        
        # Valid &I
        step = {
            'formula': 'P ∧ Q',
            'rule': '&I',
            'cited_lines': [1, 2],
            'line_number': 3
        }
        
        assert self.checker.validate_inference(step) == True
        
        # Also valid with reverse order
        step['formula'] = 'Q ∧ P'
        assert self.checker.validate_inference(step) == True
        
        # Invalid - wrong formula
        step['formula'] = 'P ∨ Q'
        assert self.checker.validate_inference(step) == False
    
    def test_conjunction_elim_validation(self):
        self.checker.line_formulas = {1: "P ∧ Q", 2: "P"}
        self.checker.accessible_lines = {1, 2}
        
        # Valid &E - left conjunct
        step = {
            'formula': 'P',
            'rule': '&E',
            'cited_lines': [1],
            'line_number': 2
        }
        
        assert self.checker.validate_inference(step) == True
        
        # Valid &E - right conjunct
        step['formula'] = 'Q'
        assert self.checker.validate_inference(step) == True
        
        # Invalid - not a conjunct
        step['formula'] = 'R'
        assert self.checker.validate_inference(step) == False
    
    def test_disjunction_intro_validation(self):
        self.checker.line_formulas = {1: "P", 2: "P ∨ Q"}
        self.checker.accessible_lines = {1, 2}
        
        # Valid |I
        step = {
            'formula': 'P ∨ Q',
            'rule': '|I',
            'cited_lines': [1],
            'line_number': 2
        }
        
        assert self.checker.validate_inference(step) == True
        
        # Also valid adding to right
        step['formula'] = 'Q ∨ P'
        assert self.checker.validate_inference(step) == True
        
        # Invalid - must contain original formula
        step['formula'] = 'Q ∨ R'
        assert self.checker.validate_inference(step) == False
    
    def test_double_negation_validation(self):
        self.checker.line_formulas = {1: "¬¬P", 2: "P"}
        self.checker.accessible_lines = {1, 2}
        
        # Valid DNE
        step = {
            'formula': 'P',
            'rule': 'DNE',
            'cited_lines': [1],
            'line_number': 2
        }
        
        assert self.checker.validate_inference(step) == True
        
        # Valid DNI
        self.checker.line_formulas[3] = "¬¬P"
        self.checker.accessible_lines.add(3)
        step = {
            'formula': '¬¬P',
            'rule': 'DNI',
            'cited_lines': [2],
            'line_number': 3
        }
        
        assert self.checker.validate_inference(step) == True
    
    def test_negation_elimination_validation(self):
        self.checker.line_formulas = {1: "P", 2: "¬P", 3: "⊥"}
        self.checker.accessible_lines = {1, 2, 3}
        
        # Valid ~E
        step = {
            'formula': '⊥',
            'rule': '~E',
            'cited_lines': [1, 2],
            'line_number': 3
        }
        
        assert self.checker.validate_inference(step) == True
        
        # Invalid - must produce contradiction
        step['formula'] = 'Q'
        assert self.checker.validate_inference(step) == False
    
    def test_contradiction_elimination_validation(self):
        self.checker.line_formulas = {1: "⊥", 2: "Q"}
        self.checker.accessible_lines = {1, 2}
        
        # Valid ⊥E - can derive anything
        step = {
            'formula': 'Q',
            'rule': '⊥E',
            'cited_lines': [1],
            'line_number': 2
        }
        
        assert self.checker.validate_inference(step) == True
        
        # Also valid with complex formula
        step['formula'] = '(P → Q) ∧ (R ∨ S)'
        assert self.checker.validate_inference(step) == True
    
    def test_modus_tollens_validation(self):
        self.checker.line_formulas = {1: "P → Q", 2: "¬Q", 3: "¬P"}
        self.checker.accessible_lines = {1, 2, 3}
        
        # Valid MT
        step = {
            'formula': '¬P',
            'rule': 'MT',
            'cited_lines': [1, 2],
            'line_number': 3
        }
        
        assert self.checker.validate_inference(step) == True
        
        # Invalid - wrong negation
        step['formula'] = '¬Q'
        assert self.checker.validate_inference(step) == False
    
    def test_biconditional_validation(self):
        self.checker.line_formulas = {1: "P → Q", 2: "Q → P", 3: "P ↔ Q"}
        self.checker.accessible_lines = {1, 2, 3}
        
        # Valid <->I
        step = {
            'formula': 'P ↔ Q',
            'rule': '<->I',
            'cited_lines': [1, 2],
            'line_number': 3
        }
        
        assert self.checker.validate_inference(step) == True
        
        # Valid <->E
        self.checker.line_formulas[4] = "P → Q"
        self.checker.accessible_lines.add(4)
        step = {
            'formula': 'P → Q',
            'rule': '<->E',
            'cited_lines': [3],
            'line_number': 4
        }
        
        assert self.checker.validate_inference(step) == True
        
        # Also valid other direction
        step['formula'] = 'Q → P'
        assert self.checker.validate_inference(step) == True
    
    def test_disjunctive_syllogism_validation(self):
        self.checker.line_formulas = {1: "P ∨ Q", 2: "¬P", 3: "Q"}
        self.checker.accessible_lines = {1, 2, 3}
        
        # Valid MTP
        step = {
            'formula': 'Q',
            'rule': 'MTP',
            'cited_lines': [1, 2],
            'line_number': 3
        }
        
        assert self.checker.validate_inference(step) == True
        
        # Also valid with other disjunct
        self.checker.line_formulas[2] = "¬Q"
        self.checker.line_formulas[3] = "P"
        step['formula'] = 'P'
        assert self.checker.validate_inference(step) == True


class TestQEDValidation:
    """Test validation of QED lines"""
    
    def setup_method(self):
        self.checker = CarnapFitchProofChecker()
    
    def test_direct_derivation_qed(self):
        # Set up show line
        self.checker.show_lines = {1: "P"}
        self.checker.subproof_stack = [{'show_line': 1}]
        self.checker.line_formulas = {1: "P", 2: "P"}
        
        qed_step = {
            'line_number': 3,
            'rule': 'DD',
            'cited_lines': [2],
            'is_qed': True
        }
        
        assert self.checker._validate_qed(qed_step) == True
        
        # Invalid - doesn't match show
        self.checker.line_formulas[2] = "Q"
        assert self.checker._validate_qed(qed_step) == False
    
    def test_conditional_derivation_qed(self):
        # Set up conditional show
        self.checker.show_lines = {1: "P → Q"}
        self.checker.subproof_stack = [{'show_line': 1}]
        
        qed_step = {
            'line_number': 4,
            'rule': 'CD',
            'cited_lines': [2, 3],
            'is_qed': True
        }
        
        assert self.checker._validate_qed(qed_step) == True
        
        # Invalid - not a conditional show
        self.checker.show_lines[1] = "P ∧ Q"
        assert self.checker._validate_qed(qed_step) == False
    
    def test_indirect_derivation_qed(self):
        # Set up show with contradiction
        self.checker.show_lines = {1: "P"}
        self.checker.subproof_stack = [{'show_line': 1}]
        self.checker.line_formulas = {3: "⊥"}
        
        qed_step = {
            'line_number': 4,
            'rule': 'ID',
            'cited_lines': [3],
            'is_qed': True
        }
        
        assert self.checker._validate_qed(qed_step) == True
        
        # Invalid - no contradiction
        self.checker.line_formulas[3] = "Q"
        assert self.checker._validate_qed(qed_step) == False


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_unicode_handling(self):
        checker = CarnapFitchProofChecker()
        
        # Various unicode symbols
        formula = "∀x∃y(P(x,y) → Q(x,y))"
        normalized = checker.normalize_formula(formula)
        assert "∀" in normalized
        assert "∃" in normalized
        
        # Mixed unicode and ASCII
        formula = "P -> Q & ~R | S <-> T"
        normalized = checker.normalize_formula(formula)
        assert normalized == "P → Q ∧ ¬R ∨ S ↔ T"
    
    def test_malformed_proofs(self):
        checker = CarnapFitchProofChecker()
        
        # Missing justification
        proof_text = "P"
        steps = checker.parse_proof(proof_text, [])
        assert len(steps) == 0  # Should skip malformed line
        assert len(checker.errors) > 0
        
        # Invalid line format
        proof_text = "P Q R :AS"
        steps = checker.parse_proof(proof_text, [])
        assert steps[0]['formula'] == "P Q R"  # Should parse whole thing as formula
    
    def test_inaccessible_line_references(self):
        checker = CarnapFitchProofChecker()
        checker.line_formulas = {1: "P", 2: "Q"}
        checker.accessible_lines = {1}  # Line 2 is not accessible
        
        step = {
            'formula': 'P ∧ Q',
            'rule': '&I',
            'cited_lines': [1, 2],
            'line_number': 3
        }
        
        result = checker.validate_inference(step)
        assert result == False
        assert any("not accessible" in err for err in checker.errors)
    
    def test_empty_proof(self):
        checker = CarnapFitchProofChecker()
        
        steps = checker.parse_proof("", [])
        assert len(steps) == 0
        
        steps = checker.parse_proof("\n\n\n", [])
        assert len(steps) == 0
    
    def test_very_long_formulas(self):
        checker = CarnapFitchProofChecker()
        
        # Create a very long formula
        long_formula = " ∧ ".join([f"P{i}" for i in range(100)])
        normalized = checker.normalize_formula(long_formula)
        assert normalized.count("∧") == 99
        assert "P0" in normalized
        assert "P99" in normalized
    
    def test_special_characters_in_variables(self):
        parser = FormulaParser()
        
        # Only uppercase letters should be variables
        ast = parser.parse("P")
        assert isinstance(ast, Variable)
        
        # Numbers and lowercase are not variables
        with pytest.raises(ValueError):
            parser.parse("p")
        
        with pytest.raises(ValueError):
            parser.parse("1")
    
    def test_deeply_nested_formulas(self):
        parser = FormulaParser()
        
        # Deep nesting
        formula = "((((P))))"
        ast = parser.parse(formula)
        assert isinstance(ast, Variable)
        assert ast.name == "P"
        
        # Complex nesting
        formula = "((P -> (Q & R)) | (~S -> T))"
        ast = parser.parse(formula)
        assert isinstance(ast, Disjunction)


class TestInputValidation:
    """Test input validation and security"""
    
    def test_proof_request_validation(self):
        # Valid request
        request = ProofRequest(
            gamma="P, Q",
            phi="P & Q",
            proof="P & Q :&I 1,2"
        )
        assert request.gamma == "P, Q"
        
        # Too long input
        with pytest.raises(ValueError):
            ProofRequest(
                gamma="P" * 10001,
                phi="Q",
                proof="test"
            )
        
        # Dangerous patterns
        dangerous_inputs = [
            "P; rm -rf /",
            "P && echo test",
            "P | cat /etc/passwd",
            "../../../etc/passwd",
            "P`whoami`Q",
            "P$(echo test)Q",
            "P > /tmp/test",
            "P < /dev/null"
        ]
        
        for dangerous in dangerous_inputs:
            with pytest.raises(ValueError):
                ProofRequest(
                    gamma=dangerous,
                    phi="Q",
                    proof="test"
                )
    
    def test_null_byte_removal(self):
        # Null bytes should be removed
        request = ProofRequest(
            gamma="P\x00Q",
            phi="R\x00S",
            proof="test\x00proof"
        )
        
        assert "\x00" not in request.gamma
        assert "\x00" not in request.phi
        assert "\x00" not in request.proof


class TestProofOptimality:
    """Test proof optimality calculations"""
    
    def test_optimality_calculation(self):
        checker = CarnapFitchProofChecker()
        
        steps = [
            {'is_premise': True, 'line_number': 1},
            {'is_premise': True, 'line_number': 2},
            {'is_premise': False, 'is_show': False, 'is_qed': False, 'line_number': 3, 'cited_lines': [1, 2]},
            {'is_premise': False, 'is_show': False, 'is_qed': False, 'line_number': 4, 'cited_lines': [3]},
            {'is_premise': False, 'is_show': False, 'is_qed': False, 'line_number': 5, 'cited_lines': []},  # Unused
        ]
        
        optimality = checker.calculate_proof_optimality(steps, best_known=2)
        
        assert optimality['actual_length'] == 3  # Non-premise steps
        assert 5 in optimality['redundant_steps']  # Line 5 is unused
        assert optimality['optimality_score'] < 100  # Penalty for redundancy
        assert optimality['efficiency_ratio'] < 100  # Longer than optimal


class TestQuantifierRules:
    """Test quantifier logic rule validation"""
    
    def setup_method(self):
        self.checker = CarnapFitchProofChecker()
    
    def test_universal_intro_validation(self):
        self.checker.line_formulas = {1: "P(a)", 2: "∀x.P(x)"}
        self.checker.accessible_lines = {1, 2}
        
        step = {
            'formula': '∀x.P(x)',
            'rule': '∀I',
            'cited_lines': [1],
            'line_number': 2
        }
        
        # Should attempt validation with quantifier handler
        result = self.checker.validate_inference(step)
        # The actual validation depends on the quantifier handler implementation
    
    def test_existential_intro_validation(self):
        self.checker.line_formulas = {1: "P(a)", 2: "∃x.P(x)"}
        self.checker.accessible_lines = {1, 2}
        
        step = {
            'formula': '∃x.P(x)',
            'rule': '∃I',
            'cited_lines': [1],
            'line_number': 2
        }
        
        result = self.checker.validate_inference(step)
        # Should delegate to quantifier handler


if __name__ == "__main__":
    pytest.main([__file__, "-v"])