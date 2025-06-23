"""
Comprehensive tests for the machine solver
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from machine_solver import (
    MachineSolver, ProofState, ProofLine, RuleType
)

class TestMachineSolver:
    def setup_method(self):
        self.solver = MachineSolver(max_depth=15)
    
    def test_normalize_formula(self):
        """Test formula normalization"""
        test_cases = [
            ("P", "P"),
            ("P & Q", "P ∧ Q"),
            ("P | Q", "P ∨ Q"),
            ("P -> Q", "P → Q"),
            ("P <-> Q", "P ↔ Q"),
            ("~P", "¬P"),
            ("  P   &   Q  ", "P ∧ Q"),  # Extra spaces
        ]
        
        for input_f, expected in test_cases:
            result = self.solver.normalize_formula(input_f)
            assert result == expected
    
    def test_parse_formula_structure(self):
        """Test formula structure parsing"""
        test_cases = [
            ("P", {"type": "atomic", "formula": "P"}),
            ("¬P", {"type": "negation", "subformula": "P"}),
            ("P ∧ Q", {"type": "conjunction", "left": "P", "right": "Q"}),
            ("P ∨ Q", {"type": "disjunction", "left": "P", "right": "Q"}),
            ("P → Q", {"type": "implication", "left": "P", "right": "Q"}),
            ("P ↔ Q", {"type": "biconditional", "left": "P", "right": "Q"}),
        ]
        
        for formula, expected in test_cases:
            result = self.solver.parse_formula_structure(formula)
            assert result == expected
    
    def test_parse_complex_structure(self):
        """Test parsing complex formula structures"""
        # Nested implications
        result = self.solver.parse_formula_structure("P → (Q → R)")
        assert result["type"] == "implication"
        assert result["left"] == "P"
        assert result["right"] == "Q → R"
        
        # Conjunction of implications
        result = self.solver.parse_formula_structure("(P → Q) ∧ (Q → R)")
        assert result["type"] == "conjunction"
        assert result["left"] == "P → Q"
        assert result["right"] == "Q → R"
    
    def test_simple_modus_ponens(self):
        """Test finding simple modus ponens proof"""
        proof = self.solver.find_proof(["P", "P → Q"], "Q")
        assert proof is not None
        
        # Check proof structure
        non_premise_lines = [l for l in proof if l.rule != RuleType.ASSUMPTION or l.cited_lines]
        assert len(non_premise_lines) == 1  # Should be one MP step
        
        # Check the MP step
        mp_line = non_premise_lines[0]
        assert mp_line.formula == "Q"
        assert mp_line.rule == RuleType.MP
        assert len(mp_line.cited_lines) == 2
    
    def test_hypothetical_syllogism(self):
        """Test finding hypothetical syllogism proof"""
        proof = self.solver.find_proof(["P → Q", "Q → R"], "P → R")
        assert proof is not None
        
        # Should use conditional proof
        # Format should be: premises, assume P, derive R, then P → R
        assert any(line.formula == "P → R" for line in proof)
    
    def test_conjunction_intro(self):
        """Test conjunction introduction"""
        proof = self.solver.find_proof(["P", "Q"], "P ∧ Q")
        assert proof is not None
        
        # Should have one conjunction introduction
        conj_lines = [l for l in proof if l.rule == RuleType.CONJ_INTRO]
        assert len(conj_lines) == 1
        assert conj_lines[0].formula == "P ∧ Q"
    
    def test_conjunction_elim(self):
        """Test conjunction elimination"""
        proof = self.solver.find_proof(["P ∧ Q"], "P")
        assert proof is not None
        
        # Should have one conjunction elimination
        elim_lines = [l for l in proof if l.rule == RuleType.CONJ_ELIM]
        assert len(elim_lines) == 1
        assert elim_lines[0].formula == "P"
    
    def test_disjunction_intro(self):
        """Test disjunction introduction"""
        proof = self.solver.find_proof(["P"], "P ∨ Q")
        assert proof is not None
        
        # Should have one disjunction introduction
        disj_lines = [l for l in proof if l.rule == RuleType.DISJ_INTRO]
        assert len(disj_lines) >= 1
        assert any(l.formula == "P ∨ Q" for l in disj_lines)
    
    def test_complex_proof(self):
        """Test finding more complex proof"""
        proof = self.solver.find_proof(
            ["P → Q", "Q → R", "P"],
            "R"
        )
        assert proof is not None
        
        # Should derive R through two MP steps
        assert any(line.formula == "Q" for line in proof)
        assert any(line.formula == "R" for line in proof)
    
    def test_conditional_proof(self):
        """Test conditional proof strategy"""
        proof = self.solver.find_proof(
            ["P → Q"],
            "¬Q → ¬P"  # Contrapositive
        )
        assert proof is not None
        
        # Should use conditional proof with assumption
        assert any(line.is_assumption and line.formula == "¬Q" for line in proof)
        assert any(line.formula == "¬Q → ¬P" for line in proof)
    
    def test_proof_by_contradiction(self):
        """Test proof by contradiction"""
        proof = self.solver.find_proof(
            ["P → Q", "P → ¬Q"],
            "¬P"
        )
        assert proof is not None
        
        # Should assume P and derive contradiction
        assert any(line.formula == "¬P" for line in proof)
    
    def test_no_proof_exists(self):
        """Test case where no proof exists"""
        # Invalid inference
        proof = self.solver.find_proof(["P → Q", "Q"], "P")
        assert proof is None  # Affirming the consequent
    
    def test_verify_optimal_length(self):
        """Test optimal length verification"""
        # Simple modus ponens
        result = self.solver.verify_optimal_length(
            ["P", "P → Q"],
            "Q",
            1
        )
        assert result["valid"]
        assert result["found_length"] == 1
        assert result["is_optimal"]
        
        # Claim too optimistic
        result = self.solver.verify_optimal_length(
            ["P → Q", "Q → R", "P"],
            "R",
            1  # Can't be done in 1 step
        )
        assert result["valid"]
        assert result["found_length"] > 1
        assert not result["is_optimal"]
    
    def test_format_proof(self):
        """Test proof formatting"""
        lines = [
            ProofLine(1, "P", RuleType.ASSUMPTION, []),
            ProofLine(2, "P → Q", RuleType.ASSUMPTION, []),
            ProofLine(3, "Q", RuleType.MP, [2, 1])
        ]
        
        formatted = self.solver.format_proof(lines)
        assert "1. P (Assumption)" in formatted
        assert "2. P → Q (Assumption)" in formatted
        assert "3. Q (Modus Ponens) [2,1]" in formatted

class TestProofState:
    def test_proof_state_creation(self):
        """Test ProofState creation and manipulation"""
        state = ProofState(
            available_formulas={},
            proof_lines=[],
            open_assumptions=[],
            goal_stack=["Q"],
            depth=0
        )
        
        # Add a line
        line_num = state.add_line("P", RuleType.ASSUMPTION, [])
        assert line_num == 1
        assert "P" in state.available_formulas
        assert len(state.proof_lines) == 1
    
    def test_proof_state_copy(self):
        """Test deep copying of proof state"""
        state1 = ProofState({}, [], [], ["Q"], 0)
        state1.add_line("P", RuleType.ASSUMPTION, [])
        
        state2 = state1.copy()
        state2.add_line("R", RuleType.ASSUMPTION, [])
        
        # Original should not be affected
        assert len(state1.proof_lines) == 1
        assert len(state2.proof_lines) == 2
        assert "R" not in state1.available_formulas

class TestSearchStrategies:
    def setup_method(self):
        self.solver = MachineSolver(max_depth=10)
    
    def test_forward_chaining(self):
        """Test forward chaining strategy"""
        state = ProofState({}, [], [], ["Q"], 0)
        state.add_line("P", RuleType.ASSUMPTION, [])
        state.add_line("P → Q", RuleType.ASSUMPTION, [])
        
        new_states = self.solver.apply_forward_rules(state)
        
        # Should find modus ponens application
        assert any("Q" in s.available_formulas for s in new_states)
    
    def test_backward_chaining_implication(self):
        """Test backward chaining for implications"""
        state = ProofState({}, [], [], [], 0)
        
        new_states = self.solver.apply_backward_rules(state, "P → Q")
        
        # Should create assumption-based strategy
        assert len(new_states) > 0
        assert any(s.open_assumptions for s in new_states)
    
    def test_backward_chaining_conjunction(self):
        """Test backward chaining for conjunctions"""
        state = ProofState({}, [], [], [], 0)
        
        new_states = self.solver.apply_backward_rules(state, "P ∧ Q")
        
        # Should add both conjuncts as goals
        assert len(new_states) > 0
        assert any("P" in s.goal_stack and "Q" in s.goal_stack for s in new_states)
    
    def test_contradiction_detection(self):
        """Test contradiction detection"""
        state = ProofState({}, [], [], [], 0)
        state.add_line("P", RuleType.ASSUMPTION, [])
        state.add_line("¬P", RuleType.ASSUMPTION, [])
        
        assert self.solver.check_contradiction(state)
        
        # Also test with different order
        state2 = ProofState({}, [], [], [], 0)
        state2.add_line("¬Q", RuleType.ASSUMPTION, [])
        state2.add_line("Q", RuleType.ASSUMPTION, [])
        
        assert self.solver.check_contradiction(state2)
    
    def test_subproof_closing(self):
        """Test closing subproofs"""
        state = ProofState({}, [], [], ["Q"], 0)
        state.open_assumptions.append((1, "P"))
        state.add_line("P", RuleType.ASSUMPTION, [], is_assumption=True)
        state.add_line("Q", RuleType.MP, [1, 2])
        
        closed_state = self.solver.close_subproof(state)
        assert closed_state is not None
        assert "P → Q" in closed_state.available_formulas

class TestEdgeCases:
    def setup_method(self):
        self.solver = MachineSolver(max_depth=5)
    
    def test_empty_premises(self):
        """Test with no premises"""
        # Can't prove anything from nothing (except tautologies)
        proof = self.solver.find_proof([], "P")
        assert proof is None
    
    def test_single_premise(self):
        """Test with single premise"""
        proof = self.solver.find_proof(["P"], "P")
        # Should already be there
        assert proof is not None
        assert len(proof) == 1
    
    def test_tautology(self):
        """Test proving a tautology"""
        # P → P is a tautology
        proof = self.solver.find_proof([], "P → P")
        assert proof is not None  # Should be provable
    
    def test_depth_limit(self):
        """Test that depth limit is respected"""
        solver = MachineSolver(max_depth=2)
        
        # This would require more than 2 steps
        proof = solver.find_proof(
            ["P → Q", "Q → R", "R → S", "S → T"],
            "P → T"
        )
        # Might not find it with such low depth
        if proof:
            assert len(proof) <= solver.max_depth + 4  # Plus premises
    
    def test_cycle_detection(self):
        """Test that solver doesn't get stuck in cycles"""
        # Circular reasoning shouldn't cause infinite loop
        proof = self.solver.find_proof(
            ["P → Q", "Q → P"],
            "P"
        )
        # Should terminate even if no proof found
        assert proof is None

def test_performance():
    """Test solver performance on larger problems"""
    solver = MachineSolver(max_depth=10)
    
    # Chain of implications
    premises = [f"P{i} → P{i+1}" for i in range(5)]
    premises.append("P0")
    
    import time
    start = time.time()
    proof = solver.find_proof(premises, "P5")
    end = time.time()
    
    assert proof is not None
    assert end - start < 5  # Should complete within 5 seconds
    
    # Verify proof is reasonably short
    non_premise_lines = [l for l in proof if l.rule != RuleType.ASSUMPTION or l.cited_lines]
    assert len(non_premise_lines) <= 10  # Shouldn't be too long

if __name__ == "__main__":
    pytest.main([__file__, "-v"])