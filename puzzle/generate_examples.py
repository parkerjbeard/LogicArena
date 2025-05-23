#!/usr/bin/env python3
"""
Example puzzle generator for LogicArena.
This script generates a set of example natural deduction puzzles
and saves them to the database for testing.
"""

import os
import psycopg2
import psycopg2.extras
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://logicuser:logicpass@postgres:5432/logicarena")

# Example natural deduction puzzles
EXAMPLE_PUZZLES = [
    # Basic propositional logic examples
    {
        "gamma": "P → Q, P",
        "phi": "Q",
        "difficulty": 1,
        "best_len": 3,
        "machine_proof": "1. P → Q [Premise]\n2. P [Premise]\n3. Q [→E 1,2]"
    },
    {
        "gamma": "P → Q, Q → R",
        "phi": "P → R",
        "difficulty": 2,
        "best_len": 5,
        "machine_proof": "1. P → Q [Premise]\n2. Q → R [Premise]\n3. P [Assumption]\n4. Q [→E 1,3]\n5. R [→E 2,4]\n6. P → R [→I 3-5]"
    },
    {
        "gamma": "(P ∧ Q) → R, P, Q",
        "phi": "R",
        "difficulty": 2,
        "best_len": 5,
        "machine_proof": "1. (P ∧ Q) → R [Premise]\n2. P [Premise]\n3. Q [Premise]\n4. P ∧ Q [∧I 2,3]\n5. R [→E 1,4]"
    },
    {
        "gamma": "P → (Q → R), P, Q",
        "phi": "R",
        "difficulty": 3,
        "best_len": 5,
        "machine_proof": "1. P → (Q → R) [Premise]\n2. P [Premise]\n3. Q → R [→E 1,2]\n4. Q [Premise]\n5. R [→E 3,4]"
    },
    
    # Negation examples
    {
        "gamma": "¬(P ∧ Q)",
        "phi": "P → ¬Q",
        "difficulty": 3,
        "best_len": 7,
        "machine_proof": "1. ¬(P ∧ Q) [Premise]\n2. P [Assumption]\n3. Q [Assumption]\n4. P ∧ Q [∧I 2,3]\n5. ⊥ [¬E 1,4]\n6. ¬Q [¬I 3-5]\n7. P → ¬Q [→I 2-6]"
    },
    {
        "gamma": "P ∨ Q, ¬P",
        "phi": "Q",
        "difficulty": 3,
        "best_len": 7,
        "machine_proof": "1. P ∨ Q [Premise]\n2. ¬P [Premise]\n3. P [Assumption]\n4. ⊥ [¬E 2,3]\n5. Q [⊥E 4]\n6. Q [Assumption]\n7. Q [∨E 1,3-5,6-6]"
    },
    
    # Intermediate examples
    {
        "gamma": "P → Q, R → S, P ∨ R",
        "phi": "Q ∨ S",
        "difficulty": 4,
        "best_len": 9,
        "machine_proof": "1. P → Q [Premise]\n2. R → S [Premise]\n3. P ∨ R [Premise]\n4. P [Assumption]\n5. Q [→E 1,4]\n6. Q ∨ S [∨I1 5]\n7. R [Assumption]\n8. S [→E 2,7]\n9. Q ∨ S [∨I2 8]\n10. Q ∨ S [∨E 3,4-6,7-9]"
    },
    {
        "gamma": "¬¬P",
        "phi": "P",
        "difficulty": 4,
        "best_len": 5,
        "machine_proof": "1. ¬¬P [Premise]\n2. ¬P [Assumption]\n3. ⊥ [¬E 1,2]\n4. P [⊥E 3]\n5. P [¬¬E 1]"
    },
    
    # Advanced examples
    {
        "gamma": "(P → Q) → P",
        "phi": "P",
        "difficulty": 5,
        "best_len": 10,
        "machine_proof": "1. (P → Q) → P [Premise]\n2. ¬P [Assumption]\n3. P [Assumption]\n4. ⊥ [¬E 2,3]\n5. Q [⊥E 4]\n6. P → Q [→I 3-5]\n7. P [→E 1,6]\n8. ⊥ [¬E 2,7]\n9. P [¬¬E 8]\n10. P [PBC 2-9]"
    },
    {
        "gamma": "((P → Q) → P) → P",
        "phi": "P",
        "difficulty": 6,
        "best_len": 20,
        "machine_proof": "1. ((P → Q) → P) → P [Premise]\n2. ¬P [Assumption]\n3. P → Q [Assumption]\n4. P [Assumption]\n5. ⊥ [¬E 2,4]\n6. Q [⊥E 5]\n7. P → Q [→I 4-6]\n8. (P → Q) → P [Assumption]\n9. P [→E 8,7]\n10. ⊥ [¬E 2,9]\n11. ¬((P → Q) → P) [¬I 8-10]\n12. (P → Q) → P [Assumption]\n13. P [→E 12,3]\n14. ⊥ [¬E 2,13]\n15. ¬((P → Q) → P) [¬I 12-14]\n16. ⊥ [¬E 11,15]\n17. P [PBC 2-16]\n18. ((P → Q) → P) → P [→I 8-17]\n19. P [→E 1,18]\n20. P [→I 3-13]"
    }
]

def main():
    """Generate example puzzles and store them in the database."""
    logger.info("Generating example puzzles...")
    
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        
        with conn.cursor() as cur:
            # Check if puzzles already exist
            cur.execute('SELECT COUNT(*) FROM puzzle')
            puzzle_count = cur.fetchone()[0]
            
            if puzzle_count > 0:
                logger.info(f"Database already contains {puzzle_count} puzzles.")
                choice = input("Do you want to add more example puzzles anyway? (y/n): ")
                if choice.lower() != 'y':
                    logger.info("Exiting without adding puzzles.")
                    return
            
            # Add example puzzles
            for puzzle in EXAMPLE_PUZZLES:
                cur.execute(
                    """
                    INSERT INTO puzzle (gamma, phi, difficulty, best_len, machine_proof, created)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    RETURNING id
                    """,
                    (
                        puzzle["gamma"],
                        puzzle["phi"],
                        puzzle["difficulty"],
                        puzzle["best_len"],
                        puzzle["machine_proof"]
                    )
                )
                puzzle_id = cur.fetchone()[0]
                logger.info(f"Created puzzle {puzzle_id}: {puzzle['gamma']} ⊢ {puzzle['phi']}")
            
            logger.info(f"Added {len(EXAMPLE_PUZZLES)} example puzzles to the database.")
        
    except Exception as e:
        logger.error(f"Error generating example puzzles: {str(e)}")
    
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main() 