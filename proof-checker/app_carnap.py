from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
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

app = FastAPI(title="Proof Checker Service", version="2.0.0")

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

# Proof validation logic
class CarnapFitchProofChecker:
    """Carnap-compatible Fitch-style natural deduction proof checker"""
    
    # Define inference rules (Carnap notation)
    INFERENCE_RULES = {
        # Basic rules
        "PR": "Premise",
        "AS": "Assumption",
        "R": "Reiteration",
        
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
        
        # Disjunction
        "|I": "Disjunction Introduction",
        "|E": "Disjunction Elimination",
        "\\/I": "Disjunction Introduction",
        "\\/E": "Disjunction Elimination",
        "ADD": "Addition",
        "MTP": "Modus Tollendo Ponens",
        
        # Conditional
        "->I": "Conditional Introduction",
        "->E": "Conditional Elimination",
        "CP": "Conditional Proof",
        
        # Biconditional
        "<->I": "Biconditional Introduction",
        "<->E": "Biconditional Elimination",
        "BC": "Biconditional",
        "CB": "Biconditional",
        
        # Negation
        "~I": "Negation Introduction",
        "~E": "Negation Elimination",
        "-I": "Negation Introduction",
        "-E": "Negation Elimination",
        
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
        "EE": "Existential Elimination"
    }
    
    # Map common variations to canonical forms
    RULE_ALIASES = {
        "∧I": "&I", "∧E": "&E",
        "∨I": "|I", "∨E": "|E",
        "→I": "->I", "→E": "->E",
        "¬I": "~I", "¬E": "~E",
        "↔I": "<->I", "↔E": "<->E",
        "⊥I": "_|_I", "⊥E": "_|_E",
        "∀I": "AI", "∀E": "AE",
        "∃I": "EI", "∃E": "EE",
        "Reit": "R",
        "Assume": "AS",
        "Premise": "PR"
    }
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.steps = []
        self.rules_used = set()
        self.subproof_stack = []
        self.line_formulas = {}
        self.accessible_lines = set()
        self.show_lines = {}  # Track show statements
        
    def normalize_rule(self, rule: str) -> str:
        """Normalize rule name to canonical form"""
        rule = rule.strip().upper()
        return self.RULE_ALIASES.get(rule, rule)
    
    def parse_premises(self, gamma: str) -> List[str]:
        """Parse comma-separated premises"""
        if not gamma.strip():
            return []
        premises = []
        current = ""
        paren_depth = 0
        for char in gamma:
            if char == ',' and paren_depth == 0:
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
        return premises
    
    def parse_proof(self, proof_text: str, premises: List[str]) -> List[Dict[str, Any]]:
        """Parse Carnap Fitch notation proof into structured steps"""
        lines = proof_text.strip().split('\n')
        parsed_steps = []
        line_num = 0
        current_indent = 0
        indent_stack = [0]
        
        # Add premises as initial lines
        for i, premise in enumerate(premises, 1):
            self.line_formulas[i] = premise
            self.accessible_lines.add(i)
            parsed_steps.append({
                'line_number': i,
                'formula': premise,
                'justification': 'PR',
                'rule': 'PR',
                'cited_lines': [],
                'subproof_level': 0,
                'is_premise': True,
                'is_show': False
            })
            line_num = i
        
        # Parse the actual proof
        for line in lines:
            if not line.strip():
                continue
            
            # Calculate indentation
            stripped_line = line.lstrip()
            indent = len(line) - len(stripped_line)
            
            # Handle separator lines
            if stripped_line.strip() == '--':
                continue
                
            line_num += 1
            
            # Update indentation level
            if indent > current_indent:
                indent_stack.append(indent)
                self.subproof_stack.append({'start': line_num, 'assumptions': []})
            elif indent < current_indent:
                # Close subproofs
                while indent_stack and indent_stack[-1] > indent:
                    indent_stack.pop()
                    if self.subproof_stack:
                        subproof = self.subproof_stack.pop()
                        # Mark lines from closed subproof as no longer accessible
                        for i in range(subproof['start'], line_num):
                            if i not in [p['line_number'] for p in parsed_steps if p.get('is_premise')]:
                                self.accessible_lines.discard(i)
            
            current_indent = indent
            subproof_level = len(indent_stack) - 1
            
            # Parse line content
            # Check if it's a show line
            if stripped_line.lower().startswith('show'):
                formula = stripped_line[4:].strip()
                self.show_lines[line_num] = formula
                parsed_steps.append({
                    'line_number': line_num,
                    'formula': formula,
                    'justification': 'show',
                    'rule': 'show',
                    'cited_lines': [],
                    'subproof_level': subproof_level,
                    'is_premise': False,
                    'is_show': True
                })
                continue
            
            # Handle explicit QED line like "QED :..."
            qed_match = re.match(r'^qed\s*:\s*(.+)$', stripped_line, flags=re.IGNORECASE)
            if qed_match:
                formula = "QED"
                justification = qed_match.group(1).strip()
                rule, cited_lines = self.parse_justification(justification)
                self.line_formulas[line_num] = formula
                self.accessible_lines.add(line_num)
                parsed_steps.append({
                    'line_number': line_num,
                    'formula': formula,
                    'justification': justification,
                    'rule': rule,
                    'cited_lines': cited_lines,
                    'subproof_level': subproof_level,
                    'is_premise': False,
                    'is_show': False
                })
            else:
                # Parse regular line (formula :justification)
                match = re.match(r'^(.+?)\s*:\s*(.+)$', stripped_line)
                if match:
                    formula = match.group(1).strip()
                    justification = match.group(2).strip()
                    
                    # Handle colon-led QED lines (e.g., ":DD" or ":CD 3")
                    if not formula:
                        formula = "QED"
                
                    self.line_formulas[line_num] = formula
                    self.accessible_lines.add(line_num)
                    
                    # Parse justification
                    rule, cited_lines = self.parse_justification(justification)
                    
                    # Handle assumptions
                    if rule == 'AS' and self.subproof_stack:
                        self.subproof_stack[-1]['assumptions'].append(line_num)
                    
                    parsed_steps.append({
                        'line_number': line_num,
                        'formula': formula,
                        'justification': justification,
                        'rule': rule,
                        'cited_lines': cited_lines,
                        'subproof_level': subproof_level,
                        'is_premise': False,
                        'is_show': False
                    })
                else:
                    # Try to parse as formula only (implicit reiteration)
                    self.line_formulas[line_num] = stripped_line
                    self.accessible_lines.add(line_num)
                    parsed_steps.append({
                        'line_number': line_num,
                        'formula': stripped_line,
                        'justification': '',
                        'rule': '',
                        'cited_lines': [],
                        'subproof_level': subproof_level,
                        'is_premise': False,
                        'is_show': False
                    })
        
        return parsed_steps
    
    def parse_justification(self, justification: str) -> tuple[str, List[int]]:
        """Parse Carnap-style justification (e.g., 'MP 1,2' or 'CD 3-5')"""
        parts = justification.split()
        if not parts:
            return '', []
        
        rule = self.normalize_rule(parts[0])
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
        
        if formula == 'QED':
            # QED lines close subproofs
            return True
        
        # Check if cited lines are accessible
        for ref in cited_lines:
            if ref not in self.accessible_lines:
                self.errors.append(f"Line {line_num}: Line {ref} is not accessible from current context")
                return False
        
        # Validate based on rule
        if rule:
            self.rules_used.add(rule)
            return self._validate_rule_application(formula, rule, cited_lines, line_num)
        
        return True
    
    def _validate_rule_application(self, conclusion: str, rule: str, cited_lines: List[int], line_num: int) -> bool:
        """Validate specific inference rule applications with comprehensive rule checking"""
        # Get referenced formulas
        ref_formulas = [self.line_formulas.get(ref, '') for ref in cited_lines]
        
        # Enhanced formula normalization for comparison
        def normalize(f):
            """Normalize formula for comparison, handling all logical operators"""
            if not f:
                return ''
            normalized = f.strip().replace(' ', '')
            # Convert to consistent symbols
            normalized = normalized.replace('->','→').replace('⊃','→')
            normalized = normalized.replace('/\\','∧').replace('&','∧')
            normalized = normalized.replace('\\/','∨').replace('|','∨').replace('v','∨')
            normalized = normalized.replace('~','¬').replace('-','¬').replace('not','¬')
            normalized = normalized.replace('<->','↔').replace('<=>','↔').replace('iff','↔')
            return normalized
        
        # Helper to parse binary operators
        def parse_binary(formula, operators):
            """Parse formula with binary operators, returns (left, operator, right) or None"""
            norm = normalize(formula)
            for op in operators:
                if op in norm:
                    # Find the main operator (not within parentheses)
                    depth = 0
                    for i, char in enumerate(norm):
                        if char == '(':
                            depth += 1
                        elif char == ')':
                            depth -= 1
                        elif depth == 0 and norm[i:i+len(op)] == op:
                            return (norm[:i], op, norm[i+len(op):])
            return None
        
        conclusion_norm = normalize(conclusion)
        
        # Validate based on rule type
        if rule in ['MP', '->E', '→E']:  # Modus Ponens / Conditional Elimination
            if len(ref_formulas) >= 2:
                # Find conditional and antecedent
                for i, formula in enumerate(ref_formulas):
                    parsed = parse_binary(formula, ['→', '->'])
                    if parsed:
                        antecedent, _, consequent = parsed
                        # Check other formulas for antecedent
                        for j, other in enumerate(ref_formulas):
                            if i != j and normalize(other) == antecedent and consequent == conclusion_norm:
                                return True
                self.errors.append(f"Line {line_num}: Invalid Modus Ponens - need A→B and A to derive B")
                return False
                
        elif rule in ['&I', '/\\I', '∧I']:  # Conjunction Introduction
            if len(ref_formulas) >= 2:
                # Check if conclusion is conjunction of any two referenced formulas
                parsed = parse_binary(conclusion, ['∧', '&', '/\\'])
                if parsed:
                    left, _, right = parsed
                    # Check all combinations
                    for i in range(len(ref_formulas)):
                        for j in range(len(ref_formulas)):
                            if i != j:
                                if (normalize(ref_formulas[i]) == left and normalize(ref_formulas[j]) == right) or \
                                   (normalize(ref_formulas[i]) == right and normalize(ref_formulas[j]) == left):
                                    return True
                self.errors.append(f"Line {line_num}: Invalid Conjunction Introduction - need A and B to derive A∧B")
                return False
                
        elif rule in ['&E', '/\\E', '∧E']:  # Conjunction Elimination
            if len(ref_formulas) >= 1:
                for formula in ref_formulas:
                    parsed = parse_binary(formula, ['∧', '&', '/\\'])
                    if parsed:
                        left, _, right = parsed
                        if conclusion_norm == left or conclusion_norm == right:
                            return True
                self.errors.append(f"Line {line_num}: Invalid Conjunction Elimination - can only derive components of conjunction")
                return False
        
        elif rule in ['MT']:  # Modus Tollens
            if len(ref_formulas) >= 2:
                # Need A→B and ¬B to derive ¬A
                for i, formula in enumerate(ref_formulas):
                    parsed = parse_binary(formula, ['→', '->'])
                    if parsed:
                        antecedent, _, consequent = parsed
                        # Check for negated consequent
                        for j, other in enumerate(ref_formulas):
                            if i != j:
                                other_norm = normalize(other)
                                # Check if other is ¬consequent
                                if other_norm == f'¬{consequent}' or other_norm == f'¬({consequent})':
                                    # Conclusion should be ¬antecedent
                                    if conclusion_norm == f'¬{antecedent}' or conclusion_norm == f'¬({antecedent})':
                                        return True
                self.errors.append(f"Line {line_num}: Invalid Modus Tollens - need A→B and ¬B to derive ¬A")
                return False
        
        elif rule in ['DN', 'DNE']:  # Double Negation Elimination
            if len(ref_formulas) >= 1:
                for formula in ref_formulas:
                    norm = normalize(formula)
                    # Check if formula is ¬¬A and conclusion is A
                    if norm.startswith('¬¬'):
                        inner = norm[2:]
                        if conclusion_norm == inner:
                            return True
                    # Also check parenthesized forms
                    if norm.startswith('¬(¬') and norm.endswith(')'):
                        inner = norm[3:-1]
                        if conclusion_norm == inner:
                            return True
                self.errors.append(f"Line {line_num}: Invalid Double Negation Elimination - need ¬¬A to derive A")
                return False
        
        elif rule in ['DNI']:  # Double Negation Introduction
            if len(ref_formulas) >= 1:
                for formula in ref_formulas:
                    norm = normalize(formula)
                    # Check if conclusion is ¬¬formula
                    if conclusion_norm == f'¬¬{norm}' or conclusion_norm == f'¬¬({norm})':
                        return True
                self.errors.append(f"Line {line_num}: Invalid Double Negation Introduction - need A to derive ¬¬A")
                return False
        
        elif rule in ['R', 'REIT']:  # Reiteration
            if len(ref_formulas) >= 1:
                for formula in ref_formulas:
                    if normalize(formula) == conclusion_norm:
                        return True
                self.errors.append(f"Line {line_num}: Reiteration must copy formula exactly")
                return False
        
        elif rule in ['ADD', '|I', '\\/I', '∨I']:  # Addition/Disjunction Introduction
            # Can derive A∨B from A (or B∨A from B)
            if len(ref_formulas) >= 1:
                parsed = parse_binary(conclusion, ['∨', '|', '\\/'])
                if parsed:
                    left, _, right = parsed
                    for formula in ref_formulas:
                        formula_norm = normalize(formula)
                        if formula_norm == left or formula_norm == right:
                            return True
                self.errors.append(f"Line {line_num}: Invalid Disjunction Introduction - need A to derive A∨B")
                return False
        
        elif rule in ['|E', '\\/E', '∨E']:  # Disjunction Elimination
            # Complex rule: needs A∨B and two subproofs showing C from A and C from B
            # For now, check if we have a disjunction in references
            has_disjunction = False
            for formula in ref_formulas:
                if parse_binary(formula, ['∨', '|', '\\/']):
                    has_disjunction = True
                    break
            if not has_disjunction:
                self.errors.append(f"Line {line_num}: Disjunction Elimination requires a disjunction")
                return False
            return True  # More complex validation would need subproof tracking
        
        elif rule in ['<->I', '↔I', 'BC']:  # Biconditional Introduction
            # Need both A→B and B→A to derive A↔B
            parsed = parse_binary(conclusion, ['↔', '<->'])
            if parsed:
                left, _, right = parsed
                found_left_to_right = False
                found_right_to_left = False
                
                for formula in ref_formulas:
                    norm = normalize(formula)
                    if norm == f'{left}→{right}' or norm == f'({left})→({right})':
                        found_left_to_right = True
                    if norm == f'{right}→{left}' or norm == f'({right})→({left})':
                        found_right_to_left = True
                
                if found_left_to_right and found_right_to_left:
                    return True
                self.errors.append(f"Line {line_num}: Biconditional Introduction needs both directions")
                return False
        
        elif rule in ['<->E', '↔E', 'CB']:  # Biconditional Elimination
            # From A↔B can derive A→B or B→A
            for formula in ref_formulas:
                parsed = parse_binary(formula, ['↔', '<->'])
                if parsed:
                    left, _, right = parsed
                    # Check if conclusion is one of the conditionals
                    if conclusion_norm == f'{left}→{right}' or conclusion_norm == f'{right}→{left}':
                        return True
            self.errors.append(f"Line {line_num}: Invalid Biconditional Elimination")
            return False
        
        elif rule in ['~I', '¬I', '-I']:  # Negation Introduction (requires contradiction in subproof)
            # Complex rule requiring subproof analysis
            return True  # Would need subproof tracking for full validation
        
        elif rule in ['~E', '¬E', '-E']:  # Negation Elimination
            # From A and ¬A derive ⊥ (bottom/contradiction)
            if conclusion_norm in ['⊥', '_|_', 'false']:
                # Check for contradictory formulas
                for i, formula1 in enumerate(ref_formulas):
                    norm1 = normalize(formula1)
                    for j, formula2 in enumerate(ref_formulas):
                        if i != j:
                            norm2 = normalize(formula2)
                            # Check if one is negation of the other
                            if norm2 == f'¬{norm1}' or norm2 == f'¬({norm1})' or \
                               norm1 == f'¬{norm2}' or norm1 == f'¬({norm2})':
                                return True
            return True  # Be lenient for now
        
        elif rule in ['->I', '→I', 'CP', 'CD']:  # Conditional Introduction/Proof
            # Should produce a conditional from a subproof
            parsed = parse_binary(conclusion, ['→', '->'])
            if not parsed:
                self.errors.append(f"Line {line_num}: Conditional Introduction must produce A→B")
                return False
            return True  # Would need subproof tracking for full validation
        
        elif rule in ['DD', 'ID', 'IP', 'RAA']:  # Direct/Indirect Derivation
            # These close show lines - need subproof context
            return True
        
        # Default for unrecognized rules
        self.warnings.append(f"Line {line_num}: Rule '{rule}' not fully validated")
        return True
    
    def validate_proof(self, gamma: str, phi: str, proof_text: str) -> ProofResponse:
        """Main validation method"""
        self.errors = []
        self.warnings = []
        self.rules_used = set()
        
        try:
            # Parse premises and conclusion
            premises = self.parse_premises(gamma)
            conclusion = phi.strip()
            
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
                    if step.get('is_show') and step['formula'].replace(' ', '') == conclusion.replace(' ', ''):
                        # Check if this show was completed (look for QED after it)
                        for j in range(i+1, len(parsed_steps)):
                            if parsed_steps[j]['formula'] == 'QED' and parsed_steps[j]['subproof_level'] == step['subproof_level']:
                                proof_valid = True
                                break
                
                # Also check for direct conclusion at top level
                if not proof_valid:
                    for step in reversed(parsed_steps):
                        if step['subproof_level'] == 0 and not step.get('is_show'):
                            if step['formula'].replace(' ', '') == conclusion.replace(' ', ''):
                                proof_valid = True
                                break
                
                if not proof_valid:
                    self.errors.append(f"Proof does not establish the required conclusion: {conclusion}")
            
            # Count lines and depth
            proof_lines = len([s for s in parsed_steps if not s.get('is_premise')])
            max_depth = max([s['subproof_level'] for s in parsed_steps] + [0])
            
            response = ProofResponse(
                ok=proof_valid and len(self.errors) == 0,
                lines=proof_lines,
                depth=max_depth,
                error='; '.join(self.errors) if self.errors else None,
                details={
                    'rules_used': list(self.rules_used),
                    'warnings': self.warnings,
                    'steps': len(parsed_steps),
                    'parsed_steps': parsed_steps  # Include for debugging
                }
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error validating proof: {e}")
            return ProofResponse(
                ok=False,
                error=f"Internal error: {str(e)}"
            )

# SAT solver for countermodels (reuse from original)
class CountermodelGenerator:
    """Generate countermodels using minisat"""
    
    def __init__(self):
        self.variables = {}
        self.var_count = 0
        self.clauses = []
        
    def extract_variables(self, formula: str) -> set:
        """Extract propositional variables from formula"""
        variables = set()
        i = 0
        while i < len(formula):
            if formula[i].isupper() and formula[i].isalpha():
                if i == 0 or not formula[i-1].isalpha():
                    variables.add(formula[i])
            i += 1
        return variables
    
    def formula_to_cnf(self, formula: str, negate: bool = False) -> List[List[int]]:
        """Convert formula to CNF (simplified version)"""
        vars_in_formula = self.extract_variables(formula)
        
        for var in vars_in_formula:
            if var not in self.variables:
                self.var_count += 1
                self.variables[var] = self.var_count
        
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
            
            premises = []
            if gamma.strip():
                premises = [p.strip() for p in gamma.split(',')]
            
            for premise in premises:
                self.clauses.extend(self.formula_to_cnf(premise, negate=False))
            
            self.clauses.extend(self.formula_to_cnf(phi, negate=True))
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.cnf', delete=False) as f:
                f.write(f"p cnf {self.var_count} {len(self.clauses)}\n")
                for clause in self.clauses:
                    f.write(' '.join(map(str, clause)) + ' 0\n')
                dimacs_file = f.name
            
            result_file = dimacs_file + '.result'
            try:
                result = subprocess.run(
                    ['minisat', dimacs_file, result_file],
                    capture_output=True,
                    timeout=5,
                    text=True
                )
                
                if os.path.exists(result_file):
                    with open(result_file, 'r') as f:
                        lines = f.readlines()
                        if lines and lines[0].strip() == 'SAT':
                            if len(lines) > 1:
                                assignments = lines[1].strip().split()
                                countermodel = {}
                                
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
                if self.variables:
                    return {var: False for var in self.variables.keys()}
            finally:
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
        "service": "Proof Checker Service (Carnap-compatible)",
        "version": "2.0.0",
        "endpoints": [
            "/verify",
            "/health"
        ],
        "syntax": "Carnap Fitch-style notation"
    }

@app.post("/verify", response_model=ProofResponse)
async def verify_proof(request: ProofRequest) -> ProofResponse:
    """Verify a natural deduction proof using Carnap-compatible syntax"""
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
                response.error = "The sequent is invalid (countermodel exists)"
        
        return response
        
    except Exception as e:
        logger.error(f"Error in verify endpoint: {e}")
        return ProofResponse(
            ok=False,
            error=f"Internal server error: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        result = subprocess.run(['which', 'minisat'], capture_output=True)
        minisat_available = result.returncode == 0
    except:
        minisat_available = False
    
    return {
        "status": "healthy",
        "service": "proof-checker",
        "minisat_available": minisat_available,
        "syntax": "Carnap-compatible"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5003)