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

app = FastAPI(title="Proof Checker Service", version="3.0.0")

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
    proof: str  # Fitch-style proof (supports both syntaxes)
    syntax: Optional[str] = "auto"  # "carnap", "logicarena", or "auto"

class ProofResponse(BaseModel):
    ok: bool
    error: Optional[str] = None
    lines: Optional[int] = None
    depth: Optional[int] = None
    counterModel: Optional[Dict[str, bool]] = None
    details: Optional[Dict[str, Any]] = None
    detected_syntax: Optional[str] = None

class HybridFitchProofChecker:
    """Hybrid proof checker supporting both LogicArena and Carnap syntax"""
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.detected_syntax = None
        
    def detect_syntax(self, proof_text: str) -> str:
        """Detect which syntax is being used"""
        lines = proof_text.strip().split('\n')
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
                
            # Carnap indicators
            if ':' in stripped and not stripped.startswith('['):
                # Check if it's formula:justification pattern
                if re.match(r'^[^:\[]+:[^:\[]+$', stripped):
                    return "carnap"
            if stripped.lower().startswith('show'):
                return "carnap"
                
            # LogicArena indicators
            if '[' in stripped and ']' in stripped:
                # Check if it's formula [justification] pattern
                if re.match(r'^[^\[\]]+\[[^\[\]]+\]$', stripped):
                    return "logicarena"
            if stripped == '{' or stripped == '}':
                return "logicarena"
        
        # Default to LogicArena syntax
        return "logicarena"
    
    def validate_proof(self, gamma: str, phi: str, proof_text: str, syntax: str = "auto") -> ProofResponse:
        """Validate proof using appropriate syntax parser"""
        
        # Detect syntax if auto
        if syntax == "auto":
            self.detected_syntax = self.detect_syntax(proof_text)
        else:
            self.detected_syntax = syntax
        
        # Use appropriate checker
        if self.detected_syntax == "carnap":
            from app_carnap import CarnapFitchProofChecker
            checker = CarnapFitchProofChecker()
        else:
            from app import FitchProofChecker
            checker = FitchProofChecker()
        
        # Validate the proof
        response = checker.validate_proof(gamma, phi, proof_text)
        
        # Add detected syntax to response
        if response.details is None:
            response.details = {}
        response.detected_syntax = self.detected_syntax
        
        return response

# Reuse CountermodelGenerator from original
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
        "service": "Proof Checker Service (Hybrid)",
        "version": "3.0.0",
        "endpoints": [
            "/verify",
            "/health",
            "/syntax-examples"
        ],
        "supported_syntax": ["carnap", "logicarena", "auto"]
    }

@app.post("/verify", response_model=ProofResponse)
async def verify_proof(request: ProofRequest) -> ProofResponse:
    """Verify a natural deduction proof (supports both syntaxes)"""
    try:
        checker = HybridFitchProofChecker()
        response = checker.validate_proof(
            gamma=request.gamma,
            phi=request.phi,
            proof=request.proof,
            syntax=request.syntax if hasattr(request, 'syntax') else "auto"
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

@app.get("/syntax-examples")
async def get_syntax_examples():
    """Get examples of both supported syntaxes"""
    return {
        "modus_ponens": {
            "premises": "P→Q, P",
            "conclusion": "Q",
            "carnap_syntax": "Q    :MP 1,2",
            "logicarena_syntax": "Q [1,2 MP]"
        },
        "conditional_proof": {
            "premises": "",
            "conclusion": "P→P",
            "carnap_syntax": """Show P->P
    P    :AS
:CD 2""",
            "logicarena_syntax": """{
P [Assume]
}
P→P [1-2 →I]"""
        },
        "conjunction": {
            "premises": "P, Q",
            "conclusion": "P∧Q",
            "carnap_syntax": "P/\\Q    :&I 1,2",
            "logicarena_syntax": "P∧Q [1,2 ∧I]"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        result = subprocess.run(['which', 'minisat'], capture_output=True)
        minisat_available = result.returncode == 0
    except:
        minisat_available = False
    
    # Check if both syntax parsers are available
    syntax_support = {
        "carnap": False,
        "logicarena": False
    }
    
    try:
        from app_carnap import CarnapFitchProofChecker
        syntax_support["carnap"] = True
    except:
        pass
        
    try:
        from app import FitchProofChecker
        syntax_support["logicarena"] = True
    except:
        pass
    
    return {
        "status": "healthy",
        "service": "proof-checker",
        "minisat_available": minisat_available,
        "syntax_support": syntax_support
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5003)