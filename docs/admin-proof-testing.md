# Admin Proof Testing Feature

## Overview

The Admin Proof Testing feature allows administrators to validate puzzles and proofs before adding them to the LogicArena platform. This ensures puzzle quality and prevents unsolvable or incorrectly configured puzzles from being published.

## Features

### 1. Proof Validation (`/api/admin/test-proof`)

Test whether a given proof correctly establishes the conclusion from the premises.

**Features:**
- Validates proof syntax (Carnap Fitch notation)
- Checks inference rule applications
- Provides detailed error messages for invalid steps
- Calculates optimality metrics
- Suggests improvements for valid proofs
- Returns counter-models for invalid sequents

**Request:**
```json
{
  "gamma": "P, P → Q",    // Premises (comma-separated)
  "phi": "Q",             // Conclusion
  "proof": "P :PR\nP → Q :PR\nQ :MP 1,2",  // Proof text
  "best_len": 3           // Optional: expected optimal length
}
```

**Response:**
```json
{
  "valid": true,
  "error": null,
  "lines": 3,
  "depth": 1,
  "rules_used": ["PR", "MP"],
  "syntax_info": "Carnap-compatible Fitch notation detected",
  "optimality": {
    "actual_length": 3,
    "redundant_steps": [],
    "optimality_score": 100,
    "efficiency_ratio": 100
  },
  "suggestions": [],
  "counter_model": null
}
```

### 2. Puzzle Validation (`/api/admin/test-puzzle`)

Test whether a puzzle configuration is valid and solvable.

**Features:**
- Verifies premises entail conclusion
- Generates machine proofs
- Validates difficulty ratings
- Checks optimal proof length claims
- Provides warnings for puzzle design issues
- Returns counter-models for invalid puzzles

**Request:**
```json
{
  "gamma": "P ∨ Q, P → R, Q → S",
  "phi": "R ∨ S",
  "difficulty": 3,
  "best_len": 5,
  "generate_proof": true
}
```

**Response:**
```json
{
  "valid": true,
  "solvable": true,
  "machine_proof": "P ∨ Q :PR\n...",
  "actual_best_len": 5,
  "best_len_matches": true,
  "counter_model": null,
  "warnings": []
}
```

## UI Integration

The puzzle creation page (`/admin/puzzles/new`) includes:

1. **Test Puzzle Button** (Green)
   - Tests if the puzzle is solvable
   - Generates a machine proof if requested
   - Validates difficulty and length claims

2. **Test Proof Button** (Purple)
   - Tests a specific proof for validity
   - Provides detailed feedback on errors
   - Shows optimization suggestions

3. **Test Results Panel**
   - Displays validation results
   - Shows warnings and suggestions
   - Allows copying generated proofs

## Common Warnings

### Puzzle Warnings
- **Trivial puzzle**: Single-step proofs should have low difficulty
- **Difficulty mismatch**: Difficulty rating doesn't match proof complexity
- **Too many premises**: More than 5 premises can be confusing
- **Length mismatch**: Actual optimal length differs from claimed

### Proof Warnings
- **Redundant steps**: Lines that don't contribute to the conclusion
- **Inefficient strategies**: Suggestions for better proof approaches
- **Missing optimizations**: Opportunities to shorten the proof

## Usage Examples

### 1. Creating a New Puzzle

1. Enter premises: `P → Q, Q → R`
2. Enter conclusion: `P → R`
3. Set difficulty: 2
4. Set best length: 3
5. Click "Test Puzzle" to verify it's solvable
6. If successful, optionally use the generated proof
7. Click "Create Puzzle" to save

### 2. Validating an Existing Proof

1. Enter the puzzle configuration
2. Paste or type the proof in the machine proof field
3. Click "Test Proof" to validate
4. Review any errors or suggestions
5. Fix issues and retest as needed

### 3. Checking Optimal Length

1. Configure the puzzle
2. Set your expected best length
3. Click "Test Puzzle" with generate_proof enabled
4. The system will find the shortest proof and compare

## Best Practices

1. **Always test puzzles** before creating them
2. **Verify optimal lengths** to ensure accuracy
3. **Check counter-models** for failed validations
4. **Review warnings** even for valid puzzles
5. **Test multiple proof strategies** for complex puzzles

## Error Handling

### Common Errors
- **Invalid sequent**: Premises don't entail conclusion
- **Unsolvable puzzle**: No proof exists within depth limits
- **Syntax errors**: Malformed logical formulas
- **Service unavailable**: Proof checker is down

### Troubleshooting
1. Check formula syntax (use standard notation)
2. Verify parentheses are balanced
3. Ensure premises are comma-separated
4. Check that the proof checker service is running

## Security

- Only administrators can access these endpoints
- Input validation prevents malicious formulas
- Rate limiting prevents abuse
- All actions are logged for audit

## Technical Details

### Supported Logical Symbols
- Negation: `~`, `-`, `¬`
- Conjunction: `&`, `/\`, `∧`
- Disjunction: `|`, `\/`, `∨`
- Implication: `->`, `→`
- Biconditional: `<->`, `↔`
- Contradiction: `!?`, `_|_`, `⊥`

### Proof Notation
- Premise: `:PR`
- Assumption: `:AS`
- Modus Ponens: `:MP line1,line2`
- Conjunction Introduction: `:&I line1,line2`
- Show statements for subproofs
- QED lines with `:DD`, `:CD`, `:ID`

## Future Enhancements

1. **Batch puzzle validation** - Test multiple puzzles at once
2. **Proof comparison** - Compare different proof strategies
3. **Difficulty auto-suggestion** - ML-based difficulty rating
4. **Proof visualization** - Graphical proof representation
5. **Template library** - Common puzzle patterns