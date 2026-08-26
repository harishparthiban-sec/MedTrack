from typing import List, Dict
from models import (
    ExtractedTestResult,
    HealthComparisonReport,
    HealthComparisonItem,
)

def compare_health_reports(
    prev_report_id: str,
    curr_report_id: str,
    prev_date: str,
    curr_date: str,
    prev_tests: List[ExtractedTestResult],
    curr_tests: List[ExtractedTestResult],
) -> HealthComparisonReport:
    """
    Compares test parameters between two lab reports (chronological order).
    Determines status (improved, worsened, stable, needs_review) and generates explanations.
    """
    prev_dict: Dict[str, ExtractedTestResult] = {t.test_name.lower(): t for t in prev_tests}
    comparison_items: List[HealthComparisonItem] = []

    improved_count = 0
    worsened_count = 0
    stable_count = 0

    for curr in curr_tests:
        key = curr.test_name.lower()
        if key in prev_dict:
            prev = prev_dict[key]
            val_prev = prev.value
            val_curr = curr.value
            diff = val_curr - val_prev
            pct = ((val_curr - val_prev) / val_prev) * 100 if val_prev != 0 else 0

            status = "stable"
            explanation = f"{curr.test_name} remained stable at {val_curr} {curr.unit}."

            # Categorize based on health direction (e.g. Vitamin D higher is good, HbA1c lower is good)
            is_lower_better = any(kw in key for kw in ["hba1c", "glucose", "sugar", "ldl", "creatinine", "triglyceride", "cholesterol"])
            
            if abs(pct) < 3.0:
                status = "stable"
                stable_count += 1
                explanation = f"Value is virtually unchanged from {val_prev} to {val_curr} {curr.unit}."
            elif is_lower_better:
                if diff < 0:
                    status = "improved"
                    improved_count += 1
                    explanation = f"Improved! Decreased from {val_prev} to {val_curr} {curr.unit} ({abs(pct):.1f}% drop towards healthy range)."
                else:
                    status = "worsened"
                    worsened_count += 1
                    explanation = f"Needs Attention ⚠: Increased from {val_prev} to {val_curr} {curr.unit} (+{abs(pct):.1f}% rise)."
            else: # Higher is better (e.g. Vitamin D, HDL)
                if diff > 0:
                    status = "improved"
                    improved_count += 1
                    explanation = f"Improved! Increased from {val_prev} to {val_curr} {curr.unit} (+{abs(pct):.1f}% increase)."
                else:
                    status = "worsened"
                    worsened_count += 1
                    explanation = f"Needs Attention ⚠: Decreased from {val_prev} to {val_curr} {curr.unit} (-{abs(pct):.1f}% drop)."

            comparison_items.append(
                HealthComparisonItem(
                    test_name=curr.test_name,
                    unit=curr.unit,
                    previous_value=val_prev,
                    current_value=val_curr,
                    change_percentage=round(pct, 1),
                    status=status,
                    explanation=explanation,
                    reference_range=curr.reference_range,
                )
            )

    summary_text = (
        f"Compared reports from {prev_date} and {curr_date}. "
        f"Found {improved_count} improved biomarker(s), {worsened_count} parameter(s) needing attention, and {stable_count} stable value(s). "
        "Discuss significant changes with your healthcare professional."
    )

    return HealthComparisonReport(
        report_id_prev=prev_report_id,
        report_id_curr=curr_report_id,
        date_prev=prev_date,
        date_curr=curr_date,
        overall_summary=summary_text,
        items=comparison_items,
    )
