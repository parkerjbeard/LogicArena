"""
Contextual Hint Analyzer for LogicArena Practice Mode

This module analyzes the current proof state and generates contextually relevant hints
to help users complete their proofs. It understands Carnap-compatible Fitch notation
and can suggest strategic, tactical, and corrective hints.
"""

import re
from typing import List, Dict, Optional, Tuple, Set, Any
from dataclasses import dataclass
from enum import Enum

class HintType(Enum):
    STRATEGIC = "strategic"      # High-level proof strategy
    TACTICAL = "tactical"        # Specific rule applications
    CORRECTIVE = "corrective"    # Fix errors or issues
    PREMISE = "premise"          # Missing premises
    PROGRESS = "progress"        # Encourage/show progress

@dataclass
class ContextualHint:
    """A contextual hint with priority and targeting information"""
    type: HintType
    content: str
    priority: int  # 1-10, higher = more important
    target_line: Optional[int] = None
    suggested_rule: Optional[str] = None
    confidence: float = 1.0  # 0-1, how confident we are this hint is useful

class ProofAnalyzer:
    """Analyzes proof state to understand current context and generate hints"""
    
    # Inference rules mapping (same as proof checker)
    INFERENCE_RULES = {
        "PR": "Premise", "AS": "Assumption", "R": "Reiteration", "REIT": "Reiteration",
        "MP": "Modus Ponens", "MT": "Modus Tollens", "DN": "Double Negation",
        "DNE": "Double Negation Elimination", "DNI": "Double Negation Introduction",
        "&I": "Conjunction Introduction", "&E": "Conjunction Elimination",
        "/\\I": "Conjunction Introduction", "/\\E": "Conjunction Elimination",
        "∧I": "Conjunction Introduction", "∧E": "Conjunction Elimination",
        "|I": "Disjunction Introduction", "|E": "Disjunction Elimination",
        "\\/I": "Disjunction Introduction", "\\/E": "Disjunction Elimination",
        "∨I": "Disjunction Introduction", "∨E": "Disjunction Elimination",
        "ADD": "Addition", "MTP": "Modus Tollendo Ponens",
        "->I": "Conditional Introduction", "->E": "Conditional Elimination",
        "→I": "Conditional Introduction", "→E": "Conditional Elimination",
        "CP": "Conditional Proof", "<->I": "Biconditional Introduction",
        "<->E": "Biconditional Elimination", "↔I": "Biconditional Introduction",
        "↔E": "Biconditional Elimination", "BC": "Biconditional", "CB": "Biconditional",
        "~I": "Negation Introduction", "~E": "Negation Elimination",
        "-I": "Negation Introduction", "-E": "Negation Elimination",
        "¬I": "Negation Introduction", "¬E": "Negation Elimination",
        "!?I": "Contradiction Introduction", "!?E": "Contradiction Elimination",
        "_|_I": "Contradiction Introduction", "_|_E": "Contradiction Elimination",
        "⊥I": "Contradiction Introduction", "⊥E": "Contradiction Elimination",
        "ID": "Indirect Derivation", "IP": "Indirect Proof", "RAA": "Reductio Ad Absurdum",
        "DD": "Direct Derivation", "CD": "Conditional Derivation"
    }
    
    def __init__(self):
        self.reset()
    
    def reset(self):
        """Reset analyzer state"""
        self.premises = []
        self.conclusion = ""
        self.parsed_proof = []
        self.accessible_lines = set()
        self.line_formulas = {}
        self.show_lines = {}
        self.errors = []
        self.subproof_stack = []
        
    def normalize_formula(self, formula: str) -> str:
        """Normalize formula for comparison (same as proof checker)"""
        formula = formula.replace('!?', '⊥').replace('_|_', '⊥')
        formula = formula.replace('<->', '↔').replace('->', '→')
        formula = formula.replace('/\\', '∧').replace('&', '∧')
        formula = formula.replace('\\/', '∨').replace('|', '∨')
        formula = formula.replace('~', '¬')
        formula = re.sub(r'(?<!\d)-(?!\d)', '¬', formula)
        formula = formula.replace('true', '⊤').replace('T', '⊤')
        formula = formula.replace('false', '⊥').replace('F', '⊥')
        return ' '.join(formula.split())
    
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
        """Measure indentation level"""
        return len(line) - len(line.lstrip())
    
    def parse_justification(self, justification: str) -> Tuple[str, List[int]]:
        """Parse justification into rule and cited lines"""
        parts = justification.split()
        if not parts:
            return '', []
        
        rule = parts[0].upper()
        cited_lines = []
        
        if len(parts) > 1:
            citations = ' '.join(parts[1:])
            for citation in citations.split(','):
                citation = citation.strip()
                if '-' in citation and citation.count('-') == 1:
                    try:
                        start, end = map(int, citation.split('-'))
                        cited_lines.extend(range(start, end + 1))
                    except ValueError:
                        pass
                else:
                    try:
                        cited_lines.append(int(citation))
                    except ValueError:
                        pass
        
        return rule, cited_lines
    
    def parse_current_proof(self, proof_text: str) -> List[Dict[str, Any]]:
        """Parse current proof state (simplified version of proof checker logic)"""
        lines = proof_text.split('\n')
        parsed_steps = []
        line_num = 0
        indent_stack = [0]
        
        self.accessible_lines = set()
        self.line_formulas = {}
        self.show_lines = {}
        self.subproof_stack = []
        
        for line in lines:
            if not line.strip() or line.strip() in ['--', '---']:
                continue
                
            current_indent = self.measure_indentation(line)
            stripped_line = line.strip()
            line_num += 1
            
            # Handle indentation changes (simplified)
            while len(indent_stack) > 1 and indent_stack[-1] > current_indent:
                indent_stack.pop()
                if self.subproof_stack:
                    self.subproof_stack.pop()
            
            if current_indent > indent_stack[-1]:
                indent_stack.append(current_indent)
                self.subproof_stack.append({'start': line_num, 'assumptions': []})
            
            subproof_level = len(indent_stack) - 1
            
            # Parse show lines
            if stripped_line.lower().startswith('show'):
                formula = self.normalize_formula(stripped_line[4:].strip())
                self.show_lines[line_num] = formula
                parsed_steps.append({
                    'line_number': line_num,
                    'formula': formula,
                    'justification': 'show',
                    'rule': 'show',
                    'cited_lines': [],
                    'subproof_level': subproof_level,
                    'is_show': True,
                    'is_qed': False
                })
                continue
            
            # Parse QED lines
            if stripped_line.startswith(':'):
                formula = "QED"
                justification = stripped_line[1:].strip()
                is_qed = True
            else:
                # Regular line
                match = re.match(r'^(.+?)\s*:\s*(.+)$', stripped_line)
                if match:
                    formula = self.normalize_formula(match.group(1).strip())
                    justification = match.group(2).strip()
                    is_qed = False
                else:
                    # Line without justification - potential issue
                    self.errors.append(f"Line {line_num}: Missing justification")
                    continue
            
            if not is_qed:
                self.line_formulas[line_num] = formula
                self.accessible_lines.add(line_num)
            
            rule, cited_lines = self.parse_justification(justification)
            
            parsed_steps.append({
                'line_number': line_num,
                'formula': formula,
                'justification': justification,
                'rule': rule,
                'cited_lines': cited_lines,
                'subproof_level': subproof_level,
                'is_show': False,
                'is_qed': is_qed
            })
        
        return parsed_steps

class ContextualHintGenerator:
    """Generates contextual hints based on proof analysis"""
    
    def __init__(self):
        self.analyzer = ProofAnalyzer()
    
    def analyze_and_generate_hints(self, gamma: str, phi: str, current_proof: str, 
                                   difficulty: int = 5) -> List[ContextualHint]:
        """Main method to analyze proof state and generate contextual hints"""
        self.analyzer.reset()
        
        # Parse inputs
        premises = self.analyzer.parse_premises(gamma)
        conclusion = self.analyzer.normalize_formula(phi)
        proof_steps = self.analyzer.parse_current_proof(current_proof)
        
        # Store context
        self.analyzer.premises = premises
        self.analyzer.conclusion = conclusion
        self.analyzer.parsed_proof = proof_steps
        
        hints = []
        
        # Generate different types of hints
        hints.extend(self._generate_premise_hints())
        hints.extend(self._generate_strategic_hints(difficulty))
        hints.extend(self._generate_tactical_hints())
        hints.extend(self._generate_corrective_hints())
        hints.extend(self._generate_progress_hints())
        
        # Sort by priority and return top hints
        hints.sort(key=lambda h: h.priority, reverse=True)
        return hints[:6]  # Return top 6 hints
    
    def _generate_premise_hints(self) -> List[ContextualHint]:
        """Generate hints about missing or incorrect premises"""
        hints = []
        
        # Check if all premises are included
        used_premises = set()
        for step in self.analyzer.parsed_proof:
            if step['rule'] == 'PR':
                used_premises.add(step['formula'])
        
        premise_set = set(self.analyzer.premises)
        missing_premises = premise_set - used_premises
        
        if missing_premises and len(self.analyzer.parsed_proof) > 0:
            missing_list = list(missing_premises)
            if len(missing_list) == 1:
                hints.append(ContextualHint(
                    type=HintType.PREMISE,
                    content=f"You're missing a premise: {missing_list[0]}. Add it with ':PR' justification.",
                    priority=9,
                    confidence=0.95
                ))
            else:
                hints.append(ContextualHint(
                    type=HintType.PREMISE,
                    content=f"You're missing {len(missing_list)} premises. Make sure to include all given premises using ':PR'.",
                    priority=8,
                    confidence=0.9
                ))
        elif len(self.analyzer.parsed_proof) == 0 and premise_set:
            hints.append(ContextualHint(
                type=HintType.PREMISE,
                content="Start by adding your premises. Each premise should be on a separate line with ':PR' justification.",
                priority=10,
                confidence=1.0
            ))
        
        return hints
    
    def _generate_strategic_hints(self, difficulty: int) -> List[ContextualHint]:
        """Generate high-level strategic hints"""
        hints = []
        conclusion = self.analyzer.conclusion
        
        # Check if we have a proof attempt
        if len(self.analyzer.parsed_proof) == 0:
            hints.append(ContextualHint(
                type=HintType.STRATEGIC,
                content="Start your proof by writing out all the premises first, then work towards the conclusion.",
                priority=10,
                confidence=1.0
            ))
            return hints
        
        # Analyze conclusion structure for strategic advice
        if '→' in conclusion:
            # Conditional conclusion - suggest conditional proof
            if not any(step.get('is_show') for step in self.analyzer.parsed_proof):
                hints.append(ContextualHint(
                    type=HintType.STRATEGIC,
                    content="Since you need to prove a conditional, consider using conditional proof: 'Show [conclusion]' followed by assuming the antecedent.",
                    priority=8,
                    confidence=0.85
                ))
        
        elif '∧' in conclusion:
            # Conjunction conclusion - need both parts
            parts = conclusion.split('∧', 1)
            if len(parts) == 2:
                left = self.analyzer.normalize_formula(parts[0].strip())
                right = self.analyzer.normalize_formula(parts[1].strip())
                
                # Check if we have both parts
                available_formulas = set(self.analyzer.line_formulas.values())
                has_left = left in available_formulas
                has_right = right in available_formulas
                
                if not has_left and not has_right:
                    hints.append(ContextualHint(
                        type=HintType.STRATEGIC,
                        content=f"To prove a conjunction, you need to derive both parts: '{left}' and '{right}', then combine them with Conjunction Introduction.",
                        priority=7,
                        confidence=0.8
                    ))
                elif has_left and not has_right:
                    hints.append(ContextualHint(
                        type=HintType.TACTICAL,
                        content=f"You have the first part of the conjunction. Now derive '{right}' and use Conjunction Introduction.",
                        priority=8,
                        confidence=0.9
                    ))
                elif not has_left and has_right:
                    hints.append(ContextualHint(
                        type=HintType.TACTICAL,
                        content=f"You have the second part of the conjunction. Now derive '{left}' and use Conjunction Introduction.",
                        priority=8,
                        confidence=0.9
                    ))
        
        # Check for indirect proof opportunities
        if '¬' in conclusion and difficulty >= 4:
            hints.append(ContextualHint(
                type=HintType.STRATEGIC,
                content="For proving a negation, consider using indirect proof: assume the opposite and derive a contradiction.",
                priority=6,
                confidence=0.7
            ))
        
        return hints
    
    def _generate_tactical_hints(self) -> List[ContextualHint]:
        """Generate specific tactical hints about rule applications"""
        hints = []
        
        # Analyze available formulas for applicable rules
        available_formulas = list(self.analyzer.line_formulas.values())
        line_numbers = list(self.analyzer.line_formulas.keys())
        
        # Look for Modus Ponens opportunities
        for i, formula1 in enumerate(available_formulas):
            if '→' in formula1:
                parts = formula1.split('→', 1)
                if len(parts) == 2:
                    antecedent = self.analyzer.normalize_formula(parts[0].strip())
                    consequent = self.analyzer.normalize_formula(parts[1].strip())
                    
                    # Check if we have the antecedent
                    for j, formula2 in enumerate(available_formulas):
                        if i != j and self.analyzer.normalize_formula(formula2) == antecedent:
                            line1 = line_numbers[i]
                            line2 = line_numbers[j]
                            hints.append(ContextualHint(
                                type=HintType.TACTICAL,
                                content=f"You can apply Modus Ponens to lines {line1} and {line2} to get '{consequent}'.",
                                priority=9,
                                target_line=max(line1, line2) + 1,
                                suggested_rule="MP",
                                confidence=0.95
                            ))
        
        # Look for Conjunction Elimination opportunities
        for i, formula in enumerate(available_formulas):
            if '∧' in formula:
                parts = formula.split('∧', 1)
                if len(parts) == 2:
                    left = self.analyzer.normalize_formula(parts[0].strip())
                    right = self.analyzer.normalize_formula(parts[1].strip())
                    line_num = line_numbers[i]
                    
                    # Check if we need either part for our conclusion
                    if (left == self.analyzer.conclusion or 
                        right == self.analyzer.conclusion or
                        left in self.analyzer.conclusion or 
                        right in self.analyzer.conclusion):
                        hints.append(ContextualHint(
                            type=HintType.TACTICAL,
                            content=f"Line {line_num} is a conjunction. You can extract '{left}' or '{right}' using Conjunction Elimination (&E).",
                            priority=8,
                            target_line=line_num,
                            suggested_rule="&E",
                            confidence=0.85
                        ))
        
        # Look for Addition opportunities (for disjunctions in conclusion)
        if '∨' in self.analyzer.conclusion:
            parts = self.analyzer.conclusion.split('∨', 1)
            if len(parts) == 2:
                left = self.analyzer.normalize_formula(parts[0].strip())
                right = self.analyzer.normalize_formula(parts[1].strip())
                
                for i, formula in enumerate(available_formulas):
                    if formula == left or formula == right:
                        line_num = line_numbers[i]
                        hints.append(ContextualHint(
                            type=HintType.TACTICAL,
                            content=f"You have '{formula}' on line {line_num}. You can use Addition to create the disjunction needed for your conclusion.",
                            priority=7,
                            target_line=line_num,
                            suggested_rule="ADD",
                            confidence=0.8
                        ))
        
        return hints
    
    def _generate_corrective_hints(self) -> List[ContextualHint]:
        """Generate hints to fix errors or issues in the proof"""
        hints = []
        
        # Check for common errors based on analyzer errors
        for error in self.analyzer.errors:
            if "Missing justification" in error:
                hints.append(ContextualHint(
                    type=HintType.CORRECTIVE,
                    content="Some lines are missing justifications. Each line should have the format 'formula :rule'.",
                    priority=9,
                    confidence=0.95
                ))
        
        # Check for inaccessible line references
        for step in self.analyzer.parsed_proof:
            for cited_line in step['cited_lines']:
                if cited_line not in self.analyzer.accessible_lines:
                    hints.append(ContextualHint(
                        type=HintType.CORRECTIVE,
                        content=f"Line {step['line_number']} references line {cited_line} which may not be accessible in this context.",
                        priority=8,
                        target_line=step['line_number'],
                        confidence=0.9
                    ))
        
        return hints
    
    def _generate_progress_hints(self) -> List[ContextualHint]:
        """Generate encouraging hints about progress made"""
        hints = []
        
        if len(self.analyzer.parsed_proof) > 0:
            # Count meaningful steps (not just premises)
            meaningful_steps = len([s for s in self.analyzer.parsed_proof 
                                   if s['rule'] not in ['PR', 'show']])
            
            if meaningful_steps > 2:
                hints.append(ContextualHint(
                    type=HintType.PROGRESS,
                    content=f"Good progress! You've made {meaningful_steps} inference steps. Keep working towards the conclusion: {self.analyzer.conclusion}",
                    priority=3,
                    confidence=0.8
                ))
            
            # Check if we're close to the conclusion
            available_formulas = set(self.analyzer.line_formulas.values())
            if self.analyzer.conclusion in available_formulas:
                hints.append(ContextualHint(
                    type=HintType.PROGRESS,
                    content="Excellent! You've derived the conclusion. Make sure your proof is complete and properly structured.",
                    priority=10,
                    confidence=1.0
                ))
        
        return hints

# Main interface function for the API
def generate_contextual_hints(gamma: str, phi: str, current_proof: str, 
                             difficulty: int = 5) -> List[Dict[str, Any]]:
    """
    Generate contextual hints for a proof in progress.
    
    Args:
        gamma: Comma-separated premises
        phi: Conclusion to prove
        current_proof: User's current proof text
        difficulty: Puzzle difficulty (1-10)
    
    Returns:
        List of hint dictionaries with type, content, priority, etc.
    """
    generator = ContextualHintGenerator()
    hints = generator.analyze_and_generate_hints(gamma, phi, current_proof, difficulty)
    
    return [
        {
            'type': hint.type.value,
            'content': hint.content,
            'priority': hint.priority,
            'target_line': hint.target_line,
            'suggested_rule': hint.suggested_rule,
            'confidence': hint.confidence
        }
        for hint in hints
    ]