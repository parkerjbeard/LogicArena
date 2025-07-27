#!/usr/bin/env python3
"""
Seed the LogicArena database with hand-crafted puzzles
"""

import psycopg2
import psycopg2.extras
import sys
import os
import asyncio
import logging
from datetime import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), 'puzzle'))

from puzzle_generator import PuzzleGenerator, ProofPattern
from puzzle_verifier import PuzzleVerifier, BatchVerifier, Puzzle as VerifierPuzzle
from proof_normalizer import ProofNormalizer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://logicuser:logicpass@localhost:5432/logicarena")
PROOF_CHECKER_URL = os.getenv("PROOF_CHECKER_URL", "http://localhost:8001")
MAX_WORKERS = int(os.getenv("VERIFICATION_MAX_WORKERS", "10"))

# This will be set based on environment and connection test
VERIFY_PUZZLES = os.getenv("VERIFY_PUZZLES_ON_SEED", "true").lower() == "true"

def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(DATABASE_URL)

async def create_puzzle_in_db(conn, puzzle, verification_result=None):
    """Insert a puzzle into the database with optional verification"""
    try:
        with conn.cursor() as cur:
            # Convert premises list to comma-separated string
            gamma = ", ".join(puzzle.premises)
            
            # Use verified data if available
            if verification_result and verification_result.valid:
                optimal_length = verification_result.optimal_length or puzzle.optimal_length
                machine_proof = verification_result.optimal_proof or puzzle.machine_proof
                difficulty = verification_result.actual_difficulty or puzzle.difficulty
                verification_status = 'verified'
            else:
                optimal_length = puzzle.optimal_length
                machine_proof = puzzle.machine_proof
                difficulty = puzzle.difficulty
                verification_status = 'unverified'
            
            # Prepare verification metadata
            verification_metadata = None
            if verification_result:
                verification_metadata = psycopg2.extras.Json({
                    "verified": verification_result.valid,
                    "verified_at": datetime.now().isoformat(),
                    "verification_time_ms": verification_result.verification_time_ms,
                    "template_proof_valid": verification_result.template_proof_valid
                })
            
            cur.execute(
                """
                INSERT INTO puzzle (
                    gamma, phi, difficulty, best_len, machine_proof, 
                    hint_text, created, verification_status, verification_metadata,
                    actual_optimal_length
                )
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s)
                RETURNING id
                """,
                (
                    gamma, 
                    puzzle.conclusion, 
                    difficulty, 
                    optimal_length, 
                    machine_proof,
                    puzzle.hint,
                    verification_status,
                    verification_metadata,
                    verification_result.optimal_length if verification_result and verification_result.valid else None
                )
            )
            
            puzzle_id = cur.fetchone()[0]
            return puzzle_id
    except Exception as e:
        logger.error(f"Error creating puzzle: {e}")
        return None

async def verify_and_insert_puzzles(conn, puzzles, batch_verifier, puzzle_type=""):
    """Helper function to verify and insert puzzles"""
    created = 0
    verified = 0
    failed = 0
    
    if VERIFY_PUZZLES and batch_verifier:
        print(f"  Verifying {puzzle_type} puzzles...")
        verifier_puzzles = [
            VerifierPuzzle(
                premises=ProofNormalizer.normalize_premises(p.premises),
                conclusion=ProofNormalizer.normalize_conclusion(p.conclusion),
                difficulty=p.difficulty,
                optimal_length=p.optimal_length,
                machine_proof=ProofNormalizer.normalize_proof(p.machine_proof) if p.machine_proof else "",
                hint=p.hint
            ) for p in puzzles
        ]
        results = await batch_verifier.verify_batch(verifier_puzzles)
        
        for puzzle, (_, result) in zip(puzzles, results):
            if result.valid:
                if await create_puzzle_in_db(conn, puzzle, result):
                    created += 1
                    verified += 1
                    logger.info(f"  ✓ Created verified puzzle: {puzzle.conclusion}")
            else:
                failed += 1
                logger.warning(f"  ✗ Failed verification: {puzzle.conclusion} - {result.errors}")
    else:
        # Insert without verification
        for puzzle in puzzles:
            if await create_puzzle_in_db(conn, puzzle):
                created += 1
                logger.info(f"  Created puzzle: {puzzle.conclusion}")
    
    return created, verified, failed

