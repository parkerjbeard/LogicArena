import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import AsyncMock, patch, MagicMock
import json

from app.models import User
from app.config import settings


@pytest.mark.asyncio
class TestAdminProofTesting:
    """Test suite for admin proof testing endpoints"""
    
    @pytest.fixture
    async def admin_user(self):
        """Create a mock admin user"""
        user = MagicMock(spec=User)
        user.id = 1
        user.handle = "admin"
        user.email = "admin@test.com"
        user.is_admin = True
        user.is_active = True
        return user
    
    @pytest.fixture
    async def non_admin_user(self):
        """Create a mock non-admin user"""
        user = MagicMock(spec=User)
        user.id = 2
        user.handle = "user"
        user.email = "user@test.com"
        user.is_admin = False
        user.is_active = True
        return user
    
    async def test_proof_test_endpoint_success(self, client: AsyncClient, admin_user):
        """Test successful proof validation"""
        # Mock authentication
        with patch('app.auth.utils.get_current_admin_user', return_value=admin_user):
            # Mock proof checker response
            proof_checker_response = {
                "ok": True,
                "lines": 5,
                "depth": 2,
                "syntax_info": "Carnap-compatible Fitch notation detected",
                "details": {
                    "rules_used": ["MP", "&I", "->E"],
                    "optimality": {
                        "actual_length": 5,
                        "redundant_steps": [],
                        "optimality_score": 100,
                        "efficiency_ratio": 100
                    },
                    "suggestions": ["Consider using conditional proof for deriving conditionals"]
                }
            }
            
            with patch('httpx.AsyncClient.post') as mock_post:
                mock_response = AsyncMock()
                mock_response.json.return_value = proof_checker_response
                mock_post.return_value = mock_response
                
                response = await client.post(
                    "/api/admin/test-proof",
                    json={
                        "gamma": "P, P -> Q",
                        "phi": "Q",
                        "proof": "P :PR\nP -> Q :PR\nQ :MP 1,2",
                        "best_len": 3
                    }
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["valid"] is True
                assert data["lines"] == 5
                assert data["depth"] == 2
                assert "MP" in data["rules_used"]
                assert data["optimality"]["optimality_score"] == 100
    
    async def test_proof_test_endpoint_invalid_proof(self, client: AsyncClient, admin_user):
        """Test invalid proof validation"""
        with patch('app.auth.utils.get_current_admin_user', return_value=admin_user):
            proof_checker_response = {
                "ok": False,
                "error": "Line 3: Invalid Modus Ponens - need conditional and its antecedent",
                "lines": 3,
                "depth": 1,
                "details": {
                    "rules_used": ["PR"],
                    "optimality": None,
                    "suggestions": []
                }
            }
            
            with patch('httpx.AsyncClient.post') as mock_post:
                mock_response = AsyncMock()
                mock_response.json.return_value = proof_checker_response
                mock_post.return_value = mock_response
                
                response = await client.post(
                    "/api/admin/test-proof",
                    json={
                        "gamma": "P, Q -> R",
                        "phi": "R",
                        "proof": "P :PR\nQ -> R :PR\nR :MP 1,2"
                    }
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["valid"] is False
                assert "Invalid Modus Ponens" in data["error"]
    
    async def test_proof_test_endpoint_non_admin(self, client: AsyncClient, non_admin_user):
        """Test that non-admin users cannot access proof testing"""
        with patch('app.auth.utils.get_current_admin_user', side_effect=Exception("Not authorized")):
            response = await client.post(
                "/api/admin/test-proof",
                json={
                    "gamma": "P",
                    "phi": "P",
                    "proof": "P :PR"
                }
            )
            
            # Should get 401 or 403 depending on auth implementation
            assert response.status_code in [401, 403, 422]
    
    async def test_puzzle_test_endpoint_valid_puzzle(self, client: AsyncClient, admin_user):
        """Test valid puzzle configuration"""
        with patch('app.auth.utils.get_current_admin_user', return_value=admin_user):
            # Mock solve response
            solve_response = {
                "success": True,
                "proof": "P :PR\nP -> Q :PR\nQ :MP 1,2",
                "length": 3,
                "message": "Proof found successfully"
            }
            
            with patch('httpx.AsyncClient.post') as mock_post:
                mock_response = AsyncMock()
                mock_response.json.return_value = solve_response
                mock_post.return_value = mock_response
                
                response = await client.post(
                    "/api/admin/test-puzzle",
                    json={
                        "gamma": "P, P -> Q",
                        "phi": "Q",
                        "difficulty": 1,
                        "best_len": 3,
                        "generate_proof": True
                    }
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["valid"] is True
                assert data["solvable"] is True
                assert data["actual_best_len"] == 3
                assert data["best_len_matches"] is True
                assert data["machine_proof"] is not None
    
    async def test_puzzle_test_endpoint_unsolvable(self, client: AsyncClient, admin_user):
        """Test unsolvable puzzle detection"""
        with patch('app.auth.utils.get_current_admin_user', return_value=admin_user):
            # Mock failed solve response
            solve_response = {
                "success": False,
                "proof": None,
                "length": None,
                "message": "No proof found within depth limit"
            }
            
            # Mock verify response with counter-model
            verify_response = {
                "ok": False,
                "error": "Proof does not establish the required conclusion",
                "counterModel": {"P": True, "Q": False}
            }
            
            with patch('httpx.AsyncClient.post') as mock_post:
                mock_response1 = AsyncMock()
                mock_response1.json.return_value = solve_response
                
                mock_response2 = AsyncMock()
                mock_response2.json.return_value = verify_response
                
                mock_post.side_effect = [mock_response1, mock_response2]
                
                response = await client.post(
                    "/api/admin/test-puzzle",
                    json={
                        "gamma": "P",
                        "phi": "Q",
                        "difficulty": 1,
                        "best_len": 1,
                        "generate_proof": False
                    }
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["valid"] is False
                assert data["solvable"] is False
                assert data["counter_model"] == {"P": True, "Q": False}
                assert "unsolvable" in data["warnings"][0].lower()
    
    async def test_puzzle_test_endpoint_length_mismatch(self, client: AsyncClient, admin_user):
        """Test puzzle with incorrect best_len claim"""
        with patch('app.auth.utils.get_current_admin_user', return_value=admin_user):
            solve_response = {
                "success": True,
                "proof": "P :PR\nP -> Q :PR\nQ :MP 1,2",
                "length": 3,
                "message": "Proof found successfully"
            }
            
            with patch('httpx.AsyncClient.post') as mock_post:
                mock_response = AsyncMock()
                mock_response.json.return_value = solve_response
                mock_post.return_value = mock_response
                
                response = await client.post(
                    "/api/admin/test-puzzle",
                    json={
                        "gamma": "P, P -> Q",
                        "phi": "Q",
                        "difficulty": 2,
                        "best_len": 5,  # Claiming it takes 5 steps when it only takes 3
                        "generate_proof": False
                    }
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["valid"] is True
                assert data["solvable"] is True
                assert data["actual_best_len"] == 3
                assert data["best_len_matches"] is False
                assert any("shorter proof" in w for w in data["warnings"])
    
    async def test_puzzle_test_endpoint_difficulty_warnings(self, client: AsyncClient, admin_user):
        """Test puzzle difficulty warnings"""
        with patch('app.auth.utils.get_current_admin_user', return_value=admin_user):
            solve_response = {
                "success": True,
                "proof": "P :PR",
                "length": 1,
                "message": "Proof found successfully"
            }
            
            with patch('httpx.AsyncClient.post') as mock_post:
                mock_response = AsyncMock()
                mock_response.json.return_value = solve_response
                mock_post.return_value = mock_response
                
                response = await client.post(
                    "/api/admin/test-puzzle",
                    json={
                        "gamma": "P",
                        "phi": "P",
                        "difficulty": 5,  # High difficulty for trivial puzzle
                        "best_len": 1,
                        "generate_proof": False
                    }
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["valid"] is True
                # Should warn about trivial puzzle
                assert any("trivial" in w.lower() for w in data["warnings"])
    
    async def test_proof_test_endpoint_proof_checker_unavailable(self, client: AsyncClient, admin_user):
        """Test handling when proof checker service is unavailable"""
        with patch('app.auth.utils.get_current_admin_user', return_value=admin_user):
            with patch('httpx.AsyncClient.post', side_effect=Exception("Connection refused")):
                response = await client.post(
                    "/api/admin/test-proof",
                    json={
                        "gamma": "P",
                        "phi": "P",
                        "proof": "P :PR"
                    }
                )
                
                assert response.status_code == 503
                assert "unavailable" in response.json()["detail"].lower()
    
    async def test_puzzle_test_endpoint_complex_premises(self, client: AsyncClient, admin_user):
        """Test puzzle with many premises generates warning"""
        with patch('app.auth.utils.get_current_admin_user', return_value=admin_user):
            solve_response = {
                "success": True,
                "proof": "long proof...",
                "length": 10,
                "message": "Proof found successfully"
            }
            
            with patch('httpx.AsyncClient.post') as mock_post:
                mock_response = AsyncMock()
                mock_response.json.return_value = solve_response
                mock_post.return_value = mock_response
                
                response = await client.post(
                    "/api/admin/test-puzzle",
                    json={
                        "gamma": "P, Q, R, S, T, U, V",  # 7 premises
                        "phi": "P & Q",
                        "difficulty": 3,
                        "best_len": 10,
                        "generate_proof": False
                    }
                )
                
                assert response.status_code == 200
                data = response.json()
                assert any("High number of premises" in w for w in data["warnings"])
    
    async def test_proof_test_counter_model(self, client: AsyncClient, admin_user):
        """Test proof test returns counter-model for invalid sequent"""
        with patch('app.auth.utils.get_current_admin_user', return_value=admin_user):
            proof_checker_response = {
                "ok": False,
                "error": "Proof does not establish the required conclusion",
                "counterModel": {"P": True, "Q": False, "R": True}
            }
            
            with patch('httpx.AsyncClient.post') as mock_post:
                mock_response = AsyncMock()
                mock_response.json.return_value = proof_checker_response
                mock_post.return_value = mock_response
                
                response = await client.post(
                    "/api/admin/test-proof",
                    json={
                        "gamma": "P -> Q, R",
                        "phi": "Q",
                        "proof": "P -> Q :PR\nR :PR\nQ :Invalid"
                    }
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["valid"] is False
                assert data["counter_model"] == {"P": True, "Q": False, "R": True}


@pytest.mark.asyncio
class TestProofTestingIntegration:
    """Integration tests for proof testing with actual proof checker"""
    
    @pytest.mark.integration
    async def test_full_proof_validation_flow(self, client: AsyncClient, admin_user):
        """Test complete flow from puzzle creation to validation"""
        with patch('app.auth.utils.get_current_admin_user', return_value=admin_user):
            # First test the puzzle
            puzzle_test_response = await client.post(
                "/api/admin/test-puzzle",
                json={
                    "gamma": "P ∨ Q, P → R, Q → S",
                    "phi": "R ∨ S",
                    "difficulty": 3,
                    "best_len": 5,
                    "generate_proof": True
                }
            )
            
            assert puzzle_test_response.status_code == 200
            puzzle_data = puzzle_test_response.json()
            
            if puzzle_data["solvable"] and puzzle_data["machine_proof"]:
                # Test the generated proof
                proof_test_response = await client.post(
                    "/api/admin/test-proof",
                    json={
                        "gamma": "P ∨ Q, P → R, Q → S",
                        "phi": "R ∨ S",
                        "proof": puzzle_data["machine_proof"],
                        "best_len": puzzle_data["actual_best_len"]
                    }
                )
                
                assert proof_test_response.status_code == 200
                proof_data = proof_test_response.json()
                assert proof_data["valid"] is True