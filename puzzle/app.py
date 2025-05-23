from fastapi import FastAPI, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import tempfile
import subprocess
import random
import time
import re
from loguru import logger
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
import httpx

# Load environment variables
load_dotenv()

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://logicuser:logicpass@postgres:5432/logicarena")
PROOF_CHECKER_URL = os.getenv("PROOF_CHECKER_URL", "http://proof-checker:3000")
PUZZLE_GEN_MIN_VARIABLES = int(os.getenv("PUZZLE_GEN_MIN_VARIABLES", "4"))
PUZZLE_GEN_MAX_VARIABLES = int(os.getenv("PUZZLE_GEN_MAX_VARIABLES", "10"))
PUZZLE_GEN_BATCH_SIZE = int(os.getenv("PUZZLE_GEN_BATCH_SIZE", "500"))

# Initialize FastAPI app
app = FastAPI(
    title="LogicArena Puzzle Service",
    description="Puzzle generation and delivery service for LogicArena",
    version="0.1.0",
)

# Models
class PuzzleBase(BaseModel):
    gamma: str  # Premises
    phi: str    # Conclusion
    difficulty: int

class PuzzleCreate(PuzzleBase):
    best_len: int
    machine_proof: Optional[str] = None

class PuzzleResponse(PuzzleBase):
    id: int
    best_len: int
    created: str

class PuzzleBatch(BaseModel):
    count: int = 10
    min_difficulty: int = 1
    max_difficulty: int = 10

# Database connection
def get_db_connection():
    """Create a new database connection."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn

def close_db_connection(conn):
    """Close a database connection."""
    if conn:
        conn.close()

def get_random_puzzle(difficulty: Optional[int] = None):
    """Get a random puzzle from the database."""
    try:
        conn = get_db_connection()
        
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            query = "SELECT * FROM puzzle"
            params = []
            
            if difficulty:
                query += " WHERE difficulty = %s"
                params.append(difficulty)
            
            # Get count
            count_query = f"SELECT COUNT(*) FROM ({query}) AS count_subquery"
            cur.execute(count_query, params)
            count = cur.fetchone()[0]
            
            if count == 0:
                return None
            
            # Select random puzzle
            offset = random.randint(0, count - 1)
            query += " OFFSET %s LIMIT 1"
            params.append(offset)
            
            cur.execute(query, params)
            puzzle = cur.fetchone()
            
            if not puzzle:
                return None
            
            return {
                "id": puzzle["id"],
                "gamma": puzzle["gamma"],
                "phi": puzzle["phi"],
                "difficulty": puzzle["difficulty"],
                "best_len": puzzle["best_len"],
                "created": puzzle["created"].isoformat()
            }
    
    except Exception as e:
        logger.error(f"Error getting random puzzle: {str(e)}")
        return None
    
    finally:
        close_db_connection(conn)

def create_puzzle(puzzle: PuzzleCreate):
    """Create a new puzzle in the database."""
    try:
        conn = get_db_connection()
        
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO puzzle (gamma, phi, difficulty, best_len, machine_proof)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (puzzle.gamma, puzzle.phi, puzzle.difficulty, puzzle.best_len, puzzle.machine_proof)
            )
            
            puzzle_id = cur.fetchone()[0]
            return puzzle_id
    
    except Exception as e:
        logger.error(f"Error creating puzzle: {str(e)}")
        return None
    
    finally:
        close_db_connection(conn)

def generate_dimacs_problem(num_variables, num_clauses):
    """Generate a random DIMACS-format CNF problem."""
    clauses = []
    for _ in range(num_clauses):
        # Generate a clause with 2-3 literals
        clause_size = random.randint(2, 3)
        clause = []
        
        # Generate random literals
        for _ in range(clause_size):
            var = random.randint(1, num_variables)
            sign = 1 if random.random() > 0.5 else -1
            clause.append(sign * var)
        
        clauses.append(clause)
    
    # Format as DIMACS
    dimacs = f"p cnf {num_variables} {num_clauses}\n"
    for clause in clauses:
        dimacs += " ".join(map(str, clause)) + " 0\n"
    
    return dimacs

def run_minisat(dimacs_content):
    """Run minisat to check if a CNF formula is satisfiable."""
    try:
        with tempfile.NamedTemporaryFile(mode='w+', suffix='.cnf', delete=False) as dimacs_file, \
             tempfile.NamedTemporaryFile(mode='w+', suffix='.out', delete=False) as output_file:
            
            dimacs_file.write(dimacs_content)
            dimacs_file.flush()
            
            cmd = ["minisat", dimacs_file.name, output_file.name]
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Set timeout
            try:
                stdout, stderr = process.communicate(timeout=5)
                
                # Read the output
                output_file.seek(0)
                minisat_output = output_file.read()
                
                # Check if the formula is UNSAT
                is_unsat = "UNSAT" in minisat_output
                
                return is_unsat, minisat_output
            
            except subprocess.TimeoutExpired:
                process.kill()
                return None, "Timeout"
    
    except Exception as e:
        logger.error(f"Error running minisat: {str(e)}")
        return None, str(e)
    
    finally:
        # Clean up
        if os.path.exists(dimacs_file.name):
            os.unlink(dimacs_file.name)
        if os.path.exists(output_file.name):
            os.unlink(output_file.name)

def dimacs_to_nd(dimacs_content):
    """Convert DIMACS to natural deduction format (simplified implementation)."""
    # Extract variables and clauses from DIMACS
    variables = []
    clauses = []
    
    for line in dimacs_content.strip().split('\n'):
        if line.startswith('p cnf'):
            parts = line.split()
            num_vars = int(parts[2])
            variables = [f"P{i}" for i in range(1, num_vars + 1)]
        elif not line.startswith('c') and line.strip():
            clause = [int(x) for x in line.split() if x != '0']
            if clause:
                clauses.append(clause)
    
    # Convert clauses to logical formulas
    logical_clauses = []
    for clause in clauses:
        literals = []
        for lit in clause:
            var_idx = abs(lit) - 1
            if var_idx < len(variables):
                var_name = variables[var_idx]
                if lit < 0:
                    literals.append(f"¬{var_name}")
                else:
                    literals.append(var_name)
        
        if literals:
            logical_clauses.append(" ∨ ".join(literals))
    
    # Create premises (gamma) and conclusion (phi)
    if logical_clauses:
        # Use all but the last clause as premises
        gamma = ", ".join(logical_clauses[:-1])
        
        # Use the negation of the last clause as the conclusion
        last_clause = logical_clauses[-1]
        literals = last_clause.split(" ∨ ")
        
        # Negate each literal and combine with conjunction
        negated_literals = []
        for lit in literals:
            if lit.startswith("¬"):
                negated_literals.append(lit[1:])  # Remove negation
            else:
                negated_literals.append(f"¬{lit}")  # Add negation
        
        phi = " ∧ ".join(negated_literals)
        
        # Generate a simple ND proof (just a placeholder)
        nd_proof = f"1. [{gamma}] Premises\n2. [{phi}] Goal"
        
        return {
            "gamma": gamma,
            "phi": phi,
            "nd_proof": nd_proof,
            "difficulty": min(len(clauses), 10)  # Estimate difficulty
        }
    
    return None

async def generate_nd_puzzle():
    """Generate a natural deduction puzzle."""
    max_attempts = 10
    
    for attempt in range(max_attempts):
        # Randomly select number of variables and clauses
        num_variables = random.randint(PUZZLE_GEN_MIN_VARIABLES, PUZZLE_GEN_MAX_VARIABLES)
        num_clauses = random.randint(num_variables, num_variables * 2)
        
        # Generate DIMACS problem
        dimacs_content = generate_dimacs_problem(num_variables, num_clauses)
        
        # Check if UNSAT (which means we have a valid proof)
        is_unsat, _ = run_minisat(dimacs_content)
        
        if is_unsat:
            # Convert to natural deduction
            nd_puzzle = dimacs_to_nd(dimacs_content)
            
            if nd_puzzle:
                # Estimate proof length based on clauses
                nd_puzzle["best_len"] = len(nd_puzzle["gamma"].split(",")) * 3
                
                # Try to generate a proof using the proof-checker service
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            f"{PROOF_CHECKER_URL}/generate-proof",
                            json={
                                "gamma": nd_puzzle["gamma"],
                                "phi": nd_puzzle["phi"],
                                "proof": ""
                            },
                            timeout=10.0
                        )
                        
                        if response.status_code == 200:
                            result = response.json()
                            if "proof" in result:
                                nd_puzzle["machine_proof"] = result["proof"]
                except Exception as e:
                    logger.error(f"Error generating proof: {str(e)}")
                
                # Create puzzle
                puzzle = PuzzleCreate(
                    gamma=nd_puzzle["gamma"],
                    phi=nd_puzzle["phi"],
                    difficulty=nd_puzzle["difficulty"],
                    best_len=nd_puzzle["best_len"],
                    machine_proof=nd_puzzle.get("machine_proof")
                )
                
                return puzzle
    
    return None

async def generate_puzzle_batch(count: int, min_difficulty: int = 1, max_difficulty: int = 10):
    """Generate a batch of puzzles."""
    created_count = 0
    
    for _ in range(count):
        puzzle = await generate_nd_puzzle()
        
        if puzzle and min_difficulty <= puzzle.difficulty <= max_difficulty:
            puzzle_id = create_puzzle(puzzle)
            
            if puzzle_id:
                created_count += 1
    
    return created_count

@app.get("/")
async def read_root():
    return {"message": "LogicArena Puzzle Service"}

@app.get("/random")
async def get_random_puzzle_endpoint(
    difficulty: Optional[int] = Query(None, ge=1, le=10)
):
    """Get a random puzzle."""
    puzzle = get_random_puzzle(difficulty)
    
    if not puzzle:
        raise HTTPException(
            status_code=404,
            detail="No puzzles found matching the criteria"
        )
    
    return puzzle

@app.post("/generate", status_code=201)
async def generate_puzzle_endpoint(
    background_tasks: BackgroundTasks
):
    """Generate a new puzzle."""
    puzzle = await generate_nd_puzzle()
    
    if not puzzle:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate puzzle"
        )
    
    puzzle_id = create_puzzle(puzzle)
    
    if not puzzle_id:
        raise HTTPException(
            status_code=500,
            detail="Failed to store puzzle"
        )
    
    # Return created puzzle
    return {
        "id": puzzle_id,
        "gamma": puzzle.gamma,
        "phi": puzzle.phi,
        "difficulty": puzzle.difficulty,
        "best_len": puzzle.best_len
    }

@app.post("/generate-batch")
async def generate_batch_endpoint(
    batch: PuzzleBatch,
    background_tasks: BackgroundTasks
):
    """Generate a batch of puzzles in the background."""
    background_tasks.add_task(
        generate_puzzle_batch,
        batch.count,
        batch.min_difficulty,
        batch.max_difficulty
    )
    
    return {"message": f"Generating {batch.count} puzzles in the background"}

@app.get("/count")
async def get_puzzle_count(
    difficulty: Optional[int] = Query(None, ge=1, le=10)
):
    """Get the count of puzzles in the database."""
    try:
        conn = get_db_connection()
        
        with conn.cursor() as cur:
            query = "SELECT COUNT(*) FROM puzzle"
            params = []
            
            if difficulty:
                query += " WHERE difficulty = %s"
                params.append(difficulty)
            
            cur.execute(query, params)
            count = cur.fetchone()[0]
            
            return {"count": count}
    
    except Exception as e:
        logger.error(f"Error getting puzzle count: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get puzzle count"
        )
    
    finally:
        close_db_connection(conn)

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check database
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            if cur.fetchone()[0] != 1:
                return {"status": "unhealthy", "detail": "Database check failed"}
        
        # Check proof-checker
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{PROOF_CHECKER_URL}/health", timeout=2.0)
            if response.status_code != 200:
                return {"status": "degraded", "detail": "Proof-checker service unavailable"}
        
        return {"status": "healthy", "timestamp": time.time()}
    
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {"status": "unhealthy", "detail": str(e)}
    
    finally:
        close_db_connection(conn)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True) 