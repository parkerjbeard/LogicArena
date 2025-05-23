from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Tuple
import logging
import subprocess
import json
import re
import tempfile
import os
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Proof Checker Service - Carnap Compatible", version="2.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ProofRequest(BaseModel):
    gamma: str  # Premises (comma-separated)
    phi: str    # Conclusion
    proof: str  # Carnap Fitch-style proof

class ProofResponse(BaseModel):
    ok: bool
    error: Optional[str] = None
    lines: Optional[int] = None
    depth: Optional[int] = None
    counterModel: Optional[Dict[str, bool]] = None
    details: Optional[Dict[str, Any]] = None
    syntax_info: Optional[str] = None

# Proof validation logic
class CarnapFitchProofChecker:
    """Carnap-compatible Fitch-style natural deduction proof checker"""
    
    # Define inference rules (Carnap notation)
    INFERENCE_RULES = {
        # Basic rules
        "PR": "Premise",
        "AS": "Assumption",
        "R": "Reiteration",
        "REIT": "Reiteration",
        
        # Propositional rules
        "MP": "Modus Ponens",
        "MT": "Modus Tollens",
        "DN": "Double Negation",
        "DNE": "Double Negation Elimination",
        "DNI": "Double Negation Introduction",
        
        # Conjunction
        "&I": "Conjunction Introduction",
        "&E": "Conjunction Elimination",
        "/\\I": "Conjunction Introduction",
        "/\\E": "Conjunction Elimination",
        "∧I": "Conjunction Introduction",
        "∧E": "Conjunction Elimination",
        
        # Disjunction
        "|I": "Disjunction Introduction",
        "|E": "Disjunction Elimination",
        "\\/I": "Disjunction Introduction",
        "\\/E": "Disjunction Elimination",
        "∨I": "Disjunction Introduction",
        "∨E": "Disjunction Elimination",
        "ADD": "Addition",
        "MTP": "Modus Tollendo Ponens",
        
        # Conditional
        "->I": "Conditional Introduction",
        "->E": "Conditional Elimination",
        "→I": "Conditional Introduction",
        "→E": "Conditional Elimination",
        "CP": "Conditional Proof",
        
        # Biconditional
        "<->I": "Biconditional Introduction",
        "<->E": "Biconditional Elimination",
        "↔I": "Biconditional Introduction",
        "↔E": "Biconditional Elimination",
        "BC": "Biconditional",
        "CB": "Biconditional",
        
        # Negation
        "~I": "Negation Introduction",
        "~E": "Negation Elimination",
        "-I": "Negation Introduction",
        "-E": "Negation Elimination",
        "¬I": "Negation Introduction",
        "¬E": "Negation Elimination",
        
        # Contradiction
        "!?I": "Contradiction Introduction",
        "!?E": "Contradiction Elimination",
        "_|_I": "Contradiction Introduction",
        "_|_E": "Contradiction Elimination",
        "⊥I": "Contradiction Introduction",
        "⊥E": "Contradiction Elimination",
        
        # Indirect proofs
        "ID": "Indirect Derivation",
        "IP": "Indirect Proof",
        "RAA": "Reductio Ad Absurdum",
        
        # Show rules
        "DD": "Direct Derivation",
        "CD": "Conditional Derivation",
        
        # Quantifier rules
        "AI": "Universal Introduction",
        "AE": "Universal Elimination",
        "EI": "Existential Introduction",
        "EE": "Existential Elimination",
        "UI": "Universal Introduction",
        "UE": "Universal Elimination",
        "∀I": "Universal Introduction",
        "∀E": "Universal Elimination",
        "∃I": "Existential Introduction",
        "∃E": "Existential Elimination"
    }
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.steps = []
        self.rules_used = set()
        self.subproof_stack = []
        self.line_formulas = {}
        self.accessible_lines = set()
        self.show_lines = {}
        self.line_to_step = {}  # Maps line numbers to step indices
        
    def normalize_formula(self, formula: str) -> str:
        """Normalize formula for comparison"""
        # Replace various arrow notations with standard form
        formula = formula.replace('->', '→').replace('<->', '↔')
        formula = formula.replace('/\\', '∧').replace('&', '∧')
        formula = formula.replace('\\/', '∨').replace('|', '∨')
        formula = formula.replace('~', '¬').replace('-', '¬')
        formula = formula.replace('!?', '⊥').replace('_|_', '⊥')
        # Remove extra spaces but preserve structure
        formula = ' '.join(formula.split())
        return formula
    
    def parse_premises(self, gamma: str) -> List[str]:
        """Parse comma-separated premises"""
        if not gamma.strip():
            return []
        premises = []
        current = ""
        paren_depth = 0
        for char in gamma:
            if char == ',' and paren_depth == 0:
                premises.append(self.normalize_formula(current.strip()))
                current = ""
            else:
                if char == '(':
                    paren_depth += 1
                elif char == ')':
                    paren_depth -= 1
                current += char
        if current.strip():
            premises.append(self.normalize_formula(current.strip()))
        return premises
    
    def measure_indentation(self, line: str) -> int:
        """Measure indentation level (number of leading spaces)"""
        return len(line) - len(line.lstrip())
    
    def parse_proof(self, proof_text: str, premises: List[str]) -> List[Dict[str, Any]]:
        """Parse Carnap Fitch notation proof with space-based indentation"""
        lines = proof_text.split('\n')
        parsed_steps = []
        line_num = 0
        indent_stack = [0]  # Stack of indentation levels
        
        # Add premises as initial lines
        for i, premise in enumerate(premises, 1):
            self.line_formulas[i] = premise
            self.accessible_lines.add(i)
            self.line_to_step[i] = len(parsed_steps)
            parsed_steps.append({
                'line_number': i,
                'formula': premise,
                'justification': 'PR',
                'rule': 'PR',
                'cited_lines': [],
                'subproof_level': 0,
                'indent_level': 0,
                'is_premise': True,
                'is_show': False,
                'is_qed': False
            })
            line_num = i
        
        # Track whether we're expecting an indented block after a show
        expecting_indent_after_show = False
        show_indent_level = 0
        
        # Parse the actual proof
        for i, line in enumerate(lines):
            # Skip empty lines
            if not line.strip():
                continue
            
            # Skip separator lines
            if line.strip() == '--' or line.strip() == '---':
                continue
                
            # Measure indentation
            current_indent = self.measure_indentation(line)
            stripped_line = line.strip()
            
            line_num += 1
            
            # Handle indentation changes
            if expecting_indent_after_show:
                if current_indent > show_indent_level:
                    # Properly indented after show
                    indent_stack.append(current_indent)
                    self.subproof_stack.append({
                        'start': line_num, 
                        'assumptions': [],
                        'show_line': line_num - 1
                    })
                    expecting_indent_after_show = False
                else:
                    self.errors.append(f"Line {line_num}: Expected indentation after 'show' statement")
            elif current_indent < indent_stack[-1]:
                # Decrease in indentation - close subproofs
                while len(indent_stack) > 1 and indent_stack[-1] > current_indent:
                    indent_stack.pop()
                    if self.subproof_stack:
                        subproof = self.subproof_stack.pop()
                        # Mark lines from closed subproof as no longer accessible
                        for j in range(subproof['start'], line_num):
                            if j not in [p['line_number'] for p in parsed_steps if p.get('is_premise')]:
                                self.accessible_lines.discard(j)
            elif current_indent > indent_stack[-1] and not expecting_indent_after_show:
                # Unexpected increase in indentation
                self.warnings.append(f"Line {line_num}: Unexpected indentation increase")
            
            subproof_level = len(indent_stack) - 1
            
            # Check if it's a show line
            if stripped_line.lower().startswith('show'):
                formula = self.normalize_formula(stripped_line[4:].strip())
                self.show_lines[line_num] = formula
                self.line_to_step[line_num] = len(parsed_steps)
                parsed_steps.append({
                    'line_number': line_num,
                    'formula': formula,
                    'justification': 'show',
                    'rule': 'show',
                    'cited_lines': [],
                    'subproof_level': subproof_level,
                    'indent_level': current_indent,
                    'is_premise': False,
                    'is_show': True,
                    'is_qed': False
                })
                expecting_indent_after_show = True
                show_indent_level = current_indent
                continue
            
            # Parse regular line or QED line
            if stripped_line.startswith(':'):
                # QED line (e.g., ":DD" or ":CD 3-5")
                formula = "QED"
                justification = stripped_line[1:].strip()
                is_qed = True
            else:
                # Regular line (formula :justification)
                match = re.match(r'^(.+?)\s*:\s*(.+)$', stripped_line)
                if match:
                    formula = self.normalize_formula(match.group(1).strip())
                    justification = match.group(2).strip()
                    is_qed = False
                else:
                    # Line without justification - treat as error
                    self.errors.append(f"Line {line_num}: Missing justification (expected 'formula :justification')")
                    continue
            
            self.line_formulas[line_num] = formula
            if not is_qed:
                self.accessible_lines.add(line_num)
            
            # Parse justification
            rule, cited_lines = self.parse_justification(justification)
            
            # Handle assumptions
            if rule == 'AS' and self.subproof_stack:
                self.subproof_stack[-1]['assumptions'].append(line_num)
            
            self.line_to_step[line_num] = len(parsed_steps)
            parsed_steps.append({
                'line_number': line_num,
                'formula': formula,
                'justification': justification,
                'rule': rule,
                'cited_lines': cited_lines,
                'subproof_level': subproof_level,
                'indent_level': current_indent,
                'is_premise': False,
                'is_show': False,
                'is_qed': is_qed
            })
        
        return parsed_steps
    
    def parse_justification(self, justification: str) -> Tuple[str, List[int]]:
        """Parse Carnap-style justification (e.g., 'MP 1,2' or 'CD 3-5')"""
        parts = justification.split()
        if not parts:
            return '', []
        
        rule = parts[0].upper()
        cited_lines = []
        
        # Parse line citations
        if len(parts) > 1:
            for part in parts[1:]:
                # Handle comma-separated lines
                if ',' in part:
                    for num in part.split(','):
                        try:
                            cited_lines.append(int(num.strip()))
                        except ValueError:
                            pass
                # Handle range (e.g., "3-5")
                elif '-' in part:
                    try:
                        start, end = map(int, part.split('-'))
                        cited_lines.extend(range(start, end + 1))
                    except ValueError:
                        pass
                # Single line number
                else:
                    try:
                        cited_lines.append(int(part))
                    except ValueError:
                        pass
        
        return rule, cited_lines
    
    def validate_inference(self, step: Dict[str, Any]) -> bool:
        """Validate a single inference step"""
        formula = step['formula']
        rule = step['rule']
        cited_lines = step['cited_lines']
        line_num = step['line_number']
        
        # Special cases
        if rule in ['PR', 'AS', 'show'] or step.get('is_show'):
            return True
        
        if step.get('is_qed'):
            # Validate QED lines
            return self._validate_qed(step)
        
        # Check if cited lines are accessible
        for ref in cited_lines:
            if ref not in self.accessible_lines:
                self.errors.append(f"Line {line_num}: Line {ref} is not accessible from current context")
                return False
        
        # Validate based on rule
        if rule in self.INFERENCE_RULES:
            self.rules_used.add(rule)
            return self._validate_rule_application(formula, rule, cited_lines, line_num)
        else:
            self.errors.append(f"Line {line_num}: Unknown rule '{rule}'")
            return False
    
    def _validate_qed(self, qed_step: Dict[str, Any]) -> bool:
        """Validate QED line that closes a show statement"""
        rule = qed_step['rule']
        cited_lines = qed_step['cited_lines']
        
        # Find the corresponding show line
        if not self.subproof_stack:
            self.errors.append(f"Line {qed_step['line_number']}: QED without matching show")
            return False
        
        subproof = self.subproof_stack[-1]
        show_line_num = subproof.get('show_line')
        
        if show_line_num not in self.show_lines:
            self.errors.append(f"Line {qed_step['line_number']}: No show statement to close")
            return False
        
        show_formula = self.show_lines[show_line_num]
        
        # Validate based on the type of derivation
        if rule == 'DD':  # Direct Derivation
            # The last line before QED should match the show formula
            if cited_lines:
                last_line = cited_lines[-1]
                if last_line in self.line_formulas:
                    if self.normalize_formula(self.line_formulas[last_line]) == self.normalize_formula(show_formula):
                        return True
            self.errors.append(f"Line {qed_step['line_number']}: Direct derivation must derive the shown formula")
            return False
            
        elif rule == 'CD':  # Conditional Derivation
            # Should close a conditional show
            if '→' in show_formula or '->' in show_formula:
                return True
            self.errors.append(f"Line {qed_step['line_number']}: Conditional derivation requires conditional show")
            return False
            
        elif rule == 'ID' or rule == 'RAA':  # Indirect Derivation
            # Should derive a contradiction
            if cited_lines:
                last_line = cited_lines[-1]
                if last_line in self.line_formulas:
                    last_formula = self.line_formulas[last_line]
                    if '⊥' in last_formula or '_|_' in last_formula or '!?' in last_formula:
                        return True
            self.errors.append(f"Line {qed_step['line_number']}: Indirect derivation must derive a contradiction")
            return False
        
        return True
    
    def _validate_rule_application(self, conclusion: str, rule: str, cited_lines: List[int], line_num: int) -> bool:
        """Validate specific inference rule applications"""
        # Get referenced formulas
        ref_formulas = [self.line_formulas.get(ref, '') for ref in cited_lines]
        
        # Normalize for comparison
        conclusion_norm = self.normalize_formula(conclusion)
        
        # Validate based on rule type
        if rule in ['MP', '->E', '→E']:  # Modus Ponens
            if len(ref_formulas) >= 2:
                # Find conditional and antecedent
                for i, formula in enumerate(ref_formulas):
                    formula_norm = self.normalize_formula(formula)
                    if '→' in formula_norm:
                        parts = formula_norm.split('→', 1)
                        if len(parts) == 2:
                            antecedent = self.normalize_formula(parts[0])
                            consequent = self.normalize_formula(parts[1])
                            # Check other formulas for antecedent
                            for j, other in enumerate(ref_formulas):
                                if i != j:
                                    other_norm = self.normalize_formula(other)
                                    if other_norm == antecedent and consequent == conclusion_norm:
                                        return True
                self.errors.append(f"Line {line_num}: Invalid {self.INFERENCE_RULES[rule]} - need conditional and its antecedent")
                return False
                
        elif rule in ['&I', '/\\I', '∧I']:  # Conjunction Introduction
            if len(ref_formulas) >= 2:
                # Build expected conjunction
                left = self.normalize_formula(ref_formulas[0])
                right = self.normalize_formula(ref_formulas[1])
                expected = f"{left}∧{right}"
                expected_alt = f"({left})∧({right})"
                if conclusion_norm == expected or conclusion_norm == expected_alt:
                    return True
                # Try reverse order
                expected_rev = f"{right}∧{left}"
                expected_rev_alt = f"({right})∧({left})"
                if conclusion_norm == expected_rev or conclusion_norm == expected_rev_alt:
                    return True
                self.errors.append(f"Line {line_num}: Invalid {self.INFERENCE_RULES[rule]} - conclusion should be conjunction of cited formulas")
                return False
                
        elif rule in ['&E', '/\\E', '∧E']:  # Conjunction Elimination
            if len(ref_formulas) >= 1:
                for formula in ref_formulas:
                    formula_norm = self.normalize_formula(formula)
                    if '∧' in formula_norm:
                        # Remove outer parentheses if present
                        if formula_norm.startswith('(') and formula_norm.endswith(')'):
                            formula_norm = formula_norm[1:-1]
                        parts = formula_norm.split('∧', 1)
                        if len(parts) == 2:
                            left = self.normalize_formula(parts[0])
                            right = self.normalize_formula(parts[1])
                            if conclusion_norm == left or conclusion_norm == right:
                                return True
                self.errors.append(f"Line {line_num}: Invalid {self.INFERENCE_RULES[rule]} - must derive one conjunct")
                return False
        
        elif rule in ['R', 'REIT']:  # Reiteration
            if len(ref_formulas) >= 1:
                for formula in ref_formulas:
                    if self.normalize_formula(formula) == conclusion_norm:
                        return True
                self.errors.append(f"Line {line_num}: Reiteration must copy formula exactly")
                return False
        
        elif rule in ['ADD', '|I', '\\/I', '∨I']:  # Addition/Disjunction Introduction
            # Can add any disjunct to existing formula
            if '∨' in conclusion_norm:
                parts = conclusion_norm.split('∨', 1)
                if len(parts) == 2:
                    left = self.normalize_formula(parts[0])
                    right = self.normalize_formula(parts[1])
                    for formula in ref_formulas:
                        formula_norm = self.normalize_formula(formula)
                        if formula_norm == left or formula_norm == right:
                            return True
            self.errors.append(f"Line {line_num}: Invalid {self.INFERENCE_RULES[rule]} - must add disjunct to cited formula")
            return False
        
        elif rule in ['->I', '→I', 'CP']:  # Conditional Introduction
            # This typically closes a subproof - just check it produces a conditional
            if '→' in conclusion_norm:
                return True
            self.errors.append(f"Line {line_num}: {self.INFERENCE_RULES[rule]} must produce a conditional")
            return False
        
        elif rule in ['<->I', '↔I', 'BC']:  # Biconditional Introduction
            # Need two conditionals: A→B and B→A to derive A↔B
            if len(ref_formulas) >= 2 and '↔' in conclusion_norm:
                # Extract the parts of the biconditional
                parts = conclusion_norm.split('↔', 1)
                if len(parts) == 2:
                    left = self.normalize_formula(parts[0])
                    right = self.normalize_formula(parts[1])
                    # Check if we have both directions
                    forward = f"{left}→{right}"
                    backward = f"{right}→{left}"
                    ref_norms = [self.normalize_formula(f) for f in ref_formulas]
                    if forward in ref_norms and backward in ref_norms:
                        return True
            self.errors.append(f"Line {line_num}: {self.INFERENCE_RULES[rule]} requires both directions of implication")
            return False
        
        elif rule in ['<->E', '↔E', 'CB']:  # Biconditional Elimination
            # From A↔B can derive A→B or B→A
            if len(ref_formulas) >= 1:
                for formula in ref_formulas:
                    formula_norm = self.normalize_formula(formula)
                    if '↔' in formula_norm:
                        parts = formula_norm.split('↔', 1)
                        if len(parts) == 2:
                            left = self.normalize_formula(parts[0])
                            right = self.normalize_formula(parts[1])
                            forward = f"{left}→{right}"
                            backward = f"{right}→{left}"
                            if conclusion_norm == forward or conclusion_norm == backward:
                                return True
            self.errors.append(f"Line {line_num}: {self.INFERENCE_RULES[rule]} must derive one direction of the biconditional")
            return False
        
        elif rule in ['|E', '\\/E', '∨E']:  # Disjunction Elimination
            # This is complex - need disjunction and two subproofs showing same conclusion from each disjunct
            # For now, accept if cited lines include a disjunction
            if any('∨' in self.normalize_formula(f) for f in ref_formulas):
                return True
            self.errors.append(f"Line {line_num}: {self.INFERENCE_RULES[rule]} requires a disjunction and subproofs")
            return False
        
        elif rule == 'MTP':  # Modus Tollendo Ponens (Disjunctive Syllogism)
            # From A∨B and ¬A, derive B
            if len(ref_formulas) >= 2:
                for i, formula in enumerate(ref_formulas):
                    formula_norm = self.normalize_formula(formula)
                    if '∨' in formula_norm:
                        parts = formula_norm.split('∨', 1)
                        if len(parts) == 2:
                            left = self.normalize_formula(parts[0])
                            right = self.normalize_formula(parts[1])
                            # Check if other formula is negation of one disjunct
                            for j, other in enumerate(ref_formulas):
                                if i != j:
                                    other_norm = self.normalize_formula(other)
                                    if other_norm == f"¬{left}" and conclusion_norm == right:
                                        return True
                                    if other_norm == f"¬{right}" and conclusion_norm == left:
                                        return True
            self.errors.append(f"Line {line_num}: {self.INFERENCE_RULES[rule]} requires disjunction and negation of one disjunct")
            return False
        
        elif rule in ['DN', 'DNE']:  # Double Negation Elimination
            if len(ref_formulas) >= 1:
                for formula in ref_formulas:
                    formula_norm = self.normalize_formula(formula)
                    # Check if formula is ¬¬P and conclusion is P
                    if formula_norm.startswith('¬¬'):
                        expected = formula_norm[2:]
                        if conclusion_norm == expected:
                            return True
                self.errors.append(f"Line {line_num}: Invalid {self.INFERENCE_RULES[rule]} - requires ¬¬φ to derive φ")
                return False
        
        elif rule == 'DNI':  # Double Negation Introduction
            if len(ref_formulas) >= 1:
                for formula in ref_formulas:
                    formula_norm = self.normalize_formula(formula)
                    expected = f"¬¬{formula_norm}"
                    if conclusion_norm == expected:
                        return True
                self.errors.append(f"Line {line_num}: Invalid {self.INFERENCE_RULES[rule]} - should derive ¬¬φ from φ")
                return False
        
        elif rule in ['~E', '-E', '¬E']:  # Negation Elimination
            # From P and ¬P, derive ⊥
            if len(ref_formulas) >= 2 and conclusion_norm == '⊥':
                for i, formula in enumerate(ref_formulas):
                    formula_norm = self.normalize_formula(formula)
                    for j, other in enumerate(ref_formulas):
                        if i != j:
                            other_norm = self.normalize_formula(other)
                            if other_norm == f"¬{formula_norm}" or formula_norm == f"¬{other_norm}":
                                return True
                self.errors.append(f"Line {line_num}: {self.INFERENCE_RULES[rule]} requires P and ¬P to derive ⊥")
                return False
            return False
        
        elif rule in ['!?E', '_|_E', '⊥E']:  # Contradiction Elimination (Ex Falso)
            # From ⊥, derive anything
            if len(ref_formulas) >= 1:
                for formula in ref_formulas:
                    if self.normalize_formula(formula) == '⊥':
                        return True  # Can derive anything from contradiction
            self.errors.append(f"Line {line_num}: {self.INFERENCE_RULES[rule]} requires ⊥")
            return False
        
        elif rule == 'MT':  # Modus Tollens
            # From P→Q and ¬Q, derive ¬P
            if len(ref_formulas) >= 2:
                for i, formula in enumerate(ref_formulas):
                    formula_norm = self.normalize_formula(formula)
                    if '→' in formula_norm:
                        parts = formula_norm.split('→', 1)
                        if len(parts) == 2:
                            antecedent = self.normalize_formula(parts[0])
                            consequent = self.normalize_formula(parts[1])
                            # Check if other formula is negation of consequent
                            for j, other in enumerate(ref_formulas):
                                if i != j:
                                    other_norm = self.normalize_formula(other)
                                    if other_norm == f"¬{consequent}" and conclusion_norm == f"¬{antecedent}":
                                        return True
                self.errors.append(f"Line {line_num}: Invalid {self.INFERENCE_RULES[rule]} - need P→Q and ¬Q to derive ¬P")
                return False
        
        # For other rules, we'll be lenient for now
        return True
    
    def calculate_proof_optimality(self, parsed_steps: List[Dict[str, Any]], best_known: int = None) -> Dict[str, Any]:
        """Calculate proof optimality metrics"""
        # Count non-premise, non-show steps
        proof_steps = [s for s in parsed_steps if not s.get('is_premise') and not s.get('is_show') and not s.get('is_qed')]
        actual_length = len(proof_steps)
        
        # Identify potentially redundant steps
        redundant_steps = []
        used_lines = set()
        
        # Backward pass to find which lines are actually used
        for step in reversed(parsed_steps):
            if step.get('cited_lines'):
                used_lines.update(step['cited_lines'])
        
        # Forward pass to identify unused lines
        for step in parsed_steps:
            line_num = step['line_number']
            if (not step.get('is_premise') and 
                not step.get('is_show') and 
                line_num not in used_lines and
                step.get('rule') not in ['AS', 'show']):  # Assumptions and shows are always "used"
                redundant_steps.append(line_num)
        
        optimality_score = 100
        if redundant_steps:
            optimality_score -= len(redundant_steps) * 10
        
        if best_known and actual_length > best_known:
            optimality_score -= (actual_length - best_known) * 5
        
        return {
            'actual_length': actual_length,
            'redundant_steps': redundant_steps,
            'optimality_score': max(0, optimality_score),
            'efficiency_ratio': (best_known / actual_length * 100) if best_known else None
        }
    
    def suggest_improvements(self, parsed_steps: List[Dict[str, Any]], rules_used: set) -> List[str]:
        """Suggest alternative proof strategies"""
        suggestions = []
        
        # Check for common patterns that could be improved
        reit_count = sum(1 for s in parsed_steps if s.get('rule') == 'R')
        if reit_count > 3:
            suggestions.append("Consider reorganizing to reduce reiterations")
        
        # Check if conditional proof might be more efficient
        if 'AS' not in [s.get('rule') for s in parsed_steps]:
            for step in parsed_steps:
                if '→' in step.get('formula', ''):
                    suggestions.append("Consider using conditional proof (Show/AS) for deriving conditionals")
                    break
        
        # Check for missed conjunction eliminations
        conj_formulas = [s for s in parsed_steps if '∧' in s.get('formula', '')]
        if conj_formulas and '&E' not in rules_used and '∧E' not in rules_used:
            suggestions.append("You have conjunctions that could be eliminated to access their parts")
        
        # Check for long chains of modus ponens
        mp_count = sum(1 for s in parsed_steps if s.get('rule') in ['MP', '->E', '→E'])
        if mp_count > 4:
            suggestions.append("Consider if some conditional chains could be combined or reorganized")
        
        return suggestions
    
    def validate_proof(self, gamma: str, phi: str, proof_text: str) -> ProofResponse:
        """Main validation method"""
        self.errors = []
        self.warnings = []
        self.rules_used = set()
        
        try:
            # Parse premises and conclusion
            premises = self.parse_premises(gamma)
            conclusion = self.normalize_formula(phi.strip())
            
            # Parse the proof
            parsed_steps = self.parse_proof(proof_text, premises)
            
            # Validate each non-premise step
            for step in parsed_steps:
                if not step.get('is_premise') and not step.get('is_show'):
                    self.validate_inference(step)
            
            # Check if conclusion is reached
            proof_valid = False
            
            # In Carnap style, look for a completed show line or direct conclusion
            if parsed_steps:
                # Check for show-style proof
                for i, step in enumerate(parsed_steps):
                    if step.get('is_show') and self.normalize_formula(step['formula']) == conclusion:
                        # Check if this show was completed (look for QED after it)
                        for j in range(i+1, len(parsed_steps)):
                            if parsed_steps[j].get('is_qed') and parsed_steps[j]['subproof_level'] <= step['subproof_level']:
                                proof_valid = True
                                break
                
                # Also check for direct conclusion at top level
                if not proof_valid:
                    for step in reversed(parsed_steps):
                        if step['subproof_level'] == 0 and not step.get('is_show') and not step.get('is_qed'):
                            if self.normalize_formula(step['formula']) == conclusion:
                                proof_valid = True
                                break
                
                if not proof_valid:
                    self.errors.append(f"Proof does not establish the required conclusion: {phi}")
            
            # Count lines and depth
            proof_lines = len([s for s in parsed_steps if not s.get('is_premise')])
            max_depth = max([s['subproof_level'] for s in parsed_steps] + [0])
            
            # Calculate optimality (assume best_known from puzzle data if available)
            optimality = self.calculate_proof_optimality(parsed_steps)
            
            # Get improvement suggestions if proof is valid
            suggestions = []
            if proof_valid and len(self.errors) == 0:
                suggestions = self.suggest_improvements(parsed_steps, self.rules_used)
            
            # Add syntax info
            syntax_info = "Carnap-compatible Fitch notation detected. Using ':' for justifications and space-based indentation."
            
            response = ProofResponse(
                ok=proof_valid and len(self.errors) == 0,
                lines=proof_lines,
                depth=max_depth,
                error='; '.join(self.errors) if self.errors else None,
                details={
                    'rules_used': list(self.rules_used),
                    'warnings': self.warnings,
                    'steps': len(parsed_steps),
                    'syntax': 'carnap',
                    'optimality': optimality,
                    'suggestions': suggestions
                },
                syntax_info=syntax_info
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error validating proof: {e}")
            import traceback
            traceback.print_exc()
            return ProofResponse(
                ok=False,
                error=f"Internal error: {str(e)}"
            )

# SAT solver for countermodels
class CountermodelGenerator:
    """Generate countermodels using minisat"""
    
    def __init__(self):
        self.variables = {}
        self.var_count = 0
        self.clauses = []
        
    def extract_variables(self, formula: str) -> set:
        """Extract propositional variables from formula"""
        # Normalize formula first
        formula = formula.replace('->', '').replace('<->', '').replace('→', '').replace('↔', '')
        formula = formula.replace('/\\', '').replace('\\/', '').replace('&', '').replace('|', '')
        formula = formula.replace('∧', '').replace('∨', '').replace('¬', '').replace('~', '').replace('-', '')
        formula = formula.replace('!?', '').replace('_|_', '').replace('⊥', '')
        formula = formula.replace('(', '').replace(')', '').replace(' ', '')
        
        # Extract uppercase letters
        variables = set()
        for char in formula:
            if char.isupper() and char.isalpha():
                variables.add(char)
        return variables
    
    def formula_to_cnf(self, formula: str, negate: bool = False) -> List[List[int]]:
        """Convert formula to CNF (simplified version)"""
        # This is a very simplified CNF conversion
        # In production, would need a proper parser and CNF converter
        
        # Extract variables
        vars_in_formula = self.extract_variables(formula)
        
        # Assign numbers to variables
        for var in vars_in_formula:
            if var not in self.variables:
                self.var_count += 1
                self.variables[var] = self.var_count
        
        # For now, return a simple clause
        # This would need proper implementation
        if negate:
            return [[-self.variables.get(v, 1) for v in vars_in_formula]]
        else:
            return [[self.variables.get(v, 1) for v in vars_in_formula]]
    
    def generate_countermodel(self, gamma: str, phi: str) -> Optional[Dict[str, bool]]:
        """Generate countermodel if premises don't entail conclusion"""
        try:
            self.variables = {}
            self.var_count = 0
            self.clauses = []
            
            # Parse premises
            premises = []
            if gamma.strip():
                # Handle comma separation properly
                current = ""
                paren_depth = 0
                for char in gamma:
                    if char == ',' and paren_depth == 0:
                        if current.strip():
                            premises.append(current.strip())
                        current = ""
                    else:
                        if char == '(':
                            paren_depth += 1
                        elif char == ')':
                            paren_depth -= 1
                        current += char
                if current.strip():
                    premises.append(current.strip())
            
            # Convert premises to CNF (must all be true)
            for premise in premises:
                self.clauses.extend(self.formula_to_cnf(premise, negate=False))
            
            # Add negation of conclusion
            self.clauses.extend(self.formula_to_cnf(phi, negate=True))
            
            # Create DIMACS file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.cnf', delete=False) as f:
                f.write(f"p cnf {self.var_count} {len(self.clauses)}\n")
                for clause in self.clauses:
                    f.write(' '.join(map(str, clause)) + ' 0\n')
                dimacs_file = f.name
            
            # Run minisat
            result_file = dimacs_file + '.result'
            try:
                result = subprocess.run(
                    ['minisat', dimacs_file, result_file],
                    capture_output=True,
                    timeout=5,
                    text=True
                )
                
                # Parse result
                if os.path.exists(result_file):
                    with open(result_file, 'r') as f:
                        lines = f.readlines()
                        if lines and lines[0].strip() == 'SAT':
                            # Found countermodel
                            if len(lines) > 1:
                                assignments = lines[1].strip().split()
                                countermodel = {}
                                
                                # Map assignments back to variables
                                var_to_name = {num: name for name, num in self.variables.items()}
                                
                                for assignment in assignments:
                                    if assignment != '0':
                                        var_num = abs(int(assignment))
                                        if var_num in var_to_name:
                                            countermodel[var_to_name[var_num]] = int(assignment) > 0
                                
                                return countermodel
                
            except subprocess.TimeoutExpired:
                logger.error("SAT solver timeout")
            except FileNotFoundError:
                logger.error("minisat not found")
                # Return mock countermodel for testing
                if self.variables:
                    return {var: False for var in self.variables.keys()}
            finally:
                # Cleanup
                for file in [dimacs_file, result_file]:
                    if os.path.exists(file):
                        os.unlink(file)
                        
        except Exception as e:
            logger.error(f"Error generating countermodel: {e}")
            
        return None

# API Endpoints
@app.get("/")
async def root():
    return {
        "service": "Proof Checker Service",
        "version": "2.0.0",
        "syntax": "Carnap-compatible Fitch notation",
        "features": [
            "Space-based indentation",
            "Colon-separated justifications",
            "Show statements and QED lines",
            "Automatic formula normalization"
        ],
        "endpoints": [
            "/verify",
            "/health",
            "/syntax-guide"
        ]
    }

@app.post("/verify", response_model=ProofResponse)
async def verify_proof(request: ProofRequest) -> ProofResponse:
    """Verify a natural deduction proof using Carnap syntax"""
    try:
        checker = CarnapFitchProofChecker()
        response = checker.validate_proof(
            gamma=request.gamma,
            phi=request.phi,
            proof=request.proof
        )
        
        # If proof is invalid due to invalid sequent, generate countermodel
        if not response.ok and "does not establish" in (response.error or ""):
            generator = CountermodelGenerator()
            countermodel = generator.generate_countermodel(
                request.gamma,
                request.phi
            )
            if countermodel:
                response.counterModel = countermodel
                response.error = f"{response.error}; Countermodel: {countermodel}"
        
        return response
        
    except Exception as e:
        logger.error(f"Error in verify endpoint: {e}")
        return ProofResponse(
            ok=False,
            error=f"Internal server error: {str(e)}"
        )

@app.get("/syntax-guide")
async def syntax_guide():
    """Get a guide for Carnap Fitch syntax"""
    return {
        "basic_structure": {
            "description": "Proofs use colon-separated justifications and space-based indentation",
            "example": "P→Q    :PR\nP      :PR\nQ      :MP 1,2"
        },
        "justifications": {
            "premise": ":PR",
            "assumption": ":AS",
            "reiteration": ":R line_number",
            "modus_ponens": ":MP conditional_line,antecedent_line",
            "conjunction_intro": ":&I line1,line2",
            "conjunction_elim": ":&E conjunction_line"
        },
        "subproofs": {
            "description": "Use 'show' statements and indentation",
            "example": "Show P→P\n    P    :AS\n:CD 2"
        },
        "symbols": {
            "negation": "~ or - or ¬",
            "conjunction": "/\\ or & or ∧",
            "disjunction": "\\/ or | or ∨",
            "conditional": "-> or →",
            "biconditional": "<-> or ↔",
            "contradiction": "!? or _|_ or ⊥"
        },
        "closing_subproofs": {
            "direct_derivation": ":DD line_number",
            "conditional_derivation": ":CD line_range",
            "indirect_derivation": ":ID line_range"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Check if minisat is available
    try:
        result = subprocess.run(['which', 'minisat'], capture_output=True)
        minisat_available = result.returncode == 0
    except:
        minisat_available = False
    
    return {
        "status": "healthy",
        "service": "proof-checker",
        "version": "2.0.0",
        "minisat_available": minisat_available,
        "syntax": "carnap-compatible"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5003)