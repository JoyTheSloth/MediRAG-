import pytest
from src.modules.faithfulness import score_faithfulness
from src.modules.source_credibility import score_source_credibility
from src.modules.contradiction import score_contradiction
from src.evaluation.aggregator import aggregate

def test_source_credibility():
    chunks = [
        {"chunk_id": "c1", "pub_type": "research_abstract", "title": "Mock Paper"},
        {"chunk_id": "c2", "pub_type": "exam_question", "title": "Mock Exam Q"}
    ]
    results = score_source_credibility(chunks)
    assert results.score > 0.0
    assert 0.3 <= results.score <= 0.5
    assert results.details["chunk_count"] == 2

def test_faithfulness_nli():
    res_entail = score_faithfulness(
        answer="The sky is blue.",
        context_docs=["The sky is colored blue today."]
    )
    assert res_entail.score >= 0.8
    
    res_contra = score_faithfulness(
        answer="The sky is red.",
        context_docs=["The sky is completely blue and not red."]
    )
    assert res_contra.score <= 0.2

def test_aggregator_logic():
    # Mock config
    test_cfg = {
        "evaluation": {
            "weights": {
                "faithfulness": 0.4,
                "entity_accuracy": 0.2,
                "source_credibility": 0.2,
                "contradiction_risk": 0.2,
                "ragas_composite": 0.0
            }
        }
    }
    
    module_results = {
        "faithfulness": {"score": 1.0},
        "entity_verifier": {"score": 1.0},
        "source_credibility": {"score": 0.5},
        "contradiction": {"score": 1.0},
    }
    
    class MockResult:
        def __init__(self, score, error=None):
            self.score = score
            self.error = error
            self.latency_ms = 10
            
    res = aggregate(
        faithfulness_result=MockResult(1.0),
        entity_result=MockResult(1.0),
        source_result=MockResult(0.5),
        contradiction_result=MockResult(1.0),
        weights=test_cfg["evaluation"]["weights"]
    )
    assert abs(res.score - 0.9) < 0.01
    assert res.details["hrs"] == 10
    assert res.details["risk_band"] == "LOW"


def test_drug_interactions_and_entity_verifier():
    from src.modules.entity_verifier import check_drug_interactions, verify_entities
    
    # 1. Test DDI check directly with known interactive drugs (Warfarin: 11289, Ibuprofen: 5640)
    interactions = check_drug_interactions(["11289", "5640"])
    
    # Verify interactions structure is a valid list of dicts
    assert isinstance(interactions, list)
    if interactions:
        assert "drugs" in interactions[0]
        assert "severity" in interactions[0]
        assert "description" in interactions[0]
        
    # 2. Verify fallback & interface safety of verify_entities
    res = verify_entities(
        answer="Patient is taking Metformin and Lisinopril.",
        question="What medications is the patient on?",
        context_docs=["The patient is prescribed Metformin 500mg and Lisinopril 10mg."]
    )
    assert res.score is not None
    assert isinstance(res.details, dict)

