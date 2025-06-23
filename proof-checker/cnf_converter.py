"""
Enhanced CNF Converter with Tseitin Transformation
Converts propositional logic formulas to Conjunctive Normal Form
"""

from typing import List, Dict, Set, Tuple, Optional, Union
from dataclasses import dataclass
from abc import ABC, abstractmethod
import re

# AST Node Types
@dataclass
class ASTNode(ABC):
    """Abstract base class for AST nodes"""
    @abstractmethod
    def accept(self, visitor):
        pass

@dataclass
class Variable(ASTNode):
    name: str
    
    def accept(self, visitor):
        return visitor.visit_variable(self)

@dataclass
class Negation(ASTNode):
    child: ASTNode
    
    def accept(self, visitor):
        return visitor.visit_negation(self)

@dataclass
class Conjunction(ASTNode):
    left: ASTNode
    right: ASTNode
    
    def accept(self, visitor):
        return visitor.visit_conjunction(self)

@dataclass
class Disjunction(ASTNode):
    left: ASTNode
    right: ASTNode
    
    def accept(self, visitor):
        return visitor.visit_disjunction(self)

@dataclass
class Implication(ASTNode):
    left: ASTNode
    right: ASTNode
    
    def accept(self, visitor):
        return visitor.visit_implication(self)

@dataclass
class Biconditional(ASTNode):
    left: ASTNode
    right: ASTNode
    
    def accept(self, visitor):
        return visitor.visit_biconditional(self)

@dataclass
class Constant(ASTNode):
    value: bool  # True for ⊤, False for ⊥
    
    def accept(self, visitor):
        return visitor.visit_constant(self)

class FormulaParser:
    """Parse propositional logic formulas into AST"""
    
    def __init__(self):
        self.pos = 0
        self.formula = ""
        
    def parse(self, formula: str) -> ASTNode:
        """Parse formula string into AST"""
        # Normalize symbols - do biconditional first to avoid conflicts
        formula = formula.replace('<->', '↔')
        formula = formula.replace('->', '→')
        formula = formula.replace('/\\', '∧').replace('&', '∧')
        formula = formula.replace('\\/', '∨').replace('|', '∨')
        formula = formula.replace('~', '¬').replace('-', '¬')
        formula = formula.replace('!?', '⊥').replace('_|_', '⊥')
        formula = formula.replace('T', '⊤').replace('true', '⊤')
        formula = formula.replace('F', '⊥').replace('false', '⊥')
        
        self.formula = formula.replace(' ', '')  # Remove spaces
        self.pos = 0
        
        return self.parse_biconditional()
    
    def current_char(self) -> str:
        if self.pos >= len(self.formula):
            return ''
        return self.formula[self.pos]
    
    def consume(self, expected: str = None):
        if expected and self.current_char() != expected:
            raise ValueError(f"Expected '{expected}' but got '{self.current_char()}'")
        if expected:
            self.pos += len(expected)
        else:
            self.pos += 1
    
    def parse_biconditional(self) -> ASTNode:
        """Parse biconditional (lowest precedence)"""
        left = self.parse_implication()
        
        # Check for biconditional at current position
        if self.pos < len(self.formula) and self.formula[self.pos] == '↔':
            self.consume('↔')
            right = self.parse_implication()
            return Biconditional(left, right)
        
        return left
    
    def parse_implication(self) -> ASTNode:
        """Parse implication"""
        left = self.parse_disjunction()
        
        while self.current_char() == '→':
            self.consume('→')
            right = self.parse_implication()  # Right associative
            left = Implication(left, right)
        
        return left
    
    def parse_disjunction(self) -> ASTNode:
        """Parse disjunction"""
        left = self.parse_conjunction()
        
        while self.current_char() == '∨':
            self.consume('∨')
            right = self.parse_conjunction()
            left = Disjunction(left, right)
        
        return left
    
    def parse_conjunction(self) -> ASTNode:
        """Parse conjunction"""
        left = self.parse_negation()
        
        while self.current_char() == '∧':
            self.consume('∧')
            right = self.parse_negation()
            left = Conjunction(left, right)
        
        return left
    
    def parse_negation(self) -> ASTNode:
        """Parse negation"""
        if self.current_char() == '¬':
            self.consume('¬')
            child = self.parse_negation()  # Allow multiple negations
            return Negation(child)
        
        return self.parse_atomic()
    
    def parse_atomic(self) -> ASTNode:
        """Parse atomic formula (variable, constant, or parenthesized)"""
        char = self.current_char()
        
        if char == '(':
            self.consume('(')
            node = self.parse_biconditional()
            self.consume(')')
            return node
        
        elif char == '⊤':
            self.consume('⊤')
            return Constant(True)
        
        elif char == '⊥':
            self.consume('⊥')
            return Constant(False)
        
        elif char.isupper() and char.isalpha():
            # Variable
            self.consume()
            return Variable(char)
        
        else:
            raise ValueError(f"Unexpected character: '{char}'")

class TseitinTransformer:
    """Convert AST to CNF using Tseitin transformation"""
    
    def __init__(self):
        self.clauses = []
        self.var_map = {}
        self.next_var = 1
        self.subformula_vars = {}
        
    def get_var(self, name: str) -> int:
        """Get or create variable number"""
        if name not in self.var_map:
            self.var_map[name] = self.next_var
            self.next_var += 1
        return self.var_map[name]
    
    def fresh_var(self) -> int:
        """Create a fresh variable"""
        var = self.next_var
        self.next_var += 1
        return var
    
    def transform(self, ast: ASTNode) -> Tuple[List[List[int]], int]:
        """Transform AST to CNF, return clauses and top-level variable"""
        top_var = self.visit(ast)
        # Assert the top-level formula is true
        self.clauses.append([top_var])
        return self.clauses, self.next_var - 1
    
    def visit(self, node: ASTNode) -> int:
        """Visit node and return its associated variable"""
        # Check if we've already processed this subformula
        node_id = id(node)
        if node_id in self.subformula_vars:
            return self.subformula_vars[node_id]
        
        var = node.accept(self)
        self.subformula_vars[node_id] = var
        return var
    
    def visit_variable(self, node: Variable) -> int:
        return self.get_var(node.name)
    
    def visit_constant(self, node: Constant) -> int:
        var = self.fresh_var()
        if node.value:
            # True constant
            self.clauses.append([var])
        else:
            # False constant
            self.clauses.append([-var])
        return var
    
    def visit_negation(self, node: Negation) -> int:
        child_var = self.visit(node.child)
        result_var = self.fresh_var()
        
        # result_var ↔ ¬child_var
        # CNF: (¬result_var ∨ ¬child_var) ∧ (result_var ∨ child_var)
        self.clauses.append([-result_var, -child_var])
        self.clauses.append([result_var, child_var])
        
        return result_var
    
    def visit_conjunction(self, node: Conjunction) -> int:
        left_var = self.visit(node.left)
        right_var = self.visit(node.right)
        result_var = self.fresh_var()
        
        # result_var ↔ (left_var ∧ right_var)
        # CNF: (¬result_var ∨ left_var) ∧ (¬result_var ∨ right_var) ∧ (result_var ∨ ¬left_var ∨ ¬right_var)
        self.clauses.append([-result_var, left_var])
        self.clauses.append([-result_var, right_var])
        self.clauses.append([result_var, -left_var, -right_var])
        
        return result_var
    
    def visit_disjunction(self, node: Disjunction) -> int:
        left_var = self.visit(node.left)
        right_var = self.visit(node.right)
        result_var = self.fresh_var()
        
        # result_var ↔ (left_var ∨ right_var)
        # CNF: (¬result_var ∨ left_var ∨ right_var) ∧ (result_var ∨ ¬left_var) ∧ (result_var ∨ ¬right_var)
        self.clauses.append([-result_var, left_var, right_var])
        self.clauses.append([result_var, -left_var])
        self.clauses.append([result_var, -right_var])
        
        return result_var
    
    def visit_implication(self, node: Implication) -> int:
        left_var = self.visit(node.left)
        right_var = self.visit(node.right)
        result_var = self.fresh_var()
        
        # result_var ↔ (left_var → right_var)
        # result_var ↔ (¬left_var ∨ right_var)
        # CNF: (¬result_var ∨ ¬left_var ∨ right_var) ∧ (result_var ∨ left_var) ∧ (result_var ∨ ¬right_var)
        self.clauses.append([-result_var, -left_var, right_var])
        self.clauses.append([result_var, left_var])
        self.clauses.append([result_var, -right_var])
        
        return result_var
    
    def visit_biconditional(self, node: Biconditional) -> int:
        left_var = self.visit(node.left)
        right_var = self.visit(node.right)
        result_var = self.fresh_var()
        
        # result_var ↔ (left_var ↔ right_var)
        # result_var ↔ ((left_var → right_var) ∧ (right_var → left_var))
        # result_var ↔ ((¬left_var ∨ right_var) ∧ (¬right_var ∨ left_var))
        # CNF: Four clauses
        self.clauses.append([-result_var, -left_var, right_var])
        self.clauses.append([-result_var, left_var, -right_var])
        self.clauses.append([result_var, -left_var, -right_var])
        self.clauses.append([result_var, left_var, right_var])
        
        return result_var

class CNFConverter:
    """Main interface for CNF conversion"""
    
    def __init__(self):
        self.parser = FormulaParser()
        
    def convert_to_cnf(self, formula: str) -> Tuple[List[List[int]], Dict[str, int], int]:
        """
        Convert formula to CNF
        Returns: (clauses, variable_map, num_variables)
        """
        try:
            # Parse formula
            ast = self.parser.parse(formula)
            
            # Transform to CNF
            transformer = TseitinTransformer()
            clauses, num_vars = transformer.transform(ast)
            
            return clauses, transformer.var_map, num_vars
            
        except Exception as e:
            # Fallback to simple conversion for edge cases
            return self._simple_cnf(formula)
    
    def _simple_cnf(self, formula: str) -> Tuple[List[List[int]], Dict[str, int], int]:
        """Simple fallback CNF conversion"""
        var_map = {}
        var_count = 0
        
        # Extract variables
        for char in formula:
            if char.isupper() and char.isalpha() and char not in var_map:
                var_count += 1
                var_map[char] = var_count
        
        # Create a simple clause
        if var_map:
            clauses = [[var_map[v] for v in var_map]]
        else:
            clauses = []
            
        return clauses, var_map, var_count
    
    def convert_formula_set(self, formulas: List[str], negate_last: bool = False) -> Tuple[List[List[int]], Dict[str, int], int]:
        """
        Convert a set of formulas to CNF
        If negate_last is True, the last formula is negated (for countermodel generation)
        """
        all_clauses = []
        combined_var_map = {}
        max_var = 0
        
        for i, formula in enumerate(formulas):
            if not formula.strip():
                continue
                
            # Parse and transform
            parser = FormulaParser()
            ast = parser.parse(formula)
            
            # Negate last formula if requested
            if negate_last and i == len(formulas) - 1:
                ast = Negation(ast)
            
            # Transform with shared variable mapping
            transformer = TseitinTransformer()
            transformer.var_map = combined_var_map.copy()
            transformer.next_var = max_var + 1
            
            clauses, num_vars = transformer.transform(ast)
            
            all_clauses.extend(clauses)
            combined_var_map.update(transformer.var_map)
            max_var = num_vars
        
        return all_clauses, combined_var_map, max_var