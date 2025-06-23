"""
Test countermodel generation functionality
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import tempfile
import os
import subprocess
from app import CountermodelGenerator


class TestCountermodelGeneration:
    """Test countermodel generation with SAT solver"""
    
    def setup_method(self):
        self.generator = CountermodelGenerator()
    
    def test_premise_parsing(self):
        """Test parsing of premises for countermodel generation"""
        # Simple premises
        gamma = "P, Q, R"
        phi = "P & Q & R"
        
        # Mock the subprocess to simulate SAT solver
        with patch('subprocess.run') as mock_run:
            # Simulate UNSAT (premises entail conclusion)
            mock_result = Mock()
            mock_result.returncode = 0
            mock_run.return_value = mock_result
            
            # Create mock result file
            with patch('builtins.open', create=True) as mock_open:
                mock_file = MagicMock()
                mock_file.readlines.return_value = ['UNSAT\n']
                mock_open.return_value.__enter__.return_value = mock_file
                
                result = self.generator.generate_countermodel(gamma, phi)
                assert result is None  # No countermodel when UNSAT
    
    def test_countermodel_found(self):
        """Test when a countermodel is found"""
        gamma = "P -> Q"
        phi = "Q -> P"  # Not entailed
        
        with patch('subprocess.run') as mock_run:
            # Simulate SAT (countermodel exists)
            mock_result = Mock()
            mock_result.returncode = 0
            mock_run.return_value = mock_result
            
            # Create mock result file with satisfying assignment
            with patch('builtins.open', create=True) as mock_open:
                mock_file = MagicMock()
                # Assume P=1 (true), Q=2 (false) in variable mapping
                mock_file.readlines.return_value = ['SAT\n', '1 -2 0\n']
                mock_open.return_value.__enter__.return_value = mock_file
                
                # Mock the CNF converter to return proper variable mapping
                with patch.object(self.generator.cnf_converter, 'convert_formula_set') as mock_convert:
                    mock_convert.return_value = (
                        [[1, 2], [-1, -2]],  # Mock clauses
                        {'P': 1, 'Q': 2},    # Variable mapping
                        2                     # Number of variables
                    )
                    
                    result = self.generator.generate_countermodel(gamma, phi)
                    assert result is not None
                    assert result['P'] == True
                    assert result['Q'] == False
    
    def test_complex_countermodel(self):
        """Test countermodel for complex formulas"""
        gamma = "(P -> Q) & (Q -> R)"
        phi = "P -> R"  # Should be entailed (no countermodel)
        
        with patch('subprocess.run') as mock_run:
            mock_result = Mock()
            mock_result.returncode = 0
            mock_run.return_value = mock_result
            
            with patch('builtins.open', create=True) as mock_open:
                mock_file = MagicMock()
                mock_file.readlines.return_value = ['UNSAT\n']
                mock_open.return_value.__enter__.return_value = mock_file
                
                result = self.generator.generate_countermodel(gamma, phi)
                assert result is None
    
    def test_empty_premises(self):
        """Test countermodel generation with empty premises"""
        gamma = ""
        phi = "P"  # Not a tautology, should have countermodel
        
        with patch('subprocess.run') as mock_run:
            mock_result = Mock()
            mock_result.returncode = 0
            mock_run.return_value = mock_result
            
            with patch('builtins.open', create=True) as mock_open:
                mock_file = MagicMock()
                mock_file.readlines.return_value = ['SAT\n', '-1 0\n']
                mock_open.return_value.__enter__.return_value = mock_file
                
                with patch.object(self.generator.cnf_converter, 'convert_formula_set') as mock_convert:
                    mock_convert.return_value = (
                        [[-1]],           # Negated P
                        {'P': 1},         # Variable mapping
                        1                 # Number of variables
                    )
                    
                    result = self.generator.generate_countermodel(gamma, phi)
                    assert result is not None
                    assert result['P'] == False
    
    def test_minisat_timeout(self):
        """Test handling of SAT solver timeout"""
        gamma = "P"
        phi = "Q"
        
        with patch('subprocess.run') as mock_run:
            # Simulate timeout
            mock_run.side_effect = subprocess.TimeoutExpired('minisat', 5)
            
            result = self.generator.generate_countermodel(gamma, phi)
            assert result is None  # Should return None on timeout
    
    def test_minisat_not_found(self):
        """Test handling when minisat is not installed"""
        gamma = "P"
        phi = "Q"
        
        with patch('subprocess.run') as mock_run:
            # Simulate minisat not found
            mock_run.side_effect = FileNotFoundError()
            
            with patch.object(self.generator.cnf_converter, 'convert_formula_set') as mock_convert:
                mock_convert.return_value = (
                    [[1], [-2]],
                    {'P': 1, 'Q': 2},
                    2
                )
                
                result = self.generator.generate_countermodel(gamma, phi)
                # Should return mock countermodel when minisat not found
                assert result is not None
                assert 'P' in result
                assert 'Q' in result
                assert result['P'] == False
                assert result['Q'] == False
    
    def test_file_cleanup(self):
        """Test that temporary files are cleaned up"""
        gamma = "P"
        phi = "Q"
        
        temp_files = []
        
        # Track created temporary files
        original_temp = tempfile.NamedTemporaryFile
        def track_temp(*args, **kwargs):
            f = original_temp(*args, **kwargs)
            temp_files.append(f.name)
            return f
        
        with patch('tempfile.NamedTemporaryFile', side_effect=track_temp):
            with patch('subprocess.run') as mock_run:
                mock_result = Mock()
                mock_result.returncode = 0
                mock_run.return_value = mock_result
                
                with patch('builtins.open', create=True) as mock_open:
                    mock_file = MagicMock()
                    mock_file.readlines.return_value = ['SAT\n', '1 -2 0\n']
                    mock_open.return_value.__enter__.return_value = mock_file
                    
                    with patch('os.unlink') as mock_unlink:
                        self.generator.generate_countermodel(gamma, phi)
                        
                        # Check that unlink was called for temp files
                        assert mock_unlink.call_count >= 2  # DIMACS and result file
    
    def test_invalid_sat_output(self):
        """Test handling of invalid SAT solver output"""
        gamma = "P"
        phi = "Q"
        
        with patch('subprocess.run') as mock_run:
            mock_result = Mock()
            mock_result.returncode = 0
            mock_run.return_value = mock_result
            
            # Test various invalid outputs
            invalid_outputs = [
                [],  # Empty output
                ['INVALID\n'],  # Invalid status
                ['SAT\n'],  # Missing assignment
                ['SAT\n', 'garbage data\n'],  # Invalid assignment format
            ]
            
            for output in invalid_outputs:
                with patch('builtins.open', create=True) as mock_open:
                    mock_file = MagicMock()
                    mock_file.readlines.return_value = output
                    mock_open.return_value.__enter__.return_value = mock_file
                    
                    result = self.generator.generate_countermodel(gamma, phi)
                    # Should handle gracefully
                    assert result is None or isinstance(result, dict)
    
    def test_complex_formula_with_parentheses(self):
        """Test countermodel for formulas with complex parentheses"""
        gamma = "((P -> Q) & (Q -> R)) & ((R -> S) & (S -> T))"
        phi = "P -> T"
        
        with patch('subprocess.run') as mock_run:
            mock_result = Mock()
            mock_result.returncode = 0
            mock_run.return_value = mock_result
            
            with patch('builtins.open', create=True) as mock_open:
                mock_file = MagicMock()
                # This should be UNSAT (entailed)
                mock_file.readlines.return_value = ['UNSAT\n']
                mock_open.return_value.__enter__.return_value = mock_file
                
                result = self.generator.generate_countermodel(gamma, phi)
                assert result is None
    
    def test_biconditional_countermodel(self):
        """Test countermodel for biconditional formulas"""
        gamma = "P <-> Q"
        phi = "P & ~Q"  # Contradicts the biconditional
        
        with patch('subprocess.run') as mock_run:
            mock_result = Mock()
            mock_result.returncode = 0
            mock_run.return_value = mock_result
            
            with patch('builtins.open', create=True) as mock_open:
                mock_file = MagicMock()
                mock_file.readlines.return_value = ['UNSAT\n']
                mock_open.return_value.__enter__.return_value = mock_file
                
                result = self.generator.generate_countermodel(gamma, phi)
                assert result is None  # Should be UNSAT
    
    def test_tautology_checking(self):
        """Test checking if a formula is a tautology"""
        gamma = ""  # No premises
        phi = "P | ~P"  # Tautology
        
        with patch('subprocess.run') as mock_run:
            mock_result = Mock()
            mock_result.returncode = 0
            mock_run.return_value = mock_result
            
            with patch('builtins.open', create=True) as mock_open:
                mock_file = MagicMock()
                # Negated tautology should be UNSAT
                mock_file.readlines.return_value = ['UNSAT\n']
                mock_open.return_value.__enter__.return_value = mock_file
                
                result = self.generator.generate_countermodel(gamma, phi)
                assert result is None  # No countermodel for tautology
    
    def test_many_variables(self):
        """Test countermodel with many propositional variables"""
        # Create formula with many variables
        vars = [f"P{i}" for i in range(10)]
        gamma = " & ".join(vars[:5])  # P0 & P1 & P2 & P3 & P4
        phi = " & ".join(vars[5:])    # P5 & P6 & P7 & P8 & P9
        
        with patch('subprocess.run') as mock_run:
            mock_result = Mock()
            mock_result.returncode = 0
            mock_run.return_value = mock_result
            
            with patch('builtins.open', create=True) as mock_open:
                mock_file = MagicMock()
                # Should be satisfiable (premises don't entail conclusion)
                assignments = ' '.join([str(i+1) for i in range(5)] + [str(-(i+6)) for i in range(5)])
                mock_file.readlines.return_value = ['SAT\n', f'{assignments} 0\n']
                mock_open.return_value.__enter__.return_value = mock_file
                
                with patch.object(self.generator.cnf_converter, 'convert_formula_set') as mock_convert:
                    var_map = {f'P{i}': i+1 for i in range(10)}
                    mock_convert.return_value = (
                        [[1], [2], [3], [4], [5], [-6], [-7], [-8], [-9], [-10]],
                        var_map,
                        10
                    )
                    
                    result = self.generator.generate_countermodel(gamma, phi)
                    assert result is not None
                    # First 5 should be true, last 5 should be false
                    for i in range(5):
                        assert result[f'P{i}'] == True
                    for i in range(5, 10):
                        assert result[f'P{i}'] == False


class TestCountermodelSecurity:
    """Test security aspects of countermodel generation"""
    
    def setup_method(self):
        self.generator = CountermodelGenerator()
    
    def test_path_validation(self):
        """Test that file paths are validated"""
        gamma = "P"
        phi = "Q"
        
        with patch('tempfile.NamedTemporaryFile') as mock_temp:
            # Create mock files with suspicious paths
            mock_dimacs = Mock()
            mock_dimacs.name = "/etc/passwd"  # Suspicious path
            mock_result = Mock()
            mock_result.name = "/tmp/safe.txt"
            
            mock_temp.side_effect = [mock_dimacs, mock_result]
            
            with patch('subprocess.run') as mock_run:
                # The generator should validate paths and raise an error
                result = self.generator.generate_countermodel(gamma, phi)
                # Should handle the error gracefully
                assert result is None
    
    def test_subprocess_safety(self):
        """Test that subprocess calls are safe"""
        gamma = "P; rm -rf /"  # Attempted injection
        phi = "Q"
        
        with patch('subprocess.run') as mock_run:
            mock_result = Mock()
            mock_result.returncode = 0
            mock_run.return_value = mock_result
            
            # The formula should be processed safely without executing commands
            with patch('builtins.open', create=True) as mock_open:
                mock_file = MagicMock()
                mock_file.readlines.return_value = ['SAT\n', '1 -2 0\n']
                mock_open.return_value.__enter__.return_value = mock_file
                
                # Should process safely
                result = self.generator.generate_countermodel(gamma, phi)
                
                # Check that minisat was called with safe arguments
                if mock_run.called:
                    args = mock_run.call_args[0][0]
                    assert args[0] == 'minisat'
                    # File paths should be in temp directory
                    assert '/tmp' in args[1] or tempfile.gettempdir() in args[1]
                    assert '/tmp' in args[2] or tempfile.gettempdir() in args[2]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])