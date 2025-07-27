"""
Puzzle verification service integration for the gateway
Provides efficient verification with caching and async processing
"""

import asyncio
import httpx
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as redis
from app.config import settings
from app.models import Puzzle, PuzzleVerificationLog

logger = logging.getLogger(__name__)

@dataclass
class VerificationResult:
    """Result of puzzle verification"""
    valid: bool
    errors: List[str]
    template_proof_valid: bool = False
    optimal_length: Optional[int] = None
    optimal_proof: Optional[str] = None
    alternative_proofs: List[str] = None
    actual_difficulty: Optional[int] = None
    verification_time_ms: int = 0
    metadata: Dict = None

class PuzzleVerificationService:
    """
    High-performance puzzle verification service with caching
    """
    
    def __init__(self):
        self.proof_checker_url = settings.PROOF_CHECKER_URL
        self._http_client = None
        self._redis_client = None
        self._cache_enabled = settings.VERIFICATION_CACHE_ENABLED
        self._cache_ttl = settings.VERIFICATION_CACHE_TTL  # seconds
        
    async def __aenter__(self):
        """Async context manager entry"""
        self._http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20)
        )
        
        if self._cache_enabled:
            try:
                self._redis_client = await redis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True
                )
                await self._redis_client.ping()
                logger.info("Redis cache connected for puzzle verification")
            except Exception as e:
                logger.warning(f"Redis cache unavailable: {e}")
                self._cache_enabled = False
                
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self._http_client:
            await self._http_client.aclose()
        if self._redis_client:
            await self._redis_client.close()
    
    def _get_cache_key(self, premises: List[str], conclusion: str) -> str:
        """Generate cache key for a puzzle"""
        # Create a deterministic key from premises and conclusion
        premises_str = "|".join(sorted(premises))
        return f"puzzle_verify:{hash(f'{premises_str}:{conclusion}')}"
    
    async def _get_cached_result(self, cache_key: str) -> Optional[VerificationResult]:
        """Get cached verification result"""
        if not self._cache_enabled or not self._redis_client:
            return None
            
        try:
            cached = await self._redis_client.get(cache_key)
            if cached:
                data = json.loads(cached)
                return VerificationResult(**data)
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            
        return None
    
    async def _cache_result(self, cache_key: str, result: VerificationResult):
        """Cache verification result"""
        if not self._cache_enabled or not self._redis_client:
            return
            
        try:
            data = {
                "valid": result.valid,
                "errors": result.errors,
                "template_proof_valid": result.template_proof_valid,
                "optimal_length": result.optimal_length,
                "optimal_proof": result.optimal_proof,
                "alternative_proofs": result.alternative_proofs,
                "actual_difficulty": result.actual_difficulty,
                "verification_time_ms": result.verification_time_ms,
                "metadata": result.metadata
            }
            await self._redis_client.setex(
                cache_key,
                self._cache_ttl,
                json.dumps(data)
            )
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
    
    async def verify_puzzle(self, puzzle: Puzzle) -> VerificationResult:
        """
        Verify a single puzzle with caching
        """
        premises = [p.strip() for p in puzzle.gamma.split(',')]
        
        # Check cache first
        cache_key = self._get_cache_key(premises, puzzle.phi)
        cached_result = await self._get_cached_result(cache_key)
        if cached_result:
            logger.debug(f"Cache hit for puzzle {puzzle.id}")
            return cached_result
        
        # Perform verification
        errors = []
        start_time = datetime.now()
        
        # Validate syntax
        if self._is_trivial(premises, puzzle.phi):
            errors.append("Puzzle is trivial - conclusion is already a premise")
            return VerificationResult(
                valid=False,
                errors=errors,
                verification_time_ms=self._elapsed_ms(start_time)
            )
        
        # Verify template proof if provided
        template_valid = False
        if puzzle.machine_proof:
            template_result = await self._verify_proof(
                premises,
                puzzle.phi,
                puzzle.machine_proof
            )
            template_valid = template_result["valid"]
            if not template_valid:
                errors.append(f"Template proof is invalid: {template_result.get('error', 'Unknown error')}")
        
        # Find optimal proof
        optimal_result = await self._find_optimal_proof(premises, puzzle.phi)
        
        # Calculate difficulty
        actual_difficulty = self._calculate_difficulty(
            optimal_result["length"] if optimal_result["found"] else puzzle.best_len,
            len(premises),
            self._count_operators(puzzle.phi)
        )
        
        # Determine validity
        valid = (
            len(errors) == 0 and
            optimal_result["found"] and
            (not puzzle.machine_proof or template_valid)
        )
        
        if not optimal_result["found"]:
            errors.append("Could not find any valid proof for this puzzle")
        
        result = VerificationResult(
            valid=valid,
            errors=errors,
            template_proof_valid=template_valid,
            optimal_length=optimal_result["length"] if optimal_result["found"] else None,
            optimal_proof=optimal_result["proof"] if optimal_result["found"] else None,
            actual_difficulty=actual_difficulty,
            verification_time_ms=self._elapsed_ms(start_time),
            metadata={
                "solver_method": optimal_result.get("method", "unknown"),
                "cached": False
            }
        )
        
        # Cache the result
        await self._cache_result(cache_key, result)
        
        return result
    
    def _is_trivial(self, premises: List[str], conclusion: str) -> bool:
        """Check if puzzle is trivial"""
        return conclusion in premises
    
    async def _verify_proof(self, premises: List[str], conclusion: str, proof: str) -> Dict:
        """Verify a proof using the proof-checker service"""
        try:
            response = await self._http_client.post(
                f"{self.proof_checker_url}/verify",
                json={
                    "gamma": ", ".join(premises),
                    "phi": conclusion,
                    "proof": proof
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "valid": result.get("ok", False),
                    "error": result.get("error"),
                    "lines": result.get("lines", 0)
                }
            else:
                return {
                    "valid": False,
                    "error": f"HTTP {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error verifying proof: {e}")
            return {
                "valid": False,
                "error": str(e)
            }
    
    async def _find_optimal_proof(self, premises: List[str], conclusion: str) -> Dict:
        """Find optimal proof using the solver endpoint"""
        try:
            response = await self._http_client.post(
                f"{self.proof_checker_url}/solve",
                json={
                    "gamma": ", ".join(premises),
                    "phi": conclusion,
                    "proof": ""
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("found"):
                    return {
                        "found": True,
                        "proof": result["proof"],
                        "length": result["length"],
                        "method": result.get("method", "machine_solver")
                    }
            
            return {"found": False}
            
        except Exception as e:
            logger.error(f"Error finding optimal proof: {e}")
            return {"found": False, "error": str(e)}
    
    def _calculate_difficulty(self, proof_length: int, num_premises: int, complexity: int) -> int:
        """Calculate puzzle difficulty based on various factors"""
        base_difficulty = proof_length * 0.5 + num_premises * 0.3 + complexity * 0.2
        
        if base_difficulty <= 2:
            return 1
        elif base_difficulty <= 4:
            return 2
        elif base_difficulty <= 6:
            return 3
        elif base_difficulty <= 8:
            return 4
        elif base_difficulty <= 10:
            return 5
        elif base_difficulty <= 12:
            return 6
        elif base_difficulty <= 15:
            return 7
        elif base_difficulty <= 18:
            return 8
        elif base_difficulty <= 22:
            return 9
        else:
            return 10
    
    def _count_operators(self, formula: str) -> int:
        """Count logical operators in a formula"""
        operators = ["→", "∧", "∨", "¬", "↔", "⊥", "∀", "∃"]
        count = 0
        for op in operators:
            count += formula.count(op)
        return count
    
    def _elapsed_ms(self, start_time: datetime) -> int:
        """Calculate elapsed time in milliseconds"""
        elapsed = datetime.now() - start_time
        return int(elapsed.total_seconds() * 1000)
    
    async def update_puzzle_verification(
        self,
        db: AsyncSession,
        puzzle: Puzzle,
        result: VerificationResult
    ):
        """Update puzzle with verification results in the database"""
        try:
            if result.valid:
                puzzle.verification_status = 'verified'
                puzzle.verified_at = datetime.utcnow()
                puzzle.actual_optimal_length = result.optimal_length
                puzzle.verification_metadata = {
                    "verification_time_ms": result.verification_time_ms,
                    "template_proof_valid": result.template_proof_valid,
                    "metadata": result.metadata
                }
                
                # Update machine proof if we found a better one
                if result.optimal_proof and (
                    not puzzle.machine_proof or 
                    result.optimal_length < puzzle.best_len
                ):
                    puzzle.machine_proof = result.optimal_proof
                    puzzle.best_len = result.optimal_length
                
                # Update difficulty if significantly different
                if result.actual_difficulty and abs(result.actual_difficulty - puzzle.difficulty) > 1:
                    puzzle.difficulty = result.actual_difficulty
                    
            else:
                puzzle.verification_status = 'failed'
                puzzle.verification_metadata = {
                    "errors": result.errors,
                    "verification_time_ms": result.verification_time_ms
                }
            
            # Create verification log entry
            log_entry = PuzzleVerificationLog(
                puzzle_id=puzzle.id,
                status='verified' if result.valid else 'failed',
                errors=result.errors if result.errors else None,
                optimal_length=result.optimal_length,
                optimal_proof=result.optimal_proof,
                verification_time_ms=result.verification_time_ms,
                metadata=result.metadata
            )
            
            db.add(log_entry)
            await db.commit()
            
        except Exception as e:
            logger.error(f"Error updating puzzle verification: {e}")
            await db.rollback()
            raise


class BatchPuzzleVerifier:
    """
    Efficient batch verification with concurrency control
    """
    
    def __init__(self, verification_service: PuzzleVerificationService, max_workers: int = 10):
        self.verification_service = verification_service
        self.max_workers = max_workers
        
    async def verify_batch(
        self,
        db: AsyncSession,
        puzzles: List[Puzzle],
        update_db: bool = True
    ) -> List[Tuple[Puzzle, VerificationResult]]:
        """
        Verify multiple puzzles concurrently
        """
        semaphore = asyncio.Semaphore(self.max_workers)
        
        async def verify_with_limit(puzzle):
            async with semaphore:
                try:
                    result = await self.verification_service.verify_puzzle(puzzle)
                    
                    if update_db:
                        await self.verification_service.update_puzzle_verification(
                            db, puzzle, result
                        )
                    
                    return (puzzle, result)
                except Exception as e:
                    logger.error(f"Verification failed for puzzle {puzzle.id}: {e}")
                    return (puzzle, VerificationResult(
                        valid=False,
                        errors=[f"Verification failed: {str(e)}"]
                    ))
        
        # Process all puzzles concurrently
        tasks = [verify_with_limit(puzzle) for puzzle in puzzles]
        results = await asyncio.gather(*tasks)
        
        return results


# Singleton instance for the application
verification_service = None

async def get_verification_service() -> PuzzleVerificationService:
    """Get or create the verification service singleton"""
    global verification_service
    if verification_service is None:
        verification_service = PuzzleVerificationService()
        await verification_service.__aenter__()
    return verification_service