"""
Integration tests for proof checker API endpoints
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import requests
import json
from fastapi.testclient import TestClient
from app import app

# Use TestClient for testing without running the server
client = TestClient(app)

class TestProofCheckerAPI:
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Proof Checker Service"
        assert "endpoints" in data
        assert "/verify" in data["endpoints"]
        assert "/solve" in data["endpoints"]
        assert "/verify-optimal" in data["endpoints"]
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "minisat_available" in data
    
    def test_syntax_guide_endpoint(self):
        """Test syntax guide endpoint"""
        response = client.get("/syntax-guide")
        assert response.status_code == 200
        data = response.json()
        assert "basic_structure" in data
        assert "justifications" in data
        assert "symbols" in data

class TestVerifyEndpoint:
    def test_valid_modus_ponens(self):
        """Test verifying valid modus ponens"""
        request_data = {
            "gamma": "P, P → Q",
            "phi": "Q",
            "proof": "Q :MP 2,1"
        }
        
        response = client.post("/verify", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert data["lines"] == 1
        assert data["error"] is None
    
    def test_invalid_proof(self):
        """Test verifying invalid proof"""
        request_data = {
            "gamma": "P → Q",
            "phi": "P",
            "proof": "P :MP 1"  # Invalid - can't derive P from P→Q
        }
        
        response = client.post("/verify", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == False
        assert data["error"] is not None
    
    def test_proof_with_assumptions(self):
        """Test proof with assumptions and subproofs"""
        request_data = {
            "gamma": "",
            "phi": "P → P",
            "proof": """show P → P
  P :AS
:CD 2"""
        }
        
        response = client.post("/verify", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
    
    def test_quantifier_rules(self):
        """Test quantifier rules work in API"""
        request_data = {
            "gamma": "∀x.P(x)",
            "phi": "P(a)",
            "proof": "P(a) :UE 1"
        }
        
        response = client.post("/verify", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
    
    def test_countermodel_generation(self):
        """Test countermodel is generated for invalid sequent"""
        request_data = {
            "gamma": "P → Q, Q",
            "phi": "P",
            "proof": "P :AS"  # Invalid inference
        }
        
        response = client.post("/verify", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == False
        # May have countermodel if minisat available
        if "counterModel" in data and data["counterModel"]:
            assert isinstance(data["counterModel"], dict)

class TestSolveEndpoint:
    def test_solve_simple(self):
        """Test solving simple proof"""
        request_data = {
            "gamma": "P, P → Q",
            "phi": "Q",
            "proof": ""  # Not used by solver
        }
        
        response = client.post("/solve", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["proof"] is not None
        assert data["length"] == 1
        assert "MP" in data["proof"]
    
    def test_solve_complex(self):
        """Test solving more complex proof"""
        request_data = {
            "gamma": "P → Q, Q → R",
            "phi": "P → R",
            "proof": ""
        }
        
        response = client.post("/solve", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["proof"] is not None
        assert "P → R" in data["proof"]
    
    def test_solve_no_proof(self):
        """Test when no proof exists"""
        request_data = {
            "gamma": "P → Q, Q",
            "phi": "P",
            "proof": ""
        }
        
        response = client.post("/solve", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["proof"] is None
    
    def test_solve_conjunction(self):
        """Test solving conjunction proof"""
        request_data = {
            "gamma": "P, Q",
            "phi": "P ∧ Q",
            "proof": ""
        }
        
        response = client.post("/solve", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "&I" in data["proof"]

class TestVerifyOptimalEndpoint:
    def test_verify_optimal_correct(self):
        """Test verifying correct optimal length"""
        request_data = {
            "premises": ["P", "P → Q"],
            "conclusion": "Q",
            "claimed_length": 1
        }
        
        response = client.post("/verify-optimal", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert data["found_length"] == 1
        assert data["is_optimal"] == True
    
    def test_verify_optimal_too_optimistic(self):
        """Test when claimed length is too optimistic"""
        request_data = {
            "premises": ["P → Q", "Q → R", "R → S"],
            "conclusion": "P → S",
            "claimed_length": 1  # Can't be done in 1 step
        }
        
        response = client.post("/verify-optimal", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert data["found_length"] > 1
        assert data["is_optimal"] == False
    
    def test_verify_optimal_invalid(self):
        """Test when no proof exists"""
        request_data = {
            "premises": ["P"],
            "conclusion": "Q",
            "claimed_length": 1
        }
        
        response = client.post("/verify-optimal", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False

class TestErrorHandling:
    def test_malformed_request(self):
        """Test handling malformed requests"""
        # Missing required fields
        request_data = {
            "gamma": "P"
            # Missing phi and proof
        }
        
        response = client.post("/verify", json=request_data)
        assert response.status_code == 422  # Validation error
    
    def test_empty_proof(self):
        """Test handling empty proof"""
        request_data = {
            "gamma": "P",
            "phi": "Q",
            "proof": ""
        }
        
        response = client.post("/verify", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == False
    
    def test_large_input(self):
        """Test handling large inputs"""
        # Create a very long premise list
        long_gamma = ", ".join([f"P{i}" for i in range(100)])
        
        request_data = {
            "gamma": long_gamma,
            "phi": "Q",
            "proof": "Q :AS"
        }
        
        response = client.post("/verify", json=request_data)
        assert response.status_code in [200, 422]  # Should handle gracefully
    
    def test_special_characters(self):
        """Test handling special characters"""
        request_data = {
            "gamma": "P → Q",
            "phi": "P",  # Invalid - can't derive P from P→Q
            "proof": "P :MP 1"
        }
        
        response = client.post("/verify", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == False

class TestUnicodeSupport:
    def test_unicode_symbols(self):
        """Test that Unicode logical symbols work"""
        request_data = {
            "gamma": "P ∧ Q",
            "phi": "P",
            "proof": "P :∧E 1"
        }
        
        response = client.post("/verify", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
    
    def test_mixed_notation(self):
        """Test mixed ASCII and Unicode notation"""
        request_data = {
            "gamma": "P & Q, Q -> R",  # Mixed notation
            "phi": "P ∧ R",
            "proof": """P :&E 1
Q :&E 1
R :MP 2,4
P ∧ R :∧I 3,5"""
        }
        
        response = client.post("/verify", json=request_data)
        assert response.status_code == 200

def test_concurrent_requests():
    """Test handling concurrent requests"""
    import concurrent.futures
    
    def make_request():
        request_data = {
            "gamma": "P, P → Q",
            "phi": "Q",
            "proof": "Q :MP 2,1"
        }
        return client.post("/verify", json=request_data)
    
    # Make 10 concurrent requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_request) for _ in range(10)]
        results = [f.result() for f in futures]
    
    # All should succeed
    assert all(r.status_code == 200 for r in results)
    assert all(r.json()["ok"] for r in results)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])