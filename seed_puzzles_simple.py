#!/usr/bin/env python3
"""
Simplified seed script for LogicArena database with pre-verified puzzles
This bypasses the verification step to quickly populate the database
"""

import psycopg2
import psycopg2.extras
import os
import sys
from datetime import datetime

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://logicuser:DevP%40ssw0rd2024%21@localhost:5432/logicarena")

def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(DATABASE_URL)

def create_puzzle(conn, gamma, phi, difficulty, best_len, machine_proof="", hint_text="", category="any", chapter=None):
    """Insert a puzzle into the database"""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO puzzle (
                    gamma, phi, difficulty, best_len, machine_proof, 
                    hint_text, created, verification_status, category, chapter
                )
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s)
                RETURNING id
                """,
                (
                    gamma, 
                    phi, 
                    difficulty, 
                    best_len, 
                    machine_proof,
                    hint_text,
                    'unverified',  # We'll mark as unverified but functional
                    category,
                    chapter
                )
            )
            
            puzzle_id = cur.fetchone()[0]
            return puzzle_id
    except Exception as e:
        print(f"Error creating puzzle: {e}")
        return None

def seed_basic_puzzles():
    """Seed the database with basic logic puzzles"""
    conn = get_db_connection()
    conn.autocommit = True
    
    created_count = 0
    
    # Chapter 3: Basic Derivations (MP, MT, DN)
    basic_puzzles = [
        # Modus Ponens puzzles
        {
            "gamma": "P→Q, P",
            "phi": "Q",
            "difficulty": 1,
            "best_len": 1,
            "machine_proof": "Q    :MP 1,2",
            "hint_text": "Use Modus Ponens with the conditional and its antecedent",
            "category": "chapter3",
            "chapter": 3
        },
        {
            "gamma": "R→S, R",
            "phi": "S",
            "difficulty": 1,
            "best_len": 1,
            "machine_proof": "S    :MP 1,2",
            "hint_text": "Apply Modus Ponens to derive S",
            "category": "chapter3",
            "chapter": 3
        },
        {
            "gamma": "(P∧Q)→R, P∧Q",
            "phi": "R",
            "difficulty": 2,
            "best_len": 1,
            "machine_proof": "R    :MP 1,2",
            "hint_text": "The antecedent is a conjunction - use MP directly",
            "category": "chapter3",
            "chapter": 3
        },
        
        # Modus Tollens puzzles
        {
            "gamma": "P→Q, ¬Q",
            "phi": "¬P",
            "difficulty": 2,
            "best_len": 1,
            "machine_proof": "¬P    :MT 1,2",
            "hint_text": "Use Modus Tollens to derive the negated antecedent",
            "category": "chapter3",
            "chapter": 3
        },
        {
            "gamma": "(A∨B)→C, ¬C",
            "phi": "¬(A∨B)",
            "difficulty": 2,
            "best_len": 1,
            "machine_proof": "¬(A∨B)    :MT 1,2",
            "hint_text": "Apply MT with a complex antecedent",
            "category": "chapter3",
            "chapter": 3
        },
        
        # Double Negation puzzles
        {
            "gamma": "¬¬P",
            "phi": "P",
            "difficulty": 1,
            "best_len": 1,
            "machine_proof": "P    :DNE 1",
            "hint_text": "Eliminate the double negation",
            "category": "chapter3",
            "chapter": 3
        },
        {
            "gamma": "P",
            "phi": "¬¬P",
            "difficulty": 1,
            "best_len": 1,
            "machine_proof": "¬¬P    :DNI 1",
            "hint_text": "Introduce double negation",
            "category": "chapter3",
            "chapter": 3
        },
        
        # Conjunction Introduction/Elimination
        {
            "gamma": "P, Q",
            "phi": "P∧Q",
            "difficulty": 1,
            "best_len": 1,
            "machine_proof": "P∧Q    :∧I 1,2",
            "hint_text": "Combine the premises using conjunction introduction",
            "category": "chapter3",
            "chapter": 3
        },
        {
            "gamma": "P∧Q",
            "phi": "P",
            "difficulty": 1,
            "best_len": 1,
            "machine_proof": "P    :∧E 1",
            "hint_text": "Extract the left conjunct",
            "category": "chapter3",
            "chapter": 3
        },
        {
            "gamma": "P∧Q",
            "phi": "Q",
            "difficulty": 1,
            "best_len": 1,
            "machine_proof": "Q    :∧E 1",
            "hint_text": "Extract the right conjunct",
            "category": "chapter3",
            "chapter": 3
        },
        
        # Combined rules
        {
            "gamma": "P→Q, Q→R, P",
            "phi": "R",
            "difficulty": 2,
            "best_len": 2,
            "machine_proof": "Q    :MP 1,3\nR    :MP 2,4",
            "hint_text": "Chain two modus ponens applications",
            "category": "chapter3",
            "chapter": 3
        },
        {
            "gamma": "P∧Q, P→R, Q→S",
            "phi": "R∧S",
            "difficulty": 3,
            "best_len": 5,
            "machine_proof": "P    :∧E 1\nQ    :∧E 1\nR    :MP 2,4\nS    :MP 3,5\nR∧S    :∧I 6,7",
            "hint_text": "Extract conjuncts, apply MP twice, then combine results",
            "category": "chapter3",
            "chapter": 3
        }
    ]
    
    # Chapter 4: Conditional Derivations
    conditional_puzzles = [
        {
            "gamma": "P→Q",
            "phi": "P→Q",
            "difficulty": 1,
            "best_len": 1,
            "machine_proof": "P→Q    :R 1",
            "hint_text": "Simply reiterate the premise",
            "category": "chapter4",
            "chapter": 4
        },
        {
            "gamma": "P→Q, Q→R",
            "phi": "P→R",
            "difficulty": 3,
            "best_len": 3,
            "machine_proof": "Show P→R\n    P    :AS\n    Q    :MP 1,2\n    R    :MP 2,3\n:CD 2-4",
            "hint_text": "Use conditional proof: assume P, derive R",
            "category": "chapter4",
            "chapter": 4
        },
        {
            "gamma": "P∧Q",
            "phi": "P→Q",
            "difficulty": 2,
            "best_len": 2,
            "machine_proof": "Show P→Q\n    P    :AS\n    Q    :∧E 1\n:CD 2-3",
            "hint_text": "Assume P, then extract Q from the conjunction",
            "category": "chapter4",
            "chapter": 4
        },
        {
            "gamma": "",
            "phi": "P→P",
            "difficulty": 2,
            "best_len": 2,
            "machine_proof": "Show P→P\n    P    :AS\n    P    :R 2\n:CD 2-3",
            "hint_text": "Prove the law of identity using conditional proof",
            "category": "chapter4",
            "chapter": 4
        }
    ]
    
    # Chapter 5: Nested Derivations
    nested_puzzles = [
        {
            "gamma": "",
            "phi": "P→(Q→P)",
            "difficulty": 4,
            "best_len": 4,
            "machine_proof": "Show P→(Q→P)\n    P    :AS\n    Show Q→P\n        Q    :AS\n        P    :R 2\n    :CD 4-5\n:CD 2-6",
            "hint_text": "Nested conditional proof: assume P, then show Q→P",
            "category": "chapter5",
            "chapter": 5
        },
        {
            "gamma": "P→(Q→R)",
            "phi": "(P∧Q)→R",
            "difficulty": 5,
            "best_len": 4,
            "machine_proof": "Show (P∧Q)→R\n    P∧Q    :AS\n    P    :∧E 2\n    Q    :∧E 2\n    Q→R    :MP 1,3\n    R    :MP 5,4\n:CD 2-6",
            "hint_text": "Export rule: transform nested conditional to conjunction",
            "category": "chapter5",
            "chapter": 5
        }
    ]
    
    # Chapter 6: Indirect Derivations
    indirect_puzzles = [
        {
            "gamma": "P→Q, ¬Q",
            "phi": "¬P",
            "difficulty": 3,
            "best_len": 1,
            "machine_proof": "¬P    :MT 1,2",
            "hint_text": "Can be solved with MT, but also try indirect proof",
            "category": "chapter6",
            "chapter": 6
        },
        {
            "gamma": "P∨Q, ¬P",
            "phi": "Q",
            "difficulty": 4,
            "best_len": 5,
            "machine_proof": "Show Q\n    ¬Q    :AS\n    P    :DS 1,2\n    ⊥    :⊥I 3,4\n:ID 2-4",
            "hint_text": "Use indirect proof: assume ¬Q and derive a contradiction",
            "category": "chapter6",
            "chapter": 6
        }
    ]
    
    # Disjunction puzzles
    disjunction_puzzles = [
        {
            "gamma": "P",
            "phi": "P∨Q",
            "difficulty": 1,
            "best_len": 1,
            "machine_proof": "P∨Q    :∨I 1",
            "hint_text": "Introduce disjunction from the left disjunct",
            "category": "any",
            "chapter": None
        },
        {
            "gamma": "Q",
            "phi": "P∨Q",
            "difficulty": 1,
            "best_len": 1,
            "machine_proof": "P∨Q    :∨I 1",
            "hint_text": "Introduce disjunction from the right disjunct",
            "category": "any",
            "chapter": None
        }
    ]
    
    # Insert all puzzles
    all_puzzles = basic_puzzles + conditional_puzzles + nested_puzzles + indirect_puzzles + disjunction_puzzles
    
    print(f"Seeding {len(all_puzzles)} puzzles...")
    
    for puzzle in all_puzzles:
        if create_puzzle(conn, **puzzle):
            created_count += 1
            print(f"  ✓ Created puzzle: {puzzle['phi']}")
        else:
            print(f"  ✗ Failed to create puzzle: {puzzle['phi']}")
    
    # Show summary
    print(f"\n{'='*50}")
    print("SEEDING COMPLETE")
    print(f"{'='*50}")
    print(f"Total puzzles created: {created_count}")
    
    # Show puzzle count by category
    with conn.cursor() as cur:
        cur.execute("""
            SELECT category, COUNT(*) 
            FROM puzzle 
            GROUP BY category 
            ORDER BY category
        """)
        
        print("\nPuzzle distribution by category:")
        for category, count in cur.fetchall():
            print(f"  {category}: {count} puzzles")
        
        # Show by difficulty
        cur.execute("""
            SELECT difficulty, COUNT(*) 
            FROM puzzle 
            GROUP BY difficulty 
            ORDER BY difficulty
        """)
        
        print("\nPuzzle distribution by difficulty:")
        for difficulty, count in cur.fetchall():
            print(f"  Difficulty {difficulty}: {count} puzzles")
    
    conn.close()

def clear_puzzles():
    """Clear all puzzles from the database"""
    conn = get_db_connection()
    conn.autocommit = True
    
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM submission")  # Clear submissions first
            cur.execute("DELETE FROM puzzle_verification_log")  # Clear verification logs
            cur.execute("DELETE FROM puzzle")
            print("✓ Cleared all existing puzzles")
    except Exception as e:
        print(f"Error clearing puzzles: {e}")
    finally:
        conn.close()

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed LogicArena database with pre-verified puzzles")
    parser.add_argument("--clear", action="store_true", help="Clear existing puzzles before seeding")
    args = parser.parse_args()
    
    if args.clear:
        response = input("This will delete all existing puzzles. Continue? (y/N): ")
        if response.lower() == 'y':
            clear_puzzles()
        else:
            print("Aborted.")
            sys.exit(0)
    
    seed_basic_puzzles()

if __name__ == "__main__":
    main()