# Proof Checker Service

This service provides Carnap-compatible natural deduction proof validation for LogicArena using Fitch-style notation with proper space-based indentation.

## Overview

The proof checker validates formal logic proofs written in Fitch notation. It checks:
- Correct application of inference rules
- Proper subproof structure
- Line accessibility in nested contexts
- Whether the conclusion follows from the premises

## API Endpoints

### `POST /verify`

Verifies a natural deduction proof.

**Request Body:**
```json
{
  "gamma": "P→Q, P",    // Comma-separated premises
  "phi": "Q",           // Conclusion to prove
  "proof": "Q [1,2 MP]" // Fitch-style proof
}
```

**Response:**
```json
{
  "ok": true,           // Whether proof is valid
  "lines": 1,           // Number of proof lines
  "depth": 0,           // Maximum subproof depth
  "error": null,        // Error message if invalid
  "counterModel": null, // Countermodel if sequent is invalid
  "details": {
    "rules_used": ["MP"],
    "warnings": [],
    "steps": 3
  }
}
```

### `GET /health`

Health check endpoint.

## Supported Inference Rules

- **MP** (Modus Ponens): From A→B and A, infer B
- **MT** (Modus Tollens): From A→B and ¬B, infer ¬A
- **∧I** (Conjunction Introduction): From A and B, infer A∧B
- **∧E** (Conjunction Elimination): From A∧B, infer A (or B)
- **∨I** (Disjunction Introduction): From A, infer A∨B
- **∨E** (Disjunction Elimination): From A∨B and subproofs, infer C
- **→I** (Conditional Introduction): From subproof assuming A proves B, infer A→B
- **→E** (Conditional Elimination): Same as MP
- **¬I** (Negation Introduction): From subproof assuming A proves ⊥, infer ¬A
- **¬E** (Negation Elimination): From A and ¬A, infer ⊥
- **RAA** (Reductio Ad Absurdum): From subproof assuming ¬A proves ⊥, infer A
- **Reit** (Reiteration): Copy an accessible formula

## Proof Format (Carnap-Compatible)

Proofs are written in Carnap's Fitch notation with the following format:

### Basic Proof
```
formula    :justification
```

### Subproofs with Show Statements
```
Show formula
    assumption    :AS
    ...proof steps...
:derivation_type line_range
```

### Indentation
- Use **spaces only** (not tabs)
- Each subproof level uses 4 spaces of indentation
- The editor automatically handles indentation when you press Tab

### Example Proofs

**Modus Ponens:**
```
Premises: P→Q, P
Conclusion: Q

Proof:
Q    :MP 1,2
```

**Conditional Proof:**
```
Premises: (none)
Conclusion: P→P

Proof:
Show P→P
    P    :AS
:CD 2
```

**Complex Proof:**
```
Premises: P→Q, Q→R
Conclusion: P→R

Proof:
Show P→R
    P    :AS
    Q    :MP 1,2
    R    :MP 2,3
:CD 2-4
```

**Direct Derivation:**
```
Premises: P∧Q
Conclusion: P

Proof:
Show P
    P    :&E 1
:DD 2
```

## Countermodel Generation

If a sequent is invalid (the conclusion doesn't follow from the premises), the service attempts to generate a countermodel using minisat. The countermodel shows truth value assignments that make all premises true but the conclusion false.

## Development

### Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Install minisat (Ubuntu/Debian)
sudo apt-get install minisat

# Run the service
python app.py
```

### Testing

Run the test script to verify the service is working:

```bash
# Test Carnap-compatible syntax
python test_carnap_proof_checker.py

# Test legacy syntax (if needed)
python test_proof_checker.py
```

### Docker

The service includes two Dockerfiles:
- `Dockerfile`: Full Carnap integration (complex build)
- `Dockerfile.simple`: Python-only implementation (recommended)

Build and run:
```bash
docker build -f Dockerfile.simple -t proof-checker .
docker run -p 5003:5003 proof-checker
```

## Implementation Notes

1. The current implementation validates basic propositional logic rules
2. Quantifier rules (∀I, ∀E, ∃I, ∃E) are defined but not fully implemented
3. The CNF conversion for countermodel generation is simplified
4. Full Carnap integration is available but requires Haskell build environment

## Future Enhancements

- Complete quantifier logic support
- Full CNF conversion for complex formulas
- Better error messages with suggestions
- Proof optimization analysis
- Support for alternative proof systems (Lemmon, Sequent Calculus)