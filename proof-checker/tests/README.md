# Proof Checker Tests

This directory contains comprehensive test suites for the LogicArena proof checker enhancements.

## Test Files

### Unit Tests

1. **test_quantifier_rules.py**
   - Tests for ∀I, ∀E, ∃I, ∃E rules
   - Variable substitution and capture avoidance
   - Formula parsing and normalization
   - Context tracking for arbitrary constants

2. **test_cnf_converter.py**
   - Formula parser tests (AST generation)
   - Tseitin transformation tests
   - CNF conversion for all connectives
   - Countermodel generation tests

3. **test_machine_solver.py**
   - Proof search algorithm tests
   - Forward and backward chaining
   - Optimal length verification
   - Various proof strategies

### Integration Tests

4. **test_api_integration.py**
   - API endpoint tests
   - Request/response validation
   - Error handling
   - Concurrent request handling

## Running Tests

### Install Dependencies
```bash
pip install -r requirements-test.txt
```

### Run All Tests
```bash
# From proof-checker directory
python run_all_tests.py
```

### Run Individual Test Files
```bash
# Run specific test file
pytest tests/test_quantifier_rules.py -v

# Run with coverage
pytest tests/test_cnf_converter.py --cov=cnf_converter

# Run specific test
pytest tests/test_machine_solver.py::TestMachineSolver::test_simple_modus_ponens -v
```

### Run API Tests
The API integration tests use FastAPI's TestClient, so you don't need to start the server:
```bash
pytest tests/test_api_integration.py -v
```

## Test Structure

Each test file follows this structure:
- Class-based organization for related tests
- `setup_method` for test initialization
- Descriptive test method names
- Comprehensive assertions
- Edge case coverage

## What's Tested

### Quantifier Rules
- ✓ Formula parsing with various notations
- ✓ Free variable extraction
- ✓ Variable substitution with capture avoidance
- ✓ All four quantifier rules (∀I, ∀E, ∃I, ∃E)
- ✓ Context checking for arbitrary constants

### CNF Converter
- ✓ Recursive descent parser
- ✓ AST construction for all connectives
- ✓ Operator precedence
- ✓ Tseitin transformation
- ✓ Variable mapping
- ✓ DIMACS format generation

### Machine Solver
- ✓ Formula structure parsing
- ✓ Proof state management
- ✓ Forward chaining (modus ponens, conjunction, etc.)
- ✓ Backward chaining (conditional proof, reductio)
- ✓ Proof search with depth limits
- ✓ Optimal length verification
- ✓ Cycle detection

### API Integration
- ✓ All endpoints (/verify, /solve, /verify-optimal)
- ✓ Request validation
- ✓ Error responses
- ✓ Unicode support
- ✓ Concurrent requests
- ✓ Large input handling

## Expected Results

All tests should pass. The test runner will provide:
- Number of passed/failed tests
- Execution time for each test file
- Detailed error messages for failures
- Summary statistics

## Troubleshooting

### Import Errors
Make sure you're running from the proof-checker directory or have added it to PYTHONPATH.

### Minisat Not Found
Some tests may skip if minisat is not installed. Install with:
```bash
# macOS
brew install minisat

# Ubuntu/Debian
sudo apt-get install minisat
```

### API Test Failures
Ensure no other service is running on port 5003.

## Adding New Tests

1. Create test file following naming convention: `test_*.py`
2. Import the module to test
3. Create test class with descriptive name
4. Write test methods starting with `test_`
5. Use pytest fixtures for setup/teardown if needed
6. Add to `run_all_tests.py` file list