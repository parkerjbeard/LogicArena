"""
Advanced puzzle generation for LogicArena using template-based patterns
"""

import random
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

class ProofPattern(Enum):
    MODUS_PONENS = "modus_ponens"
    MODUS_TOLLENS = "modus_tollens"
    CONDITIONAL_CHAIN = "conditional_chain"
    CONJUNCTION_INTRO = "conjunction_intro"
    CONJUNCTION_ELIM = "conjunction_elim"
    DISJUNCTION_INTRO = "disjunction_intro"
    DISJUNCTION_ELIM = "disjunction_elim"
    CONDITIONAL_PROOF = "conditional_proof"
    REDUCTIO = "reductio"
    DEMORGAN = "demorgan"
    DOUBLE_NEGATION = "double_negation"
    BICONDITIONAL = "biconditional"

@dataclass
class Puzzle:
    premises: List[str]
    conclusion: str
    difficulty: int
    pattern: ProofPattern
    optimal_length: int
    hint: str = ""
    machine_proof: str = ""

class PuzzleGenerator:
    def __init__(self):
        self.variables = ['P', 'Q', 'R', 'S', 'T']
        self.templates = self._initialize_templates()
    
    def _initialize_templates(self) -> Dict[ProofPattern, List[Dict]]:
        """Initialize puzzle templates for each pattern"""
        return {
            ProofPattern.MODUS_PONENS: [
                {
                    'template': lambda vars: (
                        [f"{vars[0]}→{vars[1]}", vars[0]], 
                        vars[1],
                        f"{vars[1]}    :MP 1,2",
                        1,
                        "Apply modus ponens to the conditional and its antecedent"
                    ),
                    'min_vars': 2
                },
                {
                    'template': lambda vars: (
                        [f"({vars[0]}∧{vars[1]})→{vars[2]}", f"{vars[0]}∧{vars[1]}"],
                        vars[2],
                        f"{vars[2]}    :MP 1,2",
                        1,
                        "Apply modus ponens with a complex antecedent"
                    ),
                    'min_vars': 3
                }
            ],
            
            ProofPattern.MODUS_TOLLENS: [
                {
                    'template': lambda vars: (
                        [f"{vars[0]}→{vars[1]}", f"¬{vars[1]}"],
                        f"¬{vars[0]}",
                        f"¬{vars[0]}    :MT 1,2",
                        1,
                        "Apply modus tollens to derive the negated antecedent"
                    ),
                    'min_vars': 2
                }
            ],
            
            ProofPattern.CONDITIONAL_CHAIN: [
                {
                    'template': lambda vars: (
                        [f"{vars[0]}→{vars[1]}", f"{vars[1]}→{vars[2]}"],
                        f"{vars[0]}→{vars[2]}",
                        f"""Show {vars[0]}→{vars[2]}
    {vars[0]}    :AS
    {vars[1]}    :MP 1,2
    {vars[2]}    :MP 2,3
:CD 2-4""",
                        3,
                        "Use conditional proof to chain implications"
                    ),
                    'min_vars': 3
                },
                {
                    'template': lambda vars: (
                        [f"{vars[0]}→{vars[1]}", f"{vars[1]}→{vars[2]}", f"{vars[2]}→{vars[3]}"],
                        f"{vars[0]}→{vars[3]}",
                        f"""Show {vars[0]}→{vars[3]}
    {vars[0]}    :AS
    {vars[1]}    :MP 1,2
    {vars[2]}    :MP 2,3
    {vars[3]}    :MP 3,4
:CD 2-5""",
                        4,
                        "Chain multiple conditionals together"
                    ),
                    'min_vars': 4
                }
            ],
            
            ProofPattern.CONJUNCTION_INTRO: [
                {
                    'template': lambda vars: (
                        [vars[0], vars[1]],
                        f"{vars[0]}∧{vars[1]}",
                        f"{vars[0]}∧{vars[1]}    :&I 1,2",
                        1,
                        "Combine two propositions with conjunction introduction"
                    ),
                    'min_vars': 2
                },
                {
                    'template': lambda vars: (
                        [vars[0], vars[1], vars[2]],
                        f"({vars[0]}∧{vars[1]})∧{vars[2]}",
                        f"""{vars[0]}∧{vars[1]}    :&I 1,2
({vars[0]}∧{vars[1]})∧{vars[2]}    :&I 3,4""",
                        2,
                        "Build nested conjunctions"
                    ),
                    'min_vars': 3
                }
            ],
            
            ProofPattern.CONJUNCTION_ELIM: [
                {
                    'template': lambda vars: (
                        [f"{vars[0]}∧{vars[1]}"],
                        vars[0],
                        f"{vars[0]}    :&E 1",
                        1,
                        "Extract the left conjunct"
                    ),
                    'min_vars': 2
                },
                {
                    'template': lambda vars: (
                        [f"({vars[0]}∧{vars[1]})∧{vars[2]}"],
                        vars[1],
                        f"""{vars[0]}∧{vars[1]}    :&E 1
{vars[1]}    :&E 2""",
                        2,
                        "Extract from nested conjunctions"
                    ),
                    'min_vars': 3
                }
            ],
            
            ProofPattern.DISJUNCTION_INTRO: [
                {
                    'template': lambda vars: (
                        [vars[0]],
                        f"{vars[0]}∨{vars[1]}",
                        f"{vars[0]}∨{vars[1]}    :ADD 1",
                        1,
                        "Add a disjunct to create a disjunction"
                    ),
                    'min_vars': 2
                }
            ],
            
            ProofPattern.DISJUNCTION_ELIM: [
                {
                    'template': lambda vars: (
                        [f"{vars[0]}∨{vars[1]}", f"¬{vars[0]}"],
                        vars[1],
                        f"{vars[1]}    :MTP 1,2",
                        1,
                        "Use disjunctive syllogism (modus tollendo ponens)"
                    ),
                    'min_vars': 2
                },
                {
                    'template': lambda vars: (
                        [f"{vars[0]}∨{vars[1]}", f"{vars[0]}→{vars[2]}", f"{vars[1]}→{vars[2]}"],
                        vars[2],
                        f"""Show {vars[2]}
    Show {vars[0]}→{vars[2]}
        {vars[0]}    :AS
        {vars[2]}    :MP 2,3
    :CD 3-4
    Show {vars[1]}→{vars[2]}
        {vars[1]}    :AS
        {vars[2]}    :MP 3,6
    :CD 6-7
    {vars[2]}    :|E 1,2,5,8
:DD 9""",
                        7,
                        "Prove by cases using disjunction elimination"
                    ),
                    'min_vars': 3
                }
            ],
            
            ProofPattern.CONDITIONAL_PROOF: [
                {
                    'template': lambda vars: (
                        [],
                        f"{vars[0]}→{vars[0]}",
                        f"""Show {vars[0]}→{vars[0]}
    {vars[0]}    :AS
:CD 2""",
                        1,
                        "Prove a simple tautology using conditional proof"
                    ),
                    'min_vars': 1
                },
                {
                    'template': lambda vars: (
                        [f"{vars[0]}→{vars[1]}"],
                        f"{vars[1]}→{vars[1]}",
                        f"""Show {vars[1]}→{vars[1]}
    {vars[1]}    :AS
:CD 2""",
                        1,
                        "Prove conditional with unused premise"
                    ),
                    'min_vars': 2
                }
            ],
            
            ProofPattern.REDUCTIO: [
                {
                    'template': lambda vars: (
                        [f"{vars[0]}→{vars[1]}", f"{vars[0]}→¬{vars[1]}"],
                        f"¬{vars[0]}",
                        f"""Show ¬{vars[0]}
    {vars[0]}    :AS
    {vars[1]}    :MP 1,2
    ¬{vars[1]}    :MP 2,2
    ⊥    :¬E 3,4
:RAA 2-5""",
                        4,
                        "Derive a contradiction to prove negation"
                    ),
                    'min_vars': 2
                }
            ],
            
            ProofPattern.DEMORGAN: [
                {
                    'template': lambda vars: (
                        [f"¬({vars[0]}∧{vars[1]})"],
                        f"¬{vars[0]}∨¬{vars[1]}",
                        f"""Show ¬{vars[0]}∨¬{vars[1]}
    Show ¬¬(¬{vars[0]}∨¬{vars[1]})→⊥
        ¬¬(¬{vars[0]}∨¬{vars[1]})    :AS
        ¬{vars[0]}∨¬{vars[1]}    :DNE 3
    :CD 3-4
:IP 2-5""",
                        4,
                        "Apply De Morgan's law"
                    ),
                    'min_vars': 2
                }
            ],
            
            ProofPattern.DOUBLE_NEGATION: [
                {
                    'template': lambda vars: (
                        [f"¬¬{vars[0]}"],
                        vars[0],
                        f"{vars[0]}    :DNE 1",
                        1,
                        "Eliminate double negation"
                    ),
                    'min_vars': 1
                },
                {
                    'template': lambda vars: (
                        [vars[0]],
                        f"¬¬{vars[0]}",
                        f"¬¬{vars[0]}    :DNI 1",
                        1,
                        "Introduce double negation"
                    ),
                    'min_vars': 1
                }
            ],
            
            ProofPattern.BICONDITIONAL: [
                {
                    'template': lambda vars: (
                        [f"{vars[0]}↔{vars[1]}"],
                        f"{vars[0]}→{vars[1]}",
                        f"{vars[0]}→{vars[1]}    :<->E 1",
                        1,
                        "Extract one direction from biconditional"
                    ),
                    'min_vars': 2
                },
                {
                    'template': lambda vars: (
                        [f"{vars[0]}→{vars[1]}", f"{vars[1]}→{vars[0]}"],
                        f"{vars[0]}↔{vars[1]}",
                        f"{vars[0]}↔{vars[1]}    :<->I 1,2",
                        1,
                        "Combine both directions into biconditional"
                    ),
                    'min_vars': 2
                }
            ]
        }
    
    def generate_puzzle(self, pattern: ProofPattern, difficulty: int = None) -> Optional[Puzzle]:
        """Generate a puzzle of the specified pattern"""
        templates = self.templates.get(pattern, [])
        if not templates:
            return None
        
        # Select appropriate template based on difficulty
        if difficulty is None:
            template_data = random.choice(templates)
        else:
            # Filter templates by difficulty (approximated by min_vars)
            suitable = [t for t in templates if t['min_vars'] <= min(difficulty + 1, 5)]
            if not suitable:
                suitable = templates
            template_data = random.choice(suitable)
        
        # Generate variable assignment
        num_vars = template_data['min_vars']
        if difficulty and difficulty > 5:
            num_vars = min(num_vars + (difficulty - 5), 5)
        
        selected_vars = random.sample(self.variables, num_vars)
        
        # Apply template
        premises, conclusion, proof, optimal_len, hint = template_data['template'](selected_vars)
        
        # Calculate difficulty based on pattern and length
        if difficulty is None:
            difficulty = self._calculate_difficulty(pattern, optimal_len, len(premises))
        
        return Puzzle(
            premises=premises,
            conclusion=conclusion,
            difficulty=difficulty,
            pattern=pattern,
            optimal_length=optimal_len,
            hint=hint,
            machine_proof=proof
        )
    
    def _calculate_difficulty(self, pattern: ProofPattern, optimal_length: int, num_premises: int) -> int:
        """Calculate puzzle difficulty"""
        base_difficulty = {
            ProofPattern.MODUS_PONENS: 1,
            ProofPattern.MODUS_TOLLENS: 2,
            ProofPattern.CONJUNCTION_INTRO: 1,
            ProofPattern.CONJUNCTION_ELIM: 1,
            ProofPattern.DISJUNCTION_INTRO: 2,
            ProofPattern.CONDITIONAL_PROOF: 3,
            ProofPattern.CONDITIONAL_CHAIN: 4,
            ProofPattern.DISJUNCTION_ELIM: 5,
            ProofPattern.REDUCTIO: 6,
            ProofPattern.DEMORGAN: 7,
            ProofPattern.DOUBLE_NEGATION: 3,
            ProofPattern.BICONDITIONAL: 4
        }
        
        difficulty = base_difficulty.get(pattern, 5)
        difficulty += optimal_length // 3
        difficulty += num_premises // 2
        
        return min(max(difficulty, 1), 10)
    
    def generate_random_puzzle(self, min_difficulty: int = 1, max_difficulty: int = 10) -> Optional[Puzzle]:
        """Generate a random puzzle within difficulty range"""
        # Weight patterns by difficulty
        patterns_by_difficulty = {
            1: [ProofPattern.MODUS_PONENS, ProofPattern.CONJUNCTION_INTRO, ProofPattern.CONJUNCTION_ELIM],
            2: [ProofPattern.MODUS_TOLLENS, ProofPattern.DISJUNCTION_INTRO],
            3: [ProofPattern.CONDITIONAL_PROOF, ProofPattern.DOUBLE_NEGATION],
            4: [ProofPattern.CONDITIONAL_CHAIN, ProofPattern.BICONDITIONAL],
            5: [ProofPattern.DISJUNCTION_ELIM],
            6: [ProofPattern.REDUCTIO],
            7: [ProofPattern.DEMORGAN]
        }
        
        # Collect suitable patterns
        suitable_patterns = []
        for diff in range(min_difficulty, min(max_difficulty + 1, 8)):
            suitable_patterns.extend(patterns_by_difficulty.get(diff, []))
        
        if not suitable_patterns:
            suitable_patterns = list(ProofPattern)
        
        pattern = random.choice(suitable_patterns)
        target_difficulty = random.randint(min_difficulty, max_difficulty)
        
        return self.generate_puzzle(pattern, target_difficulty)
    
    def generate_puzzle_set(self, pattern: ProofPattern, count: int = 5) -> List[Puzzle]:
        """Generate a set of puzzles for a specific pattern with increasing difficulty"""
        puzzles = []
        for i in range(count):
            difficulty = min(1 + i * 2, 10)
            puzzle = self.generate_puzzle(pattern, difficulty)
            if puzzle:
                puzzles.append(puzzle)
        return puzzles
    
    def generate_collection(self, name: str) -> Dict[str, List[Puzzle]]:
        """Generate a named collection of puzzles"""
        collections = {
            "Introduction to Modus Ponens": [
                self.generate_puzzle(ProofPattern.MODUS_PONENS, 1),
                self.generate_puzzle(ProofPattern.MODUS_PONENS, 2),
                self.generate_puzzle(ProofPattern.MODUS_PONENS, 3),
                self.generate_puzzle(ProofPattern.MODUS_TOLLENS, 2),
                self.generate_puzzle(ProofPattern.MODUS_TOLLENS, 3)
            ],
            "Mastering Contradiction": [
                self.generate_puzzle(ProofPattern.REDUCTIO, 4),
                self.generate_puzzle(ProofPattern.REDUCTIO, 5),
                self.generate_puzzle(ProofPattern.REDUCTIO, 6),
                self.generate_puzzle(ProofPattern.DOUBLE_NEGATION, 3),
                self.generate_puzzle(ProofPattern.DOUBLE_NEGATION, 4),
                self.generate_puzzle(ProofPattern.DEMORGAN, 6),
                self.generate_puzzle(ProofPattern.DEMORGAN, 7),
                self.generate_puzzle(ProofPattern.DEMORGAN, 8)
            ],
            "Conditional Mastery": [
                self.generate_puzzle(ProofPattern.CONDITIONAL_PROOF, 2),
                self.generate_puzzle(ProofPattern.CONDITIONAL_PROOF, 3),
                self.generate_puzzle(ProofPattern.CONDITIONAL_CHAIN, 3),
                self.generate_puzzle(ProofPattern.CONDITIONAL_CHAIN, 4),
                self.generate_puzzle(ProofPattern.CONDITIONAL_CHAIN, 5),
                self.generate_puzzle(ProofPattern.BICONDITIONAL, 4),
                self.generate_puzzle(ProofPattern.BICONDITIONAL, 5)
            ],
            "Competition Training": [
                self.generate_puzzle(ProofPattern.CONDITIONAL_CHAIN, 5),
                self.generate_puzzle(ProofPattern.DISJUNCTION_ELIM, 6),
                self.generate_puzzle(ProofPattern.REDUCTIO, 7),
                self.generate_puzzle(ProofPattern.DEMORGAN, 8),
                self.generate_random_puzzle(6, 8),
                self.generate_random_puzzle(7, 9),
                self.generate_random_puzzle(8, 10),
                self.generate_random_puzzle(8, 10),
                self.generate_random_puzzle(9, 10),
                self.generate_random_puzzle(9, 10)
            ]
        }
        
        # Filter out None values
        return {name: [p for p in puzzles if p is not None] for name, puzzles in collections.items()}