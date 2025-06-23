"""
Machine Solver for Natural Deduction Proofs
Automatically finds optimal proofs for propositional logic
"""

from typing import List, Dict, Set, Tuple, Optional, Union
from dataclasses import dataclass, field
from collections import deque
import heapq
from enum import Enum

class RuleType(Enum):
    """Types of inference rules"""
    MP = "Modus Ponens"
    MT = "Modus Tollens"
    CONJ_INTRO = "Conjunction Introduction"
    CONJ_ELIM = "Conjunction Elimination"
    DISJ_INTRO = "Disjunction Introduction"
    DISJ_ELIM = "Disjunction Elimination"
    IMPL_INTRO = "Implication Introduction"
    IMPL_ELIM = "Implication Elimination"
    NEG_INTRO = "Negation Introduction"
    NEG_ELIM = "Negation Elimination"
    DN_INTRO = "Double Negation Introduction"
    DN_ELIM = "Double Negation Elimination"
    ASSUMPTION = "Assumption"
    REIT = "Reiteration"

@dataclass
class ProofLine:
    """Represents a line in a proof"""
    line_number: int
    formula: str
    rule: RuleType
    cited_lines: List[int]
    subproof_level: int = 0
    is_assumption: bool = False

@dataclass
class ProofState:
    """Current state of proof search"""
    available_formulas: Dict[str, List[ProofLine]]  # formula -> lines that derive it
    proof_lines: List[ProofLine]
    open_assumptions: List[Tuple[int, str]]  # (line_number, formula)
    goal_stack: List[str]
    depth: int = 0
    
    def copy(self):
        """Deep copy of proof state"""
        return ProofState(
            available_formulas={k: v[:] for k, v in self.available_formulas.items()},
            proof_lines=self.proof_lines[:],
            open_assumptions=self.open_assumptions[:],
            goal_stack=self.goal_stack[:],
            depth=self.depth
        )
    
    def add_line(self, formula: str, rule: RuleType, cited: List[int], is_assumption: bool = False):
        """Add a new proof line"""
        line_num = len(self.proof_lines) + 1
        line = ProofLine(line_num, formula, rule, cited, len(self.open_assumptions), is_assumption)
        self.proof_lines.append(line)
        
        if formula not in self.available_formulas:
            self.available_formulas[formula] = []
        self.available_formulas[formula].append(line)
        
        return line_num

class MachineSolver:
    """Automated proof finder using natural deduction"""
    
    def __init__(self, max_depth: int = 20):
        self.max_depth = max_depth
        self.memo = {}  # Memoization for subproblems
        
    def normalize_formula(self, formula: str) -> str:
        """Normalize formula for comparison"""
        formula = ' '.join(formula.split())
        formula = formula.replace('->', '→').replace('<->', '↔')
        formula = formula.replace('/\\', '∧').replace('&', '∧')
        formula = formula.replace('\\/', '∨').replace('|', '∨')
        formula = formula.replace('~', '¬').replace('-', '¬')
        return formula
    
    def parse_formula_structure(self, formula: str) -> Dict[str, any]:
        """Parse formula to identify main connective and subformulas"""
        formula = self.normalize_formula(formula)
        
        # Remove outer parentheses if they enclose the whole formula
        if formula.startswith('(') and formula.endswith(')'):
            # Check if these parentheses match
            depth = 0
            for i, char in enumerate(formula):
                if char == '(':
                    depth += 1
                elif char == ')':
                    depth -= 1
                if depth == 0 and i < len(formula) - 1:
                    break
            if i == len(formula) - 1:
                formula = formula[1:-1]
        
        # Find main connective (considering precedence and parentheses)
        depth = 0
        for i, char in enumerate(formula):
            if char == '(':
                depth += 1
            elif char == ')':
                depth -= 1
            elif depth == 0:
                # Check for biconditional
                if formula[i:i+1] == '↔':
                    return {
                        'type': 'biconditional',
                        'left': formula[:i].strip(),
                        'right': formula[i+1:].strip()
                    }
                # Check for implication
                elif formula[i:i+1] == '→':
                    return {
                        'type': 'implication',
                        'left': formula[:i].strip(),
                        'right': formula[i+1:].strip()
                    }
        
        # Check for disjunction at depth 0
        depth = 0
        for i, char in enumerate(formula):
            if char == '(':
                depth += 1
            elif char == ')':
                depth -= 1
            elif depth == 0 and formula[i:i+1] == '∨':
                return {
                    'type': 'disjunction',
                    'left': formula[:i].strip(),
                    'right': formula[i+1:].strip()
                }
        
        # Check for conjunction at depth 0
        depth = 0
        for i, char in enumerate(formula):
            if char == '(':
                depth += 1
            elif char == ')':
                depth -= 1
            elif depth == 0 and formula[i:i+1] == '∧':
                return {
                    'type': 'conjunction',
                    'left': formula[:i].strip(),
                    'right': formula[i+1:].strip()
                }
        
        # Check for negation
        if formula.startswith('¬'):
            return {
                'type': 'negation',
                'subformula': formula[1:].strip()
            }
        
        # Atomic formula
        return {
            'type': 'atomic',
            'formula': formula
        }
    
    def apply_forward_rules(self, state: ProofState) -> List[ProofState]:
        """Apply forward inference rules to derive new formulas"""
        new_states = []
        
        # Modus Ponens
        for impl_formula, impl_lines in state.available_formulas.items():
            structure = self.parse_formula_structure(impl_formula)
            if structure['type'] == 'implication':
                antecedent = structure['left']
                consequent = structure['right']
                
                if antecedent in state.available_formulas:
                    # Can apply MP
                    if consequent not in state.available_formulas:
                        new_state = state.copy()
                        new_state.add_line(
                            consequent,
                            RuleType.MP,
                            [impl_lines[0].line_number, state.available_formulas[antecedent][0].line_number]
                        )
                        new_state.depth += 1
                        new_states.append(new_state)
        
        # Conjunction Introduction
        formulas = list(state.available_formulas.keys())
        for i, f1 in enumerate(formulas):
            for f2 in formulas[i+1:]:
                conj = f"{f1} ∧ {f2}"
                if conj not in state.available_formulas:
                    new_state = state.copy()
                    new_state.add_line(
                        conj,
                        RuleType.CONJ_INTRO,
                        [state.available_formulas[f1][0].line_number,
                         state.available_formulas[f2][0].line_number]
                    )
                    new_state.depth += 1
                    new_states.append(new_state)
        
        # Conjunction Elimination
        for conj_formula, conj_lines in state.available_formulas.items():
            structure = self.parse_formula_structure(conj_formula)
            if structure['type'] == 'conjunction':
                left = structure['left']
                right = structure['right']
                
                # Eliminate to get left conjunct
                if left not in state.available_formulas:
                    new_state = state.copy()
                    new_state.add_line(left, RuleType.CONJ_ELIM, [conj_lines[0].line_number])
                    new_state.depth += 1
                    new_states.append(new_state)
                
                # Eliminate to get right conjunct
                if right not in state.available_formulas:
                    new_state = state.copy()
                    new_state.add_line(right, RuleType.CONJ_ELIM, [conj_lines[0].line_number])
                    new_state.depth += 1
                    new_states.append(new_state)
        
        # Disjunction Introduction
        for formula in state.available_formulas.keys():
            # Add arbitrary disjuncts (limited to avoid explosion)
            for atom in ['P', 'Q', 'R']:
                disj1 = f"{formula} ∨ {atom}"
                disj2 = f"{atom} ∨ {formula}"
                
                if disj1 not in state.available_formulas and len(state.proof_lines) < self.max_depth:
                    new_state = state.copy()
                    new_state.add_line(
                        disj1,
                        RuleType.DISJ_INTRO,
                        [state.available_formulas[formula][0].line_number]
                    )
                    new_state.depth += 1
                    new_states.append(new_state)
        
        return new_states
    
    def apply_backward_rules(self, state: ProofState, goal: str) -> List[ProofState]:
        """Apply backward reasoning to work towards a goal"""
        new_states = []
        structure = self.parse_formula_structure(goal)
        
        # If goal is already available, we're done
        if goal in state.available_formulas:
            return []
        
        # Backward chaining for implication
        if structure['type'] == 'implication':
            # Use conditional proof: assume antecedent, derive consequent
            antecedent = structure['left']
            consequent = structure['right']
            
            new_state = state.copy()
            new_state.open_assumptions.append((len(new_state.proof_lines) + 1, antecedent))
            line_num = new_state.add_line(antecedent, RuleType.ASSUMPTION, [], is_assumption=True)
            new_state.goal_stack.append(consequent)
            new_state.depth += 1
            new_states.append(new_state)
        
        # Backward chaining for conjunction
        elif structure['type'] == 'conjunction':
            # Need to prove both conjuncts
            left = structure['left']
            right = structure['right']
            
            new_state = state.copy()
            new_state.goal_stack.extend([right, left])  # Push in reverse order
            new_state.depth += 1
            new_states.append(new_state)
        
        # Backward chaining for negation (proof by contradiction)
        elif structure['type'] == 'negation':
            subformula = structure['subformula']
            
            # Assume the subformula and try to derive contradiction
            new_state = state.copy()
            new_state.open_assumptions.append((len(new_state.proof_lines) + 1, subformula))
            line_num = new_state.add_line(subformula, RuleType.ASSUMPTION, [], is_assumption=True)
            new_state.goal_stack.append('⊥')  # Seek contradiction
            new_state.depth += 1
            new_states.append(new_state)
        
        return new_states
    
    def check_contradiction(self, state: ProofState) -> bool:
        """Check if we have a contradiction (P and ¬P)"""
        for formula in state.available_formulas:
            neg_formula = f"¬{formula}"
            if neg_formula in state.available_formulas:
                return True
            
            # Also check if formula is ¬Q and Q is available
            structure = self.parse_formula_structure(formula)
            if structure['type'] == 'negation':
                if structure['subformula'] in state.available_formulas:
                    return True
        
        return False
    
    def close_subproof(self, state: ProofState) -> Optional[ProofState]:
        """Try to close the current subproof"""
        if not state.open_assumptions:
            return None
        
        assumption_line, assumption_formula = state.open_assumptions[-1]
        
        # Check if we can close by conditional proof
        if state.goal_stack and state.goal_stack[-1] in state.available_formulas:
            consequent = state.goal_stack[-1]
            implication = f"{assumption_formula} → {consequent}"
            
            new_state = state.copy()
            new_state.open_assumptions.pop()
            new_state.goal_stack.pop()
            new_state.add_line(implication, RuleType.IMPL_INTRO, [assumption_line])
            return new_state
        
        # Check if we can close by reductio
        if self.check_contradiction(state):
            neg_assumption = f"¬{assumption_formula}"
            
            new_state = state.copy()
            new_state.open_assumptions.pop()
            new_state.add_line(neg_assumption, RuleType.NEG_INTRO, [assumption_line])
            return new_state
        
        return None
    
    def find_proof(self, premises: List[str], conclusion: str) -> Optional[List[ProofLine]]:
        """Find a proof from premises to conclusion"""
        # Normalize all formulas
        premises = [self.normalize_formula(p) for p in premises]
        conclusion = self.normalize_formula(conclusion)
        
        # Initialize proof state
        initial_state = ProofState(
            available_formulas={},
            proof_lines=[],
            open_assumptions=[],
            goal_stack=[conclusion],
            depth=0
        )
        
        # Add premises
        for premise in premises:
            initial_state.add_line(premise, RuleType.ASSUMPTION, [], is_assumption=False)
        
        # Use priority queue for best-first search
        # Priority: (depth + heuristic, state_id, state)
        state_id = 0
        queue = [(0, state_id, initial_state)]
        visited = set()
        
        while queue and state_id < 10000:  # Limit iterations
            _, _, state = heapq.heappop(queue)
            
            # Check if we've proved the conclusion
            if conclusion in state.available_formulas and not state.open_assumptions:
                return state.proof_lines
            
            # Generate state signature for cycle detection
            sig = (
                frozenset(state.available_formulas.keys()),
                tuple(state.open_assumptions),
                tuple(state.goal_stack)
            )
            if sig in visited:
                continue
            visited.add(sig)
            
            # Try to close subproofs
            if state.open_assumptions:
                closed_state = self.close_subproof(state)
                if closed_state:
                    state_id += 1
                    priority = closed_state.depth
                    heapq.heappush(queue, (priority, state_id, closed_state))
            
            # Apply forward rules
            if state.depth < self.max_depth:
                for new_state in self.apply_forward_rules(state):
                    state_id += 1
                    priority = new_state.depth + len(new_state.goal_stack)
                    heapq.heappush(queue, (priority, state_id, new_state))
            
            # Apply backward rules
            if state.goal_stack and state.depth < self.max_depth:
                current_goal = state.goal_stack[-1]
                for new_state in self.apply_backward_rules(state, current_goal):
                    state_id += 1
                    priority = new_state.depth + len(new_state.goal_stack)
                    heapq.heappush(queue, (priority, state_id, new_state))
        
        return None
    
    def verify_optimal_length(self, premises: List[str], conclusion: str, claimed_length: int) -> Dict[str, any]:
        """Verify if a puzzle has the claimed optimal proof length"""
        proof = self.find_proof(premises, conclusion)
        
        if not proof:
            return {
                'valid': False,
                'error': 'No proof found',
                'optimal_length': None
            }
        
        # Count non-premise lines
        proof_length = len([line for line in proof if not (line.rule == RuleType.ASSUMPTION and line.cited_lines == [])])
        
        return {
            'valid': True,
            'found_length': proof_length,
            'claimed_length': claimed_length,
            'is_optimal': proof_length <= claimed_length,
            'proof': self.format_proof(proof)
        }
    
    def format_proof(self, proof: List[ProofLine]) -> str:
        """Format proof in readable form"""
        lines = []
        for line in proof:
            indent = "  " * line.subproof_level
            if line.cited_lines:
                citation = f" [{','.join(map(str, line.cited_lines))}]"
            else:
                citation = ""
            lines.append(f"{indent}{line.line_number}. {line.formula} ({line.rule.value}){citation}")
        return "\n".join(lines)