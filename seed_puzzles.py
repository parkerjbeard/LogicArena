#!/usr/bin/env python3
"""
Seed the LogicArena database with hand-crafted puzzles
"""

import psycopg2
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'puzzle'))

from puzzle_generator import PuzzleGenerator, ProofPattern

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://logicuser:logicpass@localhost:5432/logicarena")

def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(DATABASE_URL)

def create_puzzle_in_db(conn, puzzle):
    """Insert a puzzle into the database"""
    try:
        with conn.cursor() as cur:
            # Convert premises list to comma-separated string
            gamma = ", ".join(puzzle.premises)
            
            cur.execute(
                """
                INSERT INTO puzzle (gamma, phi, difficulty, best_len, machine_proof, created)
                VALUES (%s, %s, %s, %s, %s, NOW())
                RETURNING id
                """,
                (gamma, puzzle.conclusion, puzzle.difficulty, puzzle.optimal_length, puzzle.machine_proof)
            )
            
            puzzle_id = cur.fetchone()[0]
            return puzzle_id
    except Exception as e:
        print(f"Error creating puzzle: {e}")
        return None

def seed_puzzles():
    """Seed the database with puzzles"""
    generator = PuzzleGenerator()
    conn = get_db_connection()
    conn.autocommit = True
    
    created_count = 0
    
    try:
        # Generate beginner puzzles (20)
        print("Generating beginner puzzles...")
        beginner_patterns = [
            ProofPattern.MODUS_PONENS,
            ProofPattern.CONJUNCTION_INTRO,
            ProofPattern.CONJUNCTION_ELIM,
            ProofPattern.DISJUNCTION_INTRO
        ]
        
        for i in range(20):
            pattern = beginner_patterns[i % len(beginner_patterns)]
            puzzle = generator.generate_puzzle(pattern, difficulty=1 + (i // 5))
            if puzzle and create_puzzle_in_db(conn, puzzle):
                created_count += 1
                print(f"  Created beginner puzzle {i+1}: {puzzle.conclusion}")
        
        # Generate intermediate puzzles (30)
        print("\nGenerating intermediate puzzles...")
        intermediate_patterns = [
            ProofPattern.MODUS_TOLLENS,
            ProofPattern.CONDITIONAL_PROOF,
            ProofPattern.DOUBLE_NEGATION,
            ProofPattern.CONDITIONAL_CHAIN,
            ProofPattern.BICONDITIONAL
        ]
        
        for i in range(30):
            pattern = intermediate_patterns[i % len(intermediate_patterns)]
            puzzle = generator.generate_puzzle(pattern, difficulty=3 + (i // 10))
            if puzzle and create_puzzle_in_db(conn, puzzle):
                created_count += 1
                print(f"  Created intermediate puzzle {i+1}: {puzzle.conclusion}")
        
        # Generate advanced puzzles (30)
        print("\nGenerating advanced puzzles...")
        advanced_patterns = [
            ProofPattern.DISJUNCTION_ELIM,
            ProofPattern.REDUCTIO,
            ProofPattern.CONDITIONAL_CHAIN,
            ProofPattern.BICONDITIONAL
        ]
        
        for i in range(30):
            pattern = advanced_patterns[i % len(advanced_patterns)]
            puzzle = generator.generate_puzzle(pattern, difficulty=6 + (i // 15))
            if puzzle and create_puzzle_in_db(conn, puzzle):
                created_count += 1
                print(f"  Created advanced puzzle {i+1}: {puzzle.conclusion}")
        
        # Generate expert puzzles (20)
        print("\nGenerating expert puzzles...")
        expert_patterns = [
            ProofPattern.REDUCTIO,
            ProofPattern.DEMORGAN,
            ProofPattern.DISJUNCTION_ELIM
        ]
        
        for i in range(20):
            pattern = expert_patterns[i % len(expert_patterns)]
            puzzle = generator.generate_puzzle(pattern, difficulty=8 + (i // 10))
            if puzzle and create_puzzle_in_db(conn, puzzle):
                created_count += 1
                print(f"  Created expert puzzle {i+1}: {puzzle.conclusion}")
        
        # Generate puzzle collections
        print("\nGenerating puzzle collections...")
        collections = generator.generate_collection("Introduction to Modus Ponens")
        
        for name, puzzles in collections.items():
            print(f"\n  Collection: {name}")
            for puzzle in puzzles:
                if puzzle and create_puzzle_in_db(conn, puzzle):
                    created_count += 1
                    print(f"    Created: {puzzle.conclusion} (difficulty {puzzle.difficulty})")
        
        print(f"\n✓ Successfully created {created_count} puzzles in the database!")
        
        # Show puzzle count by difficulty
        with conn.cursor() as cur:
            cur.execute("""
                SELECT difficulty, COUNT(*) 
                FROM puzzle 
                GROUP BY difficulty 
                ORDER BY difficulty
            """)
            
            print("\nPuzzle distribution by difficulty:")
            for difficulty, count in cur.fetchall():
                print(f"  Difficulty {difficulty}: {count} puzzles")
        
    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        conn.close()

def clear_puzzles():
    """Clear all puzzles from the database"""
    conn = get_db_connection()
    conn.autocommit = True
    
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM puzzle")
            print("✓ Cleared all existing puzzles")
    except Exception as e:
        print(f"Error clearing puzzles: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed LogicArena database with puzzles")
    parser.add_argument("--clear", action="store_true", help="Clear existing puzzles before seeding")
    args = parser.parse_args()
    
    if args.clear:
        response = input("This will delete all existing puzzles. Continue? (y/N): ")
        if response.lower() == 'y':
            clear_puzzles()
        else:
            print("Aborted.")
            sys.exit(0)
    
    seed_puzzles()