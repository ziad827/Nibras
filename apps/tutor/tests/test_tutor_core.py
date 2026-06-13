import pytest


def test_correct_tags_maps_operating_system_keywords():
    from app import correct_tags

    tags = correct_tags("how does chmod work on linux", [])
    assert "operating-systems" in tags


def test_build_community_rag_context_includes_citation():
    from app import build_community_rag_context

    matched = {
        "id": "q1",
        "title": "What is a heap?",
        "question_text": "What is a heap?",
    }
    answers = [{"body": "A heap is a tree-based structure.", "author": {"name": "Ada"}, "votesCount": 3}]
    context, citations = build_community_rag_context(matched, answers)
    assert "heap" in context.lower()
    assert citations[0]["url"] == "/community/q/q1"


def test_threshold_default():
    from app import THRESHOLD

    assert 0 < THRESHOLD <= 1


def test_history_limit_bounds():
    from app import HISTORY_LIMIT

    assert 1 <= HISTORY_LIMIT <= 30
