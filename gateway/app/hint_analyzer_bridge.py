"""
Bridge module to connect the old hint_analyzer API with the new enhanced hint generator

This ensures backward compatibility while using the improved hint generation system.
"""

import sys
import os
from typing import List, Dict, Any

# Add puzzle module to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '../../puzzle'))

try:
    # Try to import the enhanced hint generator
    from enhanced_hint_generator import generate_contextual_hints as enhanced_hints
    USE_ENHANCED = True
except ImportError:
    # Fall back to original if enhanced not available
    from app.hint_analyzer import generate_contextual_hints as original_hints
    USE_ENHANCED = False


def generate_contextual_hints(gamma: str, phi: str, current_proof: str, 
                             difficulty: int = 5) -> List[Dict[str, Any]]:
    """
    Generate contextual hints for a proof in progress.
    
    This function bridges between the old and new hint systems, preferring
    the enhanced system when available but falling back to the original
    for compatibility.
    
    Args:
        gamma: Comma-separated premises
        phi: Conclusion to prove
        current_proof: User's current proof text
        difficulty: Puzzle difficulty (1-10)
    
    Returns:
        List of hint dictionaries with type, content, priority, etc.
    """
    
    if USE_ENHANCED:
        # Use the enhanced hint generator that combines both systems
        try:
            hints = enhanced_hints(gamma, phi, current_proof, difficulty)
            
            # Ensure format compatibility
            for hint in hints:
                # Add any missing fields for backward compatibility
                if 'type' not in hint:
                    hint['type'] = 'tactical'
                if 'priority' not in hint:
                    hint['priority'] = 5
                if 'confidence' not in hint:
                    hint['confidence'] = 0.8
                if 'target_line' not in hint:
                    hint['target_line'] = None
                if 'suggested_rule' not in hint:
                    hint['suggested_rule'] = None
            
            return hints
            
        except Exception as e:
            # Log error and fall back to original
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Enhanced hint generator failed, using original: {e}")
            
            if not USE_ENHANCED:
                return original_hints(gamma, phi, current_proof, difficulty)
            else:
                # Return basic hints if both fail
                return [{
                    'type': 'strategic',
                    'content': 'Review your proof and check that all premises are included.',
                    'priority': 5,
                    'target_line': None,
                    'suggested_rule': None,
                    'confidence': 0.5
                }]
    else:
        # Use original hint analyzer
        return original_hints(gamma, phi, current_proof, difficulty)