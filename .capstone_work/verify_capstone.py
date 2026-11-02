from pathlib import Path
from zipfile import ZipFile
from docx import Document
import json

path = Path(__file__).resolve().parent.parent / "Llano_SELECTA_Dealer_POS_and_Inventory_System_Chapters_1-3_Revised.docx"
with ZipFile(path) as archive:
    bad_member = archive.testzip()
doc = Document(path)
paragraphs = [p.text.strip() for p in doc.paragraphs]
all_text = "\n".join(paragraphs)
ref_index = next(i for i, text in enumerate(paragraphs) if text == "REFERENCES")
reference_entries = [text for text in paragraphs[ref_index + 1:] if text and not text.startswith("The following reference list")]
checks = {
    "valid_docx_zip": bad_member is None,
    "paragraphs": len(paragraphs),
    "tables": len(doc.tables),
    "figures": len(doc.inline_shapes),
    "reference_entries": len(reference_entries),
    "has_site": "P18 Malabuaya Batangan, Valencia City, Bukidnon" in all_text,
    "has_route_areas": all(term in all_text for term in ("San Isidro", "Lumabayo", "Cabanglasan", "San Fernando")),
    "separates_official_pos": "not a dealer-owned ordering platform" in all_text,
    "has_bo_deduction": "unsaleable products" in all_text and "deducted from the store’s bill" in all_text,
    "has_cash_shortage_and_gcash": "₱1,000" in all_text and "GCash" in all_text,
    "has_freezer_process": "Timemark" in all_text and "₱9,000" in all_text and "₱1,000 as a processing fee" in all_text,
    "no_toc_placeholder": "Open in Word and update the table of contents" not in all_text,
    "toc_placeholder_hits": [text for text in paragraphs if "Open in Word" in text],
    "toc_placeholder_context": [
        {"index": i, "before": paragraphs[i - 1] if i else "", "hit": text, "after": paragraphs[i + 1] if i + 1 < len(paragraphs) else ""}
        for i, text in enumerate(paragraphs) if "Open in Word" in text
    ],
}
print(json.dumps(checks, ensure_ascii=False, indent=2))
