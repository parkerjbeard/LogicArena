"""
Quantifier logic rules implementation for the proof checker.
Implements ∀I, ∀E, ∃I, ∃E with proper variable handling.
"""

import re
from typing import List, Dict, Set, Optional, Tuple
from dataclasses import dataclass

@dataclass
class Term:
    """Represents a term in first-order logic"""
    name: str
    is_variable: bool = False
    is_constant: bool = False
    
@dataclass
class QuantifiedFormula:
    """Represents a quantified formula"""
    quantifier: str  # '∀' or '∃'
    variable: str
    formula: str
    
class QuantifierHandler:
    """Handles quantifier logic rules and variable substitution"""
    
    def __init__(self):
        self.fresh_var_counter = 0
        
    def parse_quantified_formula(self, formula: str) -> Optional[QuantifiedFormula]:
        """Parse a quantified formula like ∀x.P(x) or ∃y.Q(y,z)"""
        # Normalize quantifier symbols
        formula = formula.replace('forall', '∀').replace('exists', '∃')
        formula = formula.replace('\\forall', '∀').replace('\\exists', '∃')
        # Only replace A/E if they appear as quantifier prefix
        import re
        formula = re.sub(r'^A([a-z])', r'∀\1', formula)
        formula = re.sub(r'^E([a-z])', r'∃\1', formula)
        
        # Match quantified formulas
        patterns = [
            r'^([∀∃])([a-z])\s*[.:]?\s*(.+)$',  # ∀x.P(x) or ∀x:P(x) or ∀x P(x)
            r'^([∀∃])\(([a-z])\)\s*[.:]?\s*(.+)$',  # ∀(x).P(x)
        ]
        
        for pattern in patterns:
            match = re.match(pattern, formula.strip())
            if match:
                quantifier = match.group(1)
                variable = match.group(2)
                inner_formula = match.group(3)
                return QuantifiedFormula(quantifier, variable, inner_formula)
        
        return None
    
    def extract_free_variables(self, formula: str) -> Set[str]:
        """Extract free variables from a formula"""
        # Simple heuristic: lowercase letters that appear as arguments
        # This is a simplified version - a full implementation would need an AST
        free_vars = set()
        
        # Remove quantified variables
        quant_formula = self.parse_quantified_formula(formula)
        if quant_formula:
            formula = quant_formula.formula
            # Don't include the bound variable
            bound_var = quant_formula.variable
        else:
            bound_var = None
            
        # Find variables in predicate arguments
        # Match patterns like P(x), Q(x,y), R(a,b,c)
        pred_pattern = r'[A-Z]\w*\(([^)]+)\)'
        matches = re.findall(pred_pattern, formula)
        
        for match in matches:
            args = [arg.strip() for arg in match.split(',')]
            for arg in args:
                # Variable if lowercase single letter
                if len(arg) == 1 and arg.islower() and arg != bound_var:
                    free_vars.add(arg)
                    
        return free_vars
    
    def substitute(self, formula: str, var: str, term: str) -> str:
        """Substitute term for variable in formula (avoiding capture)"""
        # This is a simplified substitution - proper implementation needs AST
        
        # Check if substitution would cause variable capture
        if self.would_capture(formula, var, term):
            # Need to rename bound variables first
            formula = self.rename_bound_variables(formula, var, term)
        
        # Perform substitution in predicate arguments
        def replace_in_args(match):
            pred_name = match.group(1)
            args = match.group(2).split(',')
            new_args = []
            for arg in args:
                arg = arg.strip()
                if arg == var:
                    new_args.append(term)
                else:
                    new_args.append(arg)
            return f"{pred_name}({','.join(new_args)})"
        
        # Replace in predicates
        formula = re.sub(r'([A-Z]\w*)\(([^)]+)\)', replace_in_args, formula)
        
        # Replace in atomic formulas (single variable predicates)
        if var in formula and var.isalpha() and len(var) == 1:
            # Be careful to replace only whole variables, not parts of words
            formula = re.sub(r'\b' + var + r'\b', term, formula)
            
        return formula
    
    def would_capture(self, formula: str, var: str, term: str) -> bool:
        """Check if substitution would cause variable capture"""
        # If term is just a single letter, check if it would be captured
        if len(term) == 1 and term.islower():
            # Check if this variable is bound in the formula
            quant_formula = self.parse_quantified_formula(formula)
            if quant_formula and quant_formula.variable == term:
                return True
                
            # Check for nested quantifiers
            if f'∀{term}' in formula or f'∃{term}' in formula:
                return True
        else:
            # For complex terms, extract variables
            term_vars = self.extract_free_variables(term)
            if not term_vars:
                return False
                
            # Check if any term variable would be captured
            for term_var in term_vars:
                quant_formula = self.parse_quantified_formula(formula)
                if quant_formula and quant_formula.variable == term_var:
                    return True
                if f'∀{term_var}' in formula or f'∃{term_var}' in formula:
                    return True
                
        return False
    
    def rename_bound_variables(self, formula: str, avoid_var: str, avoid_term: str) -> str:
        """Rename bound variables to avoid capture"""
        # Generate a fresh variable
        fresh_var = self.get_fresh_variable()
        
        quant_formula = self.parse_quantified_formula(formula)
        if quant_formula:
            old_var = quant_formula.variable
            if old_var in self.extract_free_variables(avoid_term):
                # Rename the bound variable
                new_inner = self.substitute(quant_formula.formula, old_var, fresh_var)
                return f"{quant_formula.quantifier}{fresh_var}.{new_inner}"
                
        return formula
    
    def get_fresh_variable(self) -> str:
        """Generate a fresh variable name"""
        self.fresh_var_counter += 1
        # Use later alphabet letters for fresh variables
        return chr(ord('u') + (self.fresh_var_counter % 6))  # u, v, w, x, y, z
    
    def is_arbitrary_constant(self, term: str, context: List[str]) -> bool:
        """Check if a term is an arbitrary constant (for ∀I)"""
        # A constant is arbitrary if it doesn't appear in any previous line
        # or in any assumption that the current subproof depends on
        for line in context:
            if term in line:
                return False
        return True
    
    def validate_universal_intro(self, premise: str, conclusion: str, 
                                arbitrary_const: str, context: List[str]) -> Tuple[bool, str]:
        """Validate Universal Introduction (∀I)
        From P(a) where 'a' is arbitrary, infer ∀x.P(x)"""
        
        # Parse the conclusion
        quant_formula = self.parse_quantified_formula(conclusion)
        if not quant_formula or quant_formula.quantifier != '∀':
            return False, "∀I requires conclusion to be universally quantified"
        
        # Check if we can derive the inner formula from the premise
        # by substituting the arbitrary constant
        expected_premise = self.substitute(quant_formula.formula, 
                                         quant_formula.variable, 
                                         arbitrary_const)
        
        if self.normalize_formula(premise) != self.normalize_formula(expected_premise):
            return False, f"∀I requires premise {expected_premise} to conclude {conclusion}"
        
        # Check that the constant is truly arbitrary
        if not self.is_arbitrary_constant(arbitrary_const, context):
            return False, f"Constant '{arbitrary_const}' is not arbitrary (appears in context)"
        
        return True, ""
    
    def validate_universal_elim(self, premise: str, conclusion: str, term: str) -> Tuple[bool, str]:
        """Validate Universal Elimination (∀E)
        From ∀x.P(x), infer P(t) for any term t"""
        
        # Parse the premise
        quant_formula = self.parse_quantified_formula(premise)
        if not quant_formula or quant_formula.quantifier != '∀':
            return False, "∀E requires premise to be universally quantified"
        
        # Check if conclusion matches substitution
        expected_conclusion = self.substitute(quant_formula.formula,
                                            quant_formula.variable,
                                            term)
        
        if self.normalize_formula(conclusion) != self.normalize_formula(expected_conclusion):
            return False, f"∀E should yield {expected_conclusion} not {conclusion}"
        
        return True, ""
    
    def validate_existential_intro(self, premise: str, conclusion: str) -> Tuple[bool, str]:
        """Validate Existential Introduction (∃I)
        From P(t), infer ∃x.P(x)"""
        
        # Parse the conclusion
        quant_formula = self.parse_quantified_formula(conclusion)
        if not quant_formula or quant_formula.quantifier != '∃':
            return False, "∃I requires conclusion to be existentially quantified"
        
        # Find what term in the premise corresponds to the quantified variable
        # This is simplified - proper implementation needs unification
        inner_formula = quant_formula.formula
        variable = quant_formula.variable
        
        # Try to find a term that when substituted gives us the premise
        # Check common terms: a, b, c, ..., and any free variables in premise
        possible_terms = list('abcdefgh') + list(self.extract_free_variables(premise))
        
        for term in possible_terms:
            candidate = self.substitute(inner_formula, variable, term)
            if self.normalize_formula(candidate) == self.normalize_formula(premise):
                return True, ""
        
        return False, f"∃I cannot derive {conclusion} from {premise}"
    
    def validate_existential_elim(self, exist_premise: str, subproof_assumption: str,
                                 subproof_conclusion: str, final_conclusion: str,
                                 fresh_const: str) -> Tuple[bool, str]:
        """Validate Existential Elimination (∃E)
        From ∃x.P(x) and a subproof P(a) ⊢ Q where 'a' is fresh, infer Q"""
        
        # Parse the existential premise
        quant_formula = self.parse_quantified_formula(exist_premise)
        if not quant_formula or quant_formula.quantifier != '∃':
            return False, "∃E requires an existentially quantified premise"
        
        # Check the subproof assumption matches P(a)
        expected_assumption = self.substitute(quant_formula.formula,
                                            quant_formula.variable,
                                            fresh_const)
        
        if self.normalize_formula(subproof_assumption) != self.normalize_formula(expected_assumption):
            return False, f"∃E subproof should assume {expected_assumption}"
        
        # Check the final conclusion matches the subproof conclusion
        if self.normalize_formula(final_conclusion) != self.normalize_formula(subproof_conclusion):
            return False, "∃E conclusion must match subproof conclusion"
        
        # Check that fresh_const doesn't appear in the conclusion
        if fresh_const in final_conclusion:
            return False, f"Fresh constant '{fresh_const}' cannot appear in conclusion"
        
        return True, ""
    
    def normalize_formula(self, formula: str) -> str:
        """Normalize formula for comparison"""
        # Remove extra spaces and normalize symbols
        formula = ' '.join(formula.split())
        formula = formula.replace('->', '→').replace('<->', '↔')
        formula = formula.replace('/\\', '∧').replace('&', '∧')
        formula = formula.replace('\\/', '∨').replace('|', '∨')
        formula = formula.replace('~', '¬').replace('-', '¬')
        formula = formula.replace('forall', '∀').replace('exists', '∃')
        return formula