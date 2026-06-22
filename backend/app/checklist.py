from typing import Optional

CATEGORY_ICONS = {
    "Content": "📄",
    "Format": "📁",
    "Skills": "⚙️",
    "Sections": "📋",
    "Style": "🎯",
}

CHECK_CATEGORY_MAP = {
    "file_format": "Format",
    "section_completeness": "Format",
    "bullet_format": "Format",
    "contact_info": "Format",
    "resume_length": "Format",
    "keyword_density": "Skills",
    "skills_section": "Skills",
    "no_tables": "Skills",
    "no_complex_tables": "Skills",
    "standard_chars": "Skills",
    "experience_dates": "Content",
    "quantified_achievements": "Content",
    "action_verbs": "Style",
    "active_voice": "Style",
    "buzzword_avoidance": "Style",
    "strong_bullet_starts": "Style",
    "weak_phrases": "Style",
    "spelling_grammar": "Sections",
    "tailored_headline": "Sections",
    "personality_showcase": "Sections",
    "structure_quality": "Sections",
}

CHECK_ACTION_MAP = {
    "file_format": "fix",
    "section_completeness": "add",
    "bullet_format": "fix",
    "contact_info": "add",
    "resume_length": "fix",
    "keyword_density": "add",
    "skills_section": "add",
    "no_tables": "fix",
    "no_complex_tables": "fix",
    "standard_chars": "fix",
    "experience_dates": "add",
    "quantified_achievements": "rewrite",
    "action_verbs": "rewrite",
    "active_voice": "rewrite",
    "buzzword_avoidance": "remove",
    "strong_bullet_starts": "rewrite",
    "weak_phrases": "remove",
    "spelling_grammar": "fix",
    "tailored_headline": "add",
    "personality_showcase": "add",
    "structure_quality": "fix",
}


def _get_priority(max_score: float) -> str:
    if max_score >= 15:
        return "high"
    elif max_score >= 10:
        return "medium"
    return "low"


def _get_suggestion_text(check_id: str) -> Optional[str]:
    if check_id == "quantified_achievements":
        return "Improved [metric] by [X]% through [action], resulting in [outcome]"
    elif check_id == "action_verbs":
        return "[Strong verb] [object/action] using [tools/skills], resulting in [quantified outcome]"
    elif check_id == "tailored_headline":
        return "[Target Role Title] | [Key Skills] | [Technologies] | [Industry]"
    return None


def _get_suggested_value(check_id: str, profile_analysis: Optional[dict] = None) -> Optional[str]:
    if check_id == "quantified_achievements":
        return "Improved [metric] by [X]% through [action], resulting in [outcome]"
    elif check_id == "action_verbs":
        return "[Strong verb] [object/action] using [tools/skills], resulting in [quantified outcome]"
    elif check_id == "tailored_headline" and profile_analysis:
        return profile_analysis.get("optimized_headline")
    return None


def generate_optimization_checklist(ats_result: dict, profile_analysis: Optional[dict] = None) -> list[dict]:
    checklist = []
    check_index = 0

    tier1 = ats_result.get("tier1_checks", [])
    tier2 = ats_result.get("tier2_checks", [])

    for check in tier1 + tier2:
        if check.get("passed", True):
            continue
        check_id = check.get("id", "")
        check_index += 1
        category = CHECK_CATEGORY_MAP.get(check_id, "Content")
        priority = _get_priority(check.get("max_score", 0))
        detail = check.get("detail", "")
        action_type = CHECK_ACTION_MAP.get(check_id, "fix")
        suggestion_text = _get_suggestion_text(check_id)
        suggested_value = _get_suggested_value(check_id, profile_analysis)

        item = {
            "id": f"check_{check_index}",
            "category": category,
            "label": check.get("label", ""),
            "description": detail,
            "priority": priority,
            "status": "pending",
            "icon": CATEGORY_ICONS.get(category, "📋"),
            "action_type": action_type,
            "suggestion_text": suggestion_text,
            "suggested_value": suggested_value,
        }
        checklist.append(item)

    if profile_analysis:
        suggestions = profile_analysis.get("suggestions", [])
        for i, suggestion in enumerate(suggestions):
            check_index += 1
            item = {
                "id": f"check_{check_index}",
                "category": "Content",
                "label": suggestion[:80] + ("..." if len(suggestion) > 80 else ""),
                "description": suggestion,
                "priority": "medium",
                "status": "pending",
                "icon": CATEGORY_ICONS.get("Content", "📄"),
                "action_type": "rewrite",
                "suggestion_text": suggestion,
                "suggested_value": suggestion,
            }
            checklist.append(item)

    return checklist


def build_action_plan(profile_text: str, target_role: str = "") -> dict:
    from app.ats_scorer import generate_dual_score_report
    from app.profile_analyzer import analyze_profile
    import tempfile
    import os

    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        f.write(profile_text)
        tmp_path = f.name

    try:
        ats_result = generate_dual_score_report(tmp_path)
    finally:
        os.unlink(tmp_path)

    profile_analysis = analyze_profile(profile_text)

    all_items = generate_optimization_checklist(ats_result, profile_analysis)

    categories = {}
    for item in all_items:
        cat = item["category"]
        if cat not in categories:
            categories[cat] = {"total": 0, "completed": 0, "items": []}
        categories[cat]["total"] += 1
        if item["status"] == "completed":
            categories[cat]["completed"] += 1
        categories[cat]["items"].append(item)

    total_items = len(all_items)
    completed_items = sum(1 for i in all_items if i["status"] == "completed")

    return {
        "overall_progress": 0,
        "total_items": total_items,
        "completed_items": completed_items,
        "categories": categories,
        "all_items": all_items,
    }


def format_checklist_for_frontend(checklist: list[dict]) -> list[dict]:
    priority_colors = {
        "high": "#ef4444",
        "medium": "#f59e0b",
        "low": "#10b981",
    }
    formatted = []
    for item in checklist:
        formatted_item = dict(item)
        formatted_item["progress_bar_color"] = priority_colors.get(item.get("priority", "low"), "#10b981")
        formatted_item["action_button_label"] = "Click to Copy" if item.get("suggestion_text") else "Fix Now"
        formatted.append(formatted_item)
    return formatted