async def seed_puzzles():
    """Seed the database with puzzles"""
    generator = PuzzleGenerator()
    conn = get_db_connection()
    conn.autocommit = True
    
    created_count = 0
    verified_count = 0
    failed_count = 0
    
    # Initialize batch verifier if verification is enabled
    batch_verifier = BatchVerifier(PROOF_CHECKER_URL, MAX_WORKERS) if VERIFY_PUZZLES else None
    
    try:
        # Generate beginner puzzles (20)
        print("Generating beginner puzzles...")
        beginner_patterns = [
            ProofPattern.MODUS_PONENS,
            ProofPattern.CONJUNCTION_INTRO,
            ProofPattern.CONJUNCTION_ELIM,
            ProofPattern.DISJUNCTION_INTRO
        ]
        
        beginner_puzzles = []
        for i in range(20):
            pattern = beginner_patterns[i % len(beginner_patterns)]
            puzzle = generator.generate_puzzle(pattern, difficulty=1 + (i // 5))
            if puzzle:
                beginner_puzzles.append(puzzle)
        
        # Verify and insert puzzles
        created, verified, failed = await verify_and_insert_puzzles(
            conn, beginner_puzzles, batch_verifier, "beginner"
        )
        created_count += created
        verified_count += verified
        failed_count += failed
        
        # Generate intermediate puzzles (30)
        print("\nGenerating intermediate puzzles...")
        intermediate_patterns = [
            ProofPattern.MODUS_TOLLENS,
            ProofPattern.CONDITIONAL_PROOF,
            ProofPattern.DOUBLE_NEGATION,
            ProofPattern.CONDITIONAL_CHAIN,
            ProofPattern.BICONDITIONAL
        ]
        
        intermediate_puzzles = []
        for i in range(30):
            pattern = intermediate_patterns[i % len(intermediate_patterns)]
            puzzle = generator.generate_puzzle(pattern, difficulty=3 + (i // 10))
            if puzzle:
                intermediate_puzzles.append(puzzle)
        
        # Verify and insert puzzles
        created, verified, failed = await verify_and_insert_puzzles(
            conn, intermediate_puzzles, batch_verifier, "intermediate"
        )
        created_count += created
        verified_count += verified
        failed_count += failed
        
        # Generate advanced puzzles (30)
        print("\nGenerating advanced puzzles...")
        advanced_patterns = [
            ProofPattern.DISJUNCTION_ELIM,
            ProofPattern.REDUCTIO,
            ProofPattern.CONDITIONAL_CHAIN,
            ProofPattern.BICONDITIONAL
        ]
        
        advanced_puzzles = []
        for i in range(30):
            pattern = advanced_patterns[i % len(advanced_patterns)]
            puzzle = generator.generate_puzzle(pattern, difficulty=6 + (i // 15))
            if puzzle:
                advanced_puzzles.append(puzzle)
        
        # Verify and insert puzzles
        created, verified, failed = await verify_and_insert_puzzles(
            conn, advanced_puzzles, batch_verifier, "advanced"
        )
        created_count += created
        verified_count += verified
        failed_count += failed
        
        # Generate expert puzzles (20)
        print("\nGenerating expert puzzles...")
        expert_patterns = [
            ProofPattern.REDUCTIO,
            ProofPattern.DEMORGAN,
            ProofPattern.DISJUNCTION_ELIM
        ]
        
        expert_puzzles = []
        for i in range(20):
            pattern = expert_patterns[i % len(expert_patterns)]
            puzzle = generator.generate_puzzle(pattern, difficulty=8 + (i // 10))
            if puzzle:
                expert_puzzles.append(puzzle)
        
        # Verify and insert puzzles
        created, verified, failed = await verify_and_insert_puzzles(
            conn, expert_puzzles, batch_verifier, "expert"
        )
        created_count += created
        verified_count += verified
        failed_count += failed
        
        # Generate puzzle collections
        print("\nGenerating puzzle collections...")
        collections = generator.generate_collection("Introduction to Modus Ponens")
        
        for name, puzzles in collections.items():
            print(f"\n  Collection: {name}")
            created, verified, failed = await verify_and_insert_puzzles(
                conn, puzzles, batch_verifier, f"collection-{name}"
            )
            created_count += created
            verified_count += verified
            failed_count += failed
        
        print(f"\n="*50)
        print("SEEDING COMPLETE")
        print("="*50)
        print(f"Total puzzles created: {created_count}")
        
        if VERIFY_PUZZLES:
            print(f"Verified puzzles: {verified_count}")
            print(f"Failed verification: {failed_count}")
            success_rate = (verified_count / (verified_count + failed_count) * 100) if (verified_count + failed_count) > 0 else 0
            print(f"Verification success rate: {success_rate:.1f}%")
        
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

async def clear_puzzles():
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

async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed LogicArena database with puzzles")
    parser.add_argument("--clear", action="store_true", help="Clear existing puzzles before seeding")
    args = parser.parse_args()
    
    if args.clear:
        response = input("This will delete all existing puzzles. Continue? (y/N): ")
        if response.lower() == 'y':
            await clear_puzzles()
        else:
            print("Aborted.")
            sys.exit(0)
    
    # Check if proof-checker is available when verification is enabled
    if VERIFY_PUZZLES:
        logger.info(f"Testing connection to proof-checker at {PROOF_CHECKER_URL}...")
        try:
            async with PuzzleVerifier(PROOF_CHECKER_URL) as verifier:
                # Test with simple puzzle
                test_puzzle = VerifierPuzzle(["P"], "P", 1, 0, "")
                test_result = await verifier.verify_puzzle(test_puzzle)
                logger.info("✓ Proof-checker connection successful")
        except Exception as e:
            logger.warning(f"Proof-checker not available: {e}")
            logger.warning("Proceeding without verification.")
            # Update the global variable
            globals()['VERIFY_PUZZLES'] = False
    
    await seed_puzzles()

if __name__ == "__main__":
    asyncio.run(main())