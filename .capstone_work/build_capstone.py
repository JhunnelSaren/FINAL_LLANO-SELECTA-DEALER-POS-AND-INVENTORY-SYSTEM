from copy import deepcopy
from pathlib import Path
from textwrap import wrap
import math
import re

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"D:\JHUNNEL SAREN\ACLC COLLEGE\2_LLANO POS AND INVENTORY SYSTEM")
WORK = ROOT / ".capstone_work"
TEMPLATE = Path(r"D:\JHUNNEL SAREN\ACLC COLLEGE\CAPSTONE_TEMPLATE.docx")
OUT = ROOT / "Llano_SELECTA_Dealer_POS_and_Inventory_System_Chapters_1-3_Revised.docx"
FONT_REG = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")
NAVY = (31, 64, 98)
BLUE = (70, 130, 180)
PALE = (235, 242, 248)
GRAY = (90, 96, 102)
BLACK = (25, 30, 35)
WHITE = (255, 255, 255)


def get_font(size, bold=False):
    path = FONT_BOLD if bold else FONT_REG
    return ImageFont.truetype(str(path), size)


def draw_centered(draw, box, text, font, color=BLACK, spacing=5):
    x0, y0, x1, y1 = box
    lines = []
    for raw in text.split("\n"):
        max_chars = max(8, int((x1 - x0) / max(1, font.size * .56)))
        lines.extend(wrap(raw, max_chars) or [""])
    line_h = font.size + spacing
    total = len(lines) * line_h
    y = y0 + max(0, (y1 - y0 - total) / 2)
    for line in lines:
        b = draw.textbbox((0, 0), line, font=font)
        tw = b[2] - b[0]
        draw.text((x0 + (x1 - x0 - tw) / 2, y), line, font=font, fill=color)
        y += line_h


def draw_box(draw, xy, text, fill=PALE, outline=NAVY, font=None, radius=22, color=BLACK):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=4)
    draw_centered(draw, xy, text, font or get_font(40), color)


def draw_arrow(draw, start, end, color=BLUE, width=7):
    draw.line([start, end], fill=color, width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    size = 22
    p1 = (end[0] - size * math.cos(angle - .48), end[1] - size * math.sin(angle - .48))
    p2 = (end[0] - size * math.cos(angle + .48), end[1] - size * math.sin(angle + .48))
    draw.polygon([end, p1, p2], fill=color)


def figure_methodology(path):
    im = Image.new("RGB", (2200, 520), WHITE)
    d = ImageDraw.Draw(im)
    items = ["1. Plan\nConfirm scope and\nrequirements", "2. Design\nModel workflows,\ndata, and screens", "3. Build\nDevelop and connect\nmodules", "4. Test\nCheck functions and\nfix issues", "5. Review\nUser feedback and\nrefinement"]
    xs = [45, 480, 915, 1350, 1785]
    for i, label in enumerate(items):
        draw_box(d, (xs[i], 115, xs[i] + 360, 390), label, fill=(245, 249, 253), font=get_font(36, True))
        if i < 4:
            draw_arrow(d, (xs[i] + 365, 250), (xs[i + 1] - 12, 250))
    im.save(path)


def figure_flow(path):
    im = Image.new("RGB", (2200, 930), WHITE)
    d = ImageDraw.Draw(im)
    labels = [
        "Book store orders\nMonday / Tuesday\nExcel and hardcopy",
        "Owner enters the\nbodega order in the\nofficial SELECTA POS",
        "Receive the truck\ncheck quantity and\nproduct condition",
        "Prepare store boxes\nlabel and seal ice boxes;\nassign route crew",
        "Deliver to each store\nrecord accepted, missing,\nreturned, and BO items",
        "Reconcile invoices\ncompare expected and\nactual collections",
    ]
    xs = [35, 390, 745, 1100, 1455, 1810]
    for i, label in enumerate(labels):
        draw_box(d, (xs[i], 145, xs[i] + 325, 470), label, fill=(245, 249, 253), font=get_font(28, True))
        if i < len(labels) - 1:
            draw_arrow(d, (xs[i] + 329, 307), (xs[i + 1] - 12, 307))
    d.text((100, 555), "Record truck arrival date, plate number, receiver, and expected / good / damaged / missing quantities.", font=get_font(27), fill=GRAY)
    d.text((100, 620), "At a store, bill accepted products; record shortages and melted or damaged BO items as deductions and returns.", font=get_font(27), fill=GRAY)
    d.text((100, 685), "Compare expected cash with counted cash; record GCash and checks. Enter sales and quota in SELECTA POS separately.", font=get_font(27), fill=GRAY)
    d.text((100, 750), "Monthly freezer barcode scan and photo use Timemark. Booking alone does not reduce on-hand inventory.", font=get_font(27, True), fill=NAVY)
    im.save(path)


def figure_architecture(path):
    im = Image.new("RGB", (2200, 780), WHITE)
    d = ImageDraw.Draw(im)
    boxes = [
        ((80, 195, 690, 550), "Browser interface\nReact 18 + TypeScript\nBooking, stock, delivery,\nfreezer, and reports"),
        ((795, 195, 1405, 550), "Application API\nNode.js + Express\nValidation, roles, business\nrules, and audit records"),
        ((1510, 195, 2120, 550), "Data layer\nPrisma ORM + MySQL\nOperational records, stock\nledger, and system settings"),
    ]
    for box, label in boxes:
        draw_box(d, box, label, fill=(245, 249, 253), font=get_font(36, True))
    draw_arrow(d, (695, 310), (790, 310))
    draw_arrow(d, (790, 430), (695, 430))
    draw_arrow(d, (1410, 310), (1505, 310))
    draw_arrow(d, (1505, 430), (1410, 430))
    d.text((707, 264), "HTTPS / API", font=get_font(24, True), fill=GRAY)
    d.text((1415, 264), "DB queries", font=get_font(24, True), fill=GRAY)
    d.rounded_rectangle((350, 590, 1850, 745), radius=18, fill=(248, 248, 248), outline=(160, 165, 170), width=3)
    draw_centered(d, (370, 600, 1830, 735), "Official SELECTA POS, Timemark, and payment services remain external. Users enter references or attach proof manually; the dealer app sends no bodega orders and moves no funds.", get_font(28), GRAY)
    im.save(path)


def figure_dfd(path):
    im = Image.new("RGB", (2200, 900), WHITE)
    d = ImageDraw.Draw(im)
    draw_box(d, (780, 315, 1430, 565), "Llano SELECTA Dealer\nPOS and Inventory System", fill=(225, 237, 247), font=get_font(42, True))
    draw_box(d, (55, 100, 570, 310), "Owner / Administrator\nUsers, roles, products,\nsettings, quota references", fill=(247, 249, 251), font=get_font(30, True))
    draw_box(d, (55, 585, 570, 800), "Dealer Staff\nRoute bookings, receiving,\ndelivery, payment records,\nfreezer verification", fill=(247, 249, 251), font=get_font(28, True))
    draw_box(d, (1640, 100, 2155, 310), "Customers\nBooking and delivery details;\nconfirmation relayed by staff", fill=(247, 249, 251), font=get_font(30, True))
    draw_box(d, (1640, 585, 2155, 800), "External tools\nOfficial SELECTA POS / Bodega\nTimemark scan and photo\nManual references only;\nno direct integration", fill=(247, 249, 251), font=get_font(26, True))
    draw_arrow(d, (575, 245), (775, 365))
    draw_arrow(d, (575, 675), (775, 500))
    draw_arrow(d, (1435, 365), (1635, 245))
    draw_arrow(d, (1635, 675), (1435, 500))
    d.text((590, 172), "Setup data", font=get_font(25), fill=GRAY)
    d.text((595, 700), "Staff records", font=get_font(25), fill=GRAY)
    d.text((1430, 170), "Status / reports", font=get_font(25), fill=GRAY)
    d.text((1430, 705), "Manual data only", font=get_font(25), fill=GRAY)
    im.save(path)


def figure_erd(path):
    im = Image.new("RGB", (2200, 1650), WHITE)
    d = ImageDraw.Draw(im)
    nodes = [
        ("Users", (60, 65, 700, 315), "PK user_id\nname, role, active; who records each action"),
        ("Customers / Stores", (780, 65, 1420, 315), "PK customer_id\nstore name, contact, delivery area"),
        ("Bookings / Items", (1500, 65, 2140, 315), "PK booking_id, item_id\nroute, date, store, product, requested quantity"),
        ("Products / Inventory Ledger", (60, 435, 700, 685), "PK product_id, ledger_id\nbarcode, movement type, quantity, user"),
        ("Bodega Order / Items", (780, 435, 1420, 685), "PK order_id, item_id\nSELECTA POS reference, ordered and received quantity"),
        ("Stock Receiving / Items", (1500, 435, 2140, 685), "expected, good, damaged or melted, and missing quantity\ntruck plate, date, receiver, checker"),
        ("Delivery Run / Stops / Items", (60, 805, 700, 1055), "route, date, assigned driver and loaders\nloaded, accepted, missing, BO, and intact-return quantity"),
        ("Invoice / Payments", (780, 805, 1420, 1055), "accepted quantity and approved deductions\ncash, GCash, check, reference, balance"),
        ("Route Reconciliation", (1500, 805, 2140, 1055), "expected cash versus counted cash\npayment totals, variance reason, review status"),
        ("Freezer / Monthly Verification", (780, 1175, 1420, 1425), "SELECTA-owned freezer and assigned store\nbarcode, month, scan date, staff, and photo evidence"),
    ]
    for name, (x0, y0, x1, y1), details in nodes:
        d.rounded_rectangle((x0,y0,x1,y1), radius=18, fill=(247, 249, 251), outline=NAVY, width=4)
        d.rectangle((x0,y0,x1,y0+58), fill=(223, 234, 245), outline=NAVY, width=3)
        draw_centered(d, (x0+8,y0+4,x1-8,y0+54), name, get_font(27, True), NAVY)
        draw_centered(d, (x0+14,y0+66,x1-14,y1-8), details, get_font(22), BLACK)
    # Core relationships; tables are grouped here to keep the diagram readable.
    paths = [
        ((1425, 190), (1495, 190)),   # customer -> booking
        ((705, 560), (775, 560)),     # product/ledger -> bodega order
        ((1425, 560), (1495, 560)),   # bodega order -> receiving
        ((700, 930), (775, 930)),     # delivery -> invoice
        ((1425, 930), (1495, 930)),   # payment -> reconciliation
    ]
    for a, b in paths:
        draw_arrow(d, a, b, color=(110,135,160), width=4)
    d.text((1430, 140), "1 : M", font=get_font(20, True), fill=GRAY)
    d.text((1440, 510), "1 : M", font=get_font(20, True), fill=GRAY)
    d.text((730, 885), "1 : M", font=get_font(20, True), fill=GRAY)
    d.text((1440, 885), "1 : 1", font=get_font(20, True), fill=GRAY)
    # Connect the store to its freezer record through the column gap so the line
    # does not cross other entities; cardinality is left unspecified.
    d.line((780, 315, 720, 315), fill=(110,135,160), width=4)
    d.line((720, 315, 720, 1300), fill=(110,135,160), width=4)
    draw_arrow(d, (720, 1300), (775, 1300), color=(110,135,160), width=4)
    im.save(path)


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, v in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table):
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = qn(f"w:{edge}")
        element = borders.find(tag)
        if element is None:
            element = OxmlElement(f"w:{edge}")
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), "5")
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), "D9E0E6")


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def add_toc_field(p):
    r = p.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = ' TOC \\o "1-2" \\h \\z \\u '
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    fallback = OxmlElement("w:t")
    fallback.text = "Open in Word and update the table of contents."
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    r._r.append(begin)
    r._r.append(instr)
    r._r.append(separate)
    r._r.append(fallback)
    r._r.append(end)


def add_page_field(p):
    r = p.add_run()
    begin = OxmlElement("w:fldChar"); begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText"); instr.set(qn("xml:space"), "preserve"); instr.text = " PAGE "
    separate = OxmlElement("w:fldChar"); separate.set(qn("w:fldCharType"), "separate")
    txt = OxmlElement("w:t"); txt.text = "1"
    end = OxmlElement("w:fldChar"); end.set(qn("w:fldCharType"), "end")
    for e in (begin, instr, separate, txt, end): r._r.append(e)


def pformat(p, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY, indent=True, before=0, after=6, line=1.5, keep=False):
    pf = p.paragraph_format
    p.alignment = alignment
    pf.first_line_indent = Inches(.5) if indent else Inches(0)
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    pf.line_spacing = line
    pf.keep_together = keep
    for run in p.runs:
        run.font.name = "Arial"
        run._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
        run.font.size = Pt(12)


def add_para(doc, text="", bold_lead=None, style="Normal", alignment=WD_ALIGN_PARAGRAPH.JUSTIFY, indent=True,
             before=0, after=6, keep=False, italic=False, size=12):
    p = doc.add_paragraph(style=style)
    if bold_lead and text.startswith(bold_lead):
        r = p.add_run(bold_lead); r.bold = True
        p.add_run(text[len(bold_lead):])
    else:
        p.add_run(text)
    pformat(p, alignment, indent, before, after, 1.5, keep)
    for r in p.runs:
        r.font.name = "Arial"; r._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
        r.font.size = Pt(size); r.italic = italic
    return p


def add_heading(doc, text, level=2, page_break=False):
    p = doc.add_paragraph(style=f"Heading {level}")
    p.add_run(text)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if level == 1 else WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.first_line_indent = Inches(0)
    p.paragraph_format.space_before = Pt(12 if level == 2 else 0)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.keep_with_next = True
    if page_break: p.paragraph_format.page_break_before = True
    for r in p.runs:
        r.font.name = "Arial"; r._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
        r.font.size = Pt(12); r.bold = True
    return p


def add_caption(doc, text):
    p = add_para(doc, text, alignment=WD_ALIGN_PARAGRAPH.CENTER, indent=False, before=4, after=8, keep=True, size=11)
    for r in p.runs: r.italic = True
    return p


def add_image(doc, path, width=6.05):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_together = True
    p.add_run().add_picture(str(path), width=Inches(width))
    return p


def add_table(doc, headers, rows, widths, font_size=10, header_fill="1F4062"):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table)
    set_repeat_table_header(table.rows[0])
    for i, text in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.width = Inches(widths[i]); cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_shading(cell, header_fill); set_cell_margins(cell)
        p = cell.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0); p.paragraph_format.line_spacing = 1.08
        r = p.add_run(text); r.bold = True; r.font.name = "Arial"; r.font.size = Pt(font_size); r.font.color.rgb = RGBColor(255,255,255)
    for ridx, row in enumerate(rows):
        cells = table.add_row().cells
        for i, text in enumerate(row):
            c = cells[i]; c.width = Inches(widths[i]); c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_margins(c)
            if ridx % 2: set_cell_shading(c, "F2F6F9")
            p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_after = Pt(0); p.paragraph_format.line_spacing = 1.08
            r = p.add_run(str(text)); r.font.name = "Arial"; r.font.size = Pt(font_size)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table


def add_numbered(doc, n, text):
    p = doc.add_paragraph()
    pformat(p, WD_ALIGN_PARAGRAPH.JUSTIFY, False, after=5, line=1.5)
    p.paragraph_format.left_indent = Inches(.3)
    p.paragraph_format.first_line_indent = Inches(-.3)
    r = p.add_run(f"{n}. "); r.bold = True
    p.add_run(text)
    return p


def add_term(doc, term, definition):
    p = doc.add_paragraph()
    pformat(p, WD_ALIGN_PARAGRAPH.JUSTIFY, False, after=4, line=1.5)
    p.paragraph_format.left_indent = Inches(.35)
    p.paragraph_format.first_line_indent = Inches(-.35)
    r=p.add_run(f"{term}. "); r.bold=True
    p.add_run(definition)


def add_reference(doc, text):
    p = doc.add_paragraph()
    pformat(p, WD_ALIGN_PARAGRAPH.LEFT, False, after=4, line=1.5)
    p.paragraph_format.keep_together = True
    p.paragraph_format.left_indent = Inches(.5)
    p.paragraph_format.first_line_indent = Inches(-.5)
    journals = [
        "Journal of Business and Retail Management Research", "Mediterranean Journal of Social Sciences",
        "Small Enterprise Research", "Journal of Finance and Accounting", "Management Science",
        "IIE Transactions", "International Journal of Production Economics", "Computers & Operations Research",
        "Information and Software Technology", "Production and Operations Management", "Operations Management Research",
        "MIS Quarterly Executive", "MIS Quarterly", "Journal of Management Information Systems",
        "The Journal of Child Nutrition & Management", "Journal of Business Logistics",
        "Psychology and Education: A Multidisciplinary Journal", "Procedia Computer Science",
        "Information Systems and e-Business Management", "Decision Sciences", "Omega",
        "Computer", "Information Systems Research", "Isabela State University Linker: Journal of Engineering, Computing and Technology",
    ]
    spans = []
    for journal in journals:
        pos = text.find(journal)
        if pos >= 0:
            spans.append((pos, pos + len(journal)))
            after = text[pos + len(journal):]
            m = re.match(r",\s*(\d+)", after)
            if m:
                spans.append((pos + len(journal) + m.start(1), pos + len(journal) + m.end(1)))
    for title in [
        "Manifesto for agile software development", "GS1 general specifications", "Diffusion of innovations",
        "The Scrum guide: The definitive guide to Scrum: The rules of the game", "Software engineering",
        "Republic Act No. 10173: Data Privacy Act of 2012", "Proceedings of the 17th Americas Conference on Information Systems",
        "2021 Second International Conference on Information Systems and Software Technologies (ICI2ST)",
        "Llano SELECTA dealer interview questionnaire", "Llano SELECTA dealer POS and inventory system",
        "Llano SELECTA dealer project proposal letter",
        "Ergonomics of human-system interaction—Part 11: Usability: Definitions and concepts",
        "Systems and software engineering—Systems and software quality requirements and evaluation (SQuaRE)—Product quality model",
    ]:
        pos = text.find(title)
        if pos >= 0:
            end = pos + len(title)
            suffix = re.match(r"\s*\([^)]*\)", text[end:])
            if suffix: end += suffix.end()
            spans.append((pos, end))
    spans.sort()
    merged=[]
    for start,end in spans:
        if merged and start <= merged[-1][1]: merged[-1]=(merged[-1][0],max(end,merged[-1][1]))
        else: merged.append((start,end))
    cursor=0
    for start,end in merged:
        if start > cursor: p.add_run(text[cursor:start])
        rr=p.add_run(text[start:end]); rr.italic=True
        cursor=end
    if cursor < len(text): p.add_run(text[cursor:])
    for run in p.runs:
        run.font.name="Arial"; run._element.rPr.rFonts.set(qn("w:eastAsia"),"Arial"); run.font.size=Pt(12)


ANNOTATIONS = [
    ("Inventory Control and Valuation Systems among Retail SMEs in a Developing Country: An Exploratory Study",
     "Haribhai-Pitamber and Dhurup (2014) surveyed 173 owners and managers of retail small and medium enterprises about inventory controls and valuation. The study reports that these businesses used control procedures but still needed clear, objective stock records. It was limited to one national setting and focused on valuation practice. It supports recording each receipt, adjustment, and stock movement in a traceable ledger."),
    ("The Mediating Effect of Knowledge of Inventory Management in Micro Retailing Enterprises",
     "Ahmad and Zabri (2018) examined inventory practices, manager knowledge, and performance using questionnaire responses from 100 Malaysian micro retailers. Their analysis links inventory knowledge with how practices relate to performance. The sample is small and country-specific, so it does not predict results for Llano SELECTA Dealer. It supports simple screens, clear role instructions, and user orientation as part of system adoption."),
    ("Cash, Receivables, and Inventory Management in Small Enterprises",
     "Karadağ (2018) studied how cash, receivables, and inventory management practices relate to financial performance and competitiveness in small enterprises. The paper treats inventory as one connected part of working-capital control rather than an isolated count. Its findings come from a particular country and survey context. This supports keeping booking, invoice, payment-record, and stock information connected while avoiding a claim that the system itself guarantees higher profit."),
    ("Inventory Management and SME Profitability in Delta State, Nigeria",
     "Otuya and Eginiwin (2017) examined inventory management and profitability among furniture, wholesale, and food businesses. The authors report that appropriate inventory levels and control matter for financial performance and for avoiding excess holding costs. The sectors and local setting differ from a frozen-goods dealer, and the study does not test software. It supports monitoring stock and recording good, damaged, and missing quantities separately."),
    ("Inventory Record Inaccuracy: An Empirical Analysis",
     "DeHoratius and Raman (2008) analyzed nearly 370,000 item records from 37 stores of one retailer and found that many recorded balances differed from physical stock. Their analysis also links accuracy with audit practices and store complexity. The data came from one retailer, so the reported rate should not be applied to Llano. The study supports reconciliation, audit history, and clear rules for recording each movement."),
    ("Information Inaccuracy in Inventory Systems: Stock Loss and Stockout",
     "Kang and Gershwin (2005) used analytical and simulation models to show how unrecorded stock loss can distort replenishment decisions and contribute to stockouts. The work explains why an automated balance still depends on accurate input. Its models simplify real store operations and do not evaluate a dealer application. It supports the project’s rule that stock changes follow recorded receiving, picking, dispatch, and reconciliation events."),
    ("Inventory Inaccuracy and Supply Chain Performance: A Simulation Study",
     "Fleisch and Tellkamp (2005) used simulation to examine how inventory errors can affect retail supply-chain performance. Their model connects record accuracy with product availability and operating outcomes. Because it is a modeled supply chain, it cannot establish the effect of a particular local system. It supports preserving a movement history so that stock differences can be traced to the process where they occurred."),
    ("Inventory Record Inaccuracy: Causes and Labor Effects",
     "Chuang and Oliva (2015) combined a simulation model with longitudinal data from five stores. Their analysis identifies shrinkage and staffing conditions as relevant to inventory record errors. The small store sample and specific chain limit direct comparison with this project. The study shows that software alone cannot remove process errors, so staff roles, timely entry, and review remain part of the proposed workflow."),
    ("Inventory Inaccuracy in Retail Stores Due to Theft: An Analysis of RFID Benefits",
     "Rekik, Sahin, and Dallery (2008) modeled a single-product retail inventory setting where theft creates hidden stock loss, then compared management responses including RFID. It explains how unseen loss can affect replenishment choices. The model is narrow and assumes information that a small dealer may not collect. RFID is outside this project; the practical lesson is to use counts and authorized adjustments to detect differences."),
    ("An E-Retailing Supply Chain Subject to Inventory Inaccuracies",
     "Rekik, Syntetos, and Jemai (2015) modeled inventory errors in centralized and decentralized online retail supply chains. The paper compares ignoring errors, estimating them, and using RFID to reduce them. It is an analytical model, not a field evaluation of small dealer operations. It reinforces the need to distinguish an order or booking from a physical stock movement and to avoid presenting planned records as live external data."),
    ("Inventory Record Inaccuracy and Store-Level Performance",
     "Shabani et al. (2021) analyzed more than five million item records from 81 fashion stores and used efficiency analysis to study the effect of record errors. Their method helps compare inventory accuracy and store performance. The data concern a large fashion retailer with short-season products, not frozen-food distribution. The study supports evaluating stock records together with operational results and clearly stating the study’s local limits."),
    ("Modelling Inventory Inaccuracies in E-Retailing and B2B Contexts",
     "Rekik, Syntetos, and Glock (2019) modeled the causes and effects of inventory errors in e-retailing and business-to-business settings. The work considers how inaccurate information affects replenishment and fulfillment decisions. Its models do not cover the exact booking, bodega, and delivery rules of Llano SELECTA Dealer. It supports treating customer commitments and physical stock as separate linked records."),
    ("An Econometric Analysis of Inventory Turnover Performance in Retail Services",
     "Gaur, Fisher, and Raman (2005) used financial data from 311 public retailers to study factors associated with inventory turnover. Their adjusted measure accounts for gross margin, capital intensity, and sales surprises. It is a firm-level analysis and does not measure day-to-day accuracy. It is relevant to future reporting, but the capstone should not compare a local dealer with large public retailers without comparable data."),
    ("Inventory Turnover Behaviour in the Greek Retail Sector",
     "Kolias, Dimelis, and Filios (2011) examined inventory turnover in Greek retail firms over 2000–2005 using company-level data. Their work shows that inventory performance can vary by retail setting and time. The period and country are different from the present study, and turnover does not explain every stock discrepancy. It supports defining reports carefully and interpreting them in the dealer’s own operating context."),
    ("Inventory Efficiency, Productivity, Responsiveness, and Retail Firm Performance",
     "Shockley and Turner (2015) studied how inventory efficiency, productivity, and responsiveness relate to retail firm outperformance. The paper encourages viewing inventory through more than a single quantity measure. It uses U.S. retail segment data rather than a local system evaluation. It supports reporting stock, delivery, and sales-related records together while reserving claims about performance improvement until measured."),
    ("RFID-Enabled Visibility and Retail Inventory Record Inaccuracy",
     "Hardgrave, Aloysius, and Goyal (2013) used field experiments to study whether RFID visibility can reduce retail inventory record errors. Their work tests a technology that can capture item movement more automatically. The hardware and tagging investment differ from this web system, which records user-entered events and barcode checks. It provides a comparison point and supports describing barcode verification as a practical, lower-complexity control."),
    ("Improving Inventory Management in the Retail Store: RFID Across Product Categories",
     "Hardgrave, Goyal, and Aloysius (2011) examined RFID tagging across product categories and found that its value depends on the category and process. The paper warns against assuming one identification technology works equally well everywhere. It does not examine the project’s specific cold-storage or delivery workflow. This supports using the existing monthly barcode-verification process and not claiming RFID functionality."),
    ("The Impact of RFID Technologies on Inventory Accuracy in Apparel Retailing",
     "Bertolini et al. (2015) compared RFID counts with conventional barcode counts in field trials at apparel stores. The reported RFID counts were more reliable in that setting. Apparel tagging conditions and investment are different from a dealer’s freezer checks, and the study does not establish that RFID is necessary here. It supports identifying barcode scans as an aid to verification rather than as proof of perfect stock accuracy."),
    ("Measuring the Impact of RFID on Out of Stocks at Wal-Mart",
     "Hardgrave, Langford, Waller, and Miller (2008) studied RFID use and product availability in a large retail chain. Their field evidence links improved item visibility with fewer out-of-stock events in that environment. The scale, product tagging, and infrastructure are not comparable to a single dealer. It supports the general purpose of accurate movement records while keeping the proposed solution’s scope realistic."),
    ("Retail and Wholesale Inventories: A Literature Review and Path Forward",
     "Marzolf, Miller, and Peinkofer (2024) reviewed research on retail and wholesale inventory and organized it by data level and predictor type. They note that wholesale settings receive less research attention than retail settings. A broad review cannot describe Llano’s actual workflow. It supports the specific research gap: a small local dealer needs an operational system shaped around bookings, receiving, deliveries, payments, and freezer verification."),
    ("GS1 General Specifications",
     "GS1 (2026) publishes rules for using product identification keys and barcodes in business applications. The standard helps ensure a barcode is treated as an identifier that must be checked and associated with a product record. It does not establish that every freezer or product label uses a GS1 code. It supports careful barcode entry and verification while keeping the project’s scanning function limited to recording checks."),
    ("Inventory Management for Retail Companies: A Literature Review and Current Trends",
     "Muñoz Macas et al. (2021) reviewed research on retail inventory tools and trends, including the role of manual records, spreadsheets, and enterprise systems. The review helps map common ways retailers manage stock. Its evidence spans different organizations and does not test this project. It supports a modular design that improves traceability while recognizing that the final system must fit the dealer’s own work practices."),
    ("Digital Transformation for SMEs in the Retail Industry",
     "Gouveia and Mamede (2022) proposed a decision model and prototype guide for planning digital change in retail small and medium enterprises, then applied it to one business process. Their work stresses alignment between technology and business needs. A single case cannot establish a universal transformation path. It supports building from the dealer’s real workflow and refining requirements before expanding features."),
    ("Toward SMEs Digital Transformation Success: A Systematic Literature Review",
     "Sagala and Őri (2024) reviewed SME digital-transformation studies and grouped recurring success factors, including organizational fit, learning, and incremental improvement. Their findings come from published research rather than a test of a particular POS. The review also notes that context matters. It supports iterative user review and training instead of assuming that installing software alone solves process problems."),
    ("Information and Communication Technology in SMEs: A Systematic Literature Review",
     "Yuwono, Suroso, and Novandari (2024) reviewed ICT adoption research in small and medium enterprises, with attention to developing-country barriers. They identify resource limits, gaps in ICT knowledge, and resistance to change as recurring concerns. The review spans many sectors. It supports simple interfaces, role-based training, and selection of tools that can run on available equipment."),
    ("Non-Uptake of a Low-Cost Retail Management Solution by Small Businesses",
     "Joseph et al. (2017) investigated why small retailers did not adopt a subsidized retail management solution in India. They interviewed retailers and compared the usability, setup, training, and features of existing tools. Their findings show that low price alone does not ensure use. The study supports involving staff in requirements work and checking whether reports and workflows answer real needs."),
    ("Determinants of Point-of-Sale System Adoption among Small Independent Retailers",
     "Plomp, Huiden, and Batenburg (2011) surveyed 37 small independent retailers in the Netherlands about POS adoption. Their adoption model examines perceived value and organizational conditions. The sample is small and country-specific, so it should not be generalized to Bukidnon. It supports asking staff about current tools, expected benefits, skill needs, and barriers before finalizing the system."),
    ("Measuring the Effect of a New Point-of-Sale System on Drugstore Operations",
     "Parkan (2003) evaluated operational performance before and after a new electronic POS system in drugstores using a performance measurement method. The study demonstrates how system effects can be examined against operating measures. A pharmacy chain has different transaction and stock requirements. It supports defining observable evaluation criteria for Llano, such as successful task completion and accurate saved records."),
    ("Use of Point-of-Service Systems in School Nutrition Programs",
     "Lee et al. (2017) surveyed school nutrition program managers about electronic and paper POS systems, system challenges, and staff training. Respondents reported concerns involving compatibility, report customization, and employee skills. The setting is school meal service, not a dealer. It supports including user training, report needs, and device compatibility in the planned requirements analysis."),
    ("Development and Implementation of a POS System for Retail Business",
     "Mangmang (2018) developed a retail POS with alerts for overdue payments and low stock and evaluated it using software-quality criteria. The local study shows how notifications can make exceptions visible to users. It does not cover the project’s delivery routes, freezer records, or external POS boundary. It supports relevant alerts while keeping their scope tied to dealer operations."),
    ("A Problem-Oriented Inventory and Point-of-Sale System for Company KCP",
     "Sison et al. (2019) described an inventory and POS design for a Philippine company, focusing on reducing duplicate data and protecting data integrity. Its problem-oriented approach links features to the organization’s workflow. It concerns one organization and does not establish broader results. It supports mapping the dealer’s process before designing the database and limiting duplicate entry."),
    ("Web-Based Inventory Management System for a Small Business",
     "Tanaman et al. (2023) presented a web-based inventory system for a small business in the Philippines. The project focuses on stock records and information access through a browser. It does not address the full combination of bookings, delivery reconciliation, payment records, and freezer checks in this study. It supports a browser-based approach while highlighting the need for dealer-specific modules."),
    ("Challenges and Perception on POS Adoption among Micro and Small Enterprises in Tacurong City",
     "Moreno et al. (2025) used a descriptive-correlational survey of 39 micro and small enterprises to examine POS challenges and perceptions. Their results report generally positive views and show that operating challenges relate to perceptions of the system. The sample and business types are limited. It supports measuring local user acceptance and documenting operational obstacles rather than assuming adoption."),
    ("Development of TrackPOS-IN for Small Stalls and Mobile Food Businesses",
     "Dalupang (2026) developed and piloted a web-and-mobile POS with inventory features for one food enterprise in Isabela using iterative prototyping. The project addressed fragmented records and delayed reconciliation, and its pilot included task-based user acceptance. It is a single-enterprise study with additional GPS and offline features outside this project. It provides a recent Philippine example of tying sales, stock, and reconciliation to users’ tasks."),
    ("Perceived Usefulness, Perceived Ease of Use, and User Acceptance of Information Technology",
     "Davis (1989) developed and tested measures for perceived usefulness and ease of use as factors in technology acceptance. The work provides a way to ask whether users see practical value and can learn a system. Its original context was not a dealer POS. It supports clear evaluation questions about ease of navigation and fit with daily booking, stock, delivery, and reporting tasks."),
    ("User Acceptance of Computer Technology: A Comparison of Two Models",
     "Davis, Bagozzi, and Warshaw (1989) compared technology-acceptance models using user data. The study connects beliefs about usefulness and ease with intention to use software. The models describe acceptance rather than operational accuracy. It supports assessing user response separately from functional tests, so a system that works technically is not automatically treated as easy to use."),
    ("An Integrated Model of Information Systems Adoption in Small Businesses",
     "Thong (1999) tested an adoption model with survey data from 166 small businesses. The study considers decision-maker, system, organization, and environment factors, including knowledge and perceived system attributes. It is not specific to frozen-food distribution. It supports gathering information from both management and staff and considering organizational readiness when setting requirements."),
    ("Adoption of New Information Technologies in Rural Small Businesses",
     "Premkumar and Roberts (1999) studied technology adoption among rural small businesses and identified influences such as perceived benefits, readiness, and external support. Their work emphasizes that local resources shape adoption. The context is rural U.S. firms and older technologies, so the exact barriers may differ. It supports checking device availability, support, and staff readiness during planning."),
    ("Diffusion of Innovations",
     "Rogers (2003) synthesized research on how innovations spread and explains characteristics such as relative advantage, compatibility, complexity, trialability, and observability. The book offers a theory rather than evidence about this dealer. It supports prototyping the interface with users and explaining how the proposed tool fits current routines before wider use."),
    ("The DeLone and McLean Model of Information Systems Success: A Ten-Year Update",
     "DeLone and McLean (2003) updated an information-system success model that relates system quality, information quality, service quality, use, satisfaction, and benefits. The model helps organize evaluation measures. It is a general framework, not a project-specific test. It supports evaluating the system using more than feature completion, including information accuracy and user satisfaction."),
    ("A Respecification and Extension of the DeLone and McLean Model of IS Success",
     "Seddon (1997) examined the information-system success model and clarified the links among system use, user satisfaction, and benefits. The paper helps distinguish system impact from user behavior. It is conceptual and does not set the dealer’s measures. It supports keeping planned acceptance feedback distinct from technical tests and operational records."),
    ("Design Science in Information Systems Research",
     "Hevner et al. (2004) describe design science as building and evaluating an artifact to address a relevant information-system problem. Their guidelines connect the solution to a real setting and existing knowledge. The paper is a research framework rather than a POS study. It supports presenting the system as an artifact and documenting requirements, design choices, and evaluation evidence."),
    ("A Design Science Research Methodology for Information Systems Research",
     "Peffers et al. (2007) proposed a structured process that moves from problem identification through objectives, design, demonstration, evaluation, and communication. The sequence is useful for planning a system-development study. It does not prescribe the dealer’s detailed software lifecycle. It supports the proposal’s clear phases and deliverables, including planned evaluation rather than invented results."),
    ("Empirical Studies of Agile Software Development: A Systematic Review",
     "Dybå and Dingsøyr (2008) reviewed empirical research on agile software development. They describe how collaboration and iterative development are studied while noting limits in the evidence base. Their review does not prove that Agile is best for every student project. It supports using short review cycles where dealer users can comment on working modules."),
    ("Manifesto for Agile Software Development",
     "Beck et al. (2001) set out values that emphasize working software, collaboration, and responding to change. The manifesto is a concise statement of principles, not a controlled study or full project plan. It supports regular feedback on prototypes, while the paper still defines concrete phases, acceptance criteria, and documentation."),
    ("The Scrum Guide",
     "Schwaber and Sutherland (2020) describe Scrum roles, events, and artifacts for iterative product development. The guide provides a framework for planning and reviewing work. It does not supply the team’s staffing, sprint schedule, or user availability. It supports short development cycles, but this capstone will adapt the practices to its actual team and adviser requirements."),
    ("Systems and Software Quality Requirements and Evaluation: Product Quality Model",
     "The International Organization for Standardization (ISO, 2023) defines a product-quality model for evaluating software. Its characteristics help teams translate broad expectations into quality questions and test criteria. A standard does not automatically prove that a specific application meets them. It supports selecting relevant measures, such as functional suitability, usability, reliability, security, and maintainability."),
    ("Ergonomics of Human-System Interaction: Usability Definitions and Concepts",
     "ISO 9241-11:2018 describes usability in relation to specified users, goals, and contexts of use. This makes usability dependent on real tasks and working conditions. It does not prescribe the project’s interface or sample size. It supports evaluating representative dealer tasks with the intended staff rather than asking only whether users like the screens."),
    ("Role-Based Access Control Models",
     "Sandhu et al. (1996) presented role-based access control models that assign permissions through user roles. The work provides a formal basis for separating administrator and staff access. It does not define Llano’s exact policy. It supports restricting account, product, transaction, and report actions according to approved responsibilities."),
    ("Republic Act No. 10173: Data Privacy Act of 2012",
     "The National Privacy Commission (2012) publishes the Philippine Data Privacy Act, which governs personal information processing through principles including transparency, legitimate purpose, and proportionality. The law is a compliance source, not a software test. It supports collecting only needed customer and staff data, limiting access, and explaining consent and secure handling during fieldwork."),
]


REFERENCES = [
    "Ahmad, K., & Zabri, S. M. (2018). The mediating effect of knowledge of inventory management in the relationship between inventory management practices and performance: The case of micro retailing enterprises. Journal of Business and Retail Management Research, 12(2), 83–93.",
    "Beck, K., Beedle, M., van Bennekum, A., Cockburn, A., Cunningham, W., Fowler, M., Grenning, J., Highsmith, J., Hunt, A., Jeffries, R., Kern, J., Marick, B., Martin, R. C., Mellor, S., Schwaber, K., Sutherland, J., & Thomas, D. (2001). Manifesto for agile software development. https://agilemanifesto.org/",
    "Bertolini, M., Bottani, E., Romagnoli, G., & Vignali, G. (2015). The impact of RFID technologies on inventory accuracy in the apparel retailing: Evidence from the field. International Journal of RF Technologies, 6(4), 225–246. https://doi.org/10.3233/RFT-150069",
    "Chuang, H. H.-C., & Oliva, R. (2015). Inventory record inaccuracy: Causes and labor effects. Journal of Operations Management, 39–40, 63–78. https://doi.org/10.1016/j.jom.2015.07.006",
    "Dalupang, R. C. (2026). Development of TrackPOS-IN: A digital solution for managing operations of small stalls and mobile food businesses. Isabela State University Linker: Journal of Engineering, Computing and Technology, 3(1), 56–71. https://doi.org/10.65141/ject.v3i1.n4",
    "Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319–340. https://doi.org/10.2307/249008",
    "Davis, F. D., Bagozzi, R. P., & Warshaw, P. R. (1989). User acceptance of computer technology: A comparison of two theoretical models. Management Science, 35(8), 982–1003. https://doi.org/10.1287/mnsc.35.8.982",
    "DeHoratius, N., & Raman, A. (2008). Inventory record inaccuracy: An empirical analysis. Management Science, 54(4), 627–641. https://doi.org/10.1287/mnsc.1070.0789",
    "DeLone, W. H., & McLean, E. R. (2003). The DeLone and McLean model of information systems success: A ten-year update. Journal of Management Information Systems, 19(4), 9–30. https://doi.org/10.1080/07421222.2003.11045748",
    "Dybå, T., & Dingsøyr, T. (2008). Empirical studies of agile software development: A systematic review. Information and Software Technology, 50(9–10), 833–859. https://doi.org/10.1016/j.infsof.2008.01.006",
    "Fleisch, E., & Tellkamp, C. (2005). Inventory inaccuracy and supply chain performance: A simulation study of a retail supply chain. International Journal of Production Economics, 95(3), 373–385. https://doi.org/10.1016/j.ijpe.2004.02.003",
    "Gaur, V., Fisher, M. L., & Raman, A. (2005). An econometric analysis of inventory turnover performance in retail services. Management Science, 51(2), 181–194. https://doi.org/10.1287/mnsc.1040.0298",
    "Gouveia, F. D. A., & Mamede, H. S. (2022). Digital transformation for SMEs in the retail industry. Procedia Computer Science, 204, 671–681. https://doi.org/10.1016/j.procs.2022.08.081",
    "GS1. (2026). GS1 general specifications (Release 26). https://ref.gs1.org/standards/genspecs/",
    "Hardgrave, B. C., Aloysius, J. A., & Goyal, S. (2013). RFID-enabled visibility and retail inventory record inaccuracy: Experiments in the field. Production and Operations Management, 22(4), 843–856. https://doi.org/10.1111/poms.12010",
    "Hardgrave, B. C., Goyal, S., & Aloysius, J. A. (2011). Improving inventory management in the retail store: The effectiveness of RFID tagging across product categories. Operations Management Research, 4(1–2), 6–13. https://doi.org/10.1007/s12063-011-0049-3",
    "Hardgrave, B. C., Langford, S., Waller, M., & Miller, R. (2008). Measuring the impact of RFID on out of stocks at Wal-Mart. MIS Quarterly Executive, 7(4), Article 4. https://aisel.aisnet.org/misqe/vol7/iss4/4/",
    "Haribhai-Pitamber, H. U., & Dhurup, M. (2014). Inventory control and valuation systems among retail SMEs in a developing country: An exploratory study. Mediterranean Journal of Social Sciences, 5(8), 81. https://doi.org/10.5901/mjss.2014.v5n8p81",
    "Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. MIS Quarterly, 28(1), 75–105. https://doi.org/10.2307/25148625",
    "International Organization for Standardization. (2018). Ergonomics of human-system interaction—Part 11: Usability: Definitions and concepts (ISO Standard No. 9241-11:2018). https://www.iso.org/standard/63500.html",
    "International Organization for Standardization. (2023). Systems and software engineering—Systems and software quality requirements and evaluation (SQuaRE)—Product quality model (ISO/IEC Standard No. 25010:2023). https://www.iso.org/standard/78176.html",
    "Joseph, N., Somal, H. S., Ilavarasan, P. V., & Kar, A. K. (2017). Non-uptake of a low cost retail management solution by small businesses: An empirical analysis. Procedia Computer Science, 122, 1001–1008. https://doi.org/10.1016/j.procs.2017.11.466",
    "Kang, Y., & Gershwin, S. B. (2005). Information inaccuracy in inventory systems: Stock loss and stockout. IIE Transactions, 37(9), 843–859. https://doi.org/10.1080/07408170590969861",
    "Karadağ, H. (2018). Cash, receivables and inventory management practices in small enterprises: Their associations with financial performance and competitiveness. Small Enterprise Research, 25(1), 69–89. https://doi.org/10.1080/13215906.2018.1428912",
    "Kolias, G. D., Dimelis, S. P., & Filios, V. P. (2011). An empirical analysis of inventory turnover behaviour in the Greek retail sector: 2000–2005. International Journal of Production Economics, 133(1), 143–153. https://doi.org/10.1016/j.ijpe.2010.04.026",
    "Lee, Y. M., Kwon, J., Park, E., Wang, Y., & Rushing, K. (2017). Use of point-of-service systems in school nutrition programs: Types, challenges, and employee training. The Journal of Child Nutrition & Management, 41(2). https://schoolnutrition.org/journal/fall-2017-use-of-point-of-service-systems-in-school-nutrition-programs-types-challenges-and-employee-training/",
    "Mangmang, G. B. (2018). Development and implementation of point of sale system (POS): Profitability measurement for retail business. Journal of Educational and Human Resource Development, 6(1), 220–226. https://doi.org/10.61569/5tc08q53",
    "Marzolf, M. J., Miller, J. W., & Peinkofer, S. T. (2024). Retail & wholesale inventories: A literature review and path forward. Journal of Business Logistics, 45(1), e12367. https://doi.org/10.1111/jbl.12367",
    "Moreno, J. G., Juanitas, J. A. M., Montales, F. M. L., & Bauzon, E. S. (2025). Challenges and perception on the adoption of point-of-sale system among micro and small enterprises in Tacurong City. Psychology and Education: A Multidisciplinary Journal, 35(5), 584–598. https://doi.org/10.70838/pemj.350508",
    "Muñoz Macas, C. V., Espinoza Aguirre, J. A., Arcentales Carrión, R. N., & Peña Ortega, M. P. (2021). Inventory management for retail companies: A literature review and current trends. In 2021 Second International Conference on Information Systems and Software Technologies (ICI2ST) (pp. 71–78). IEEE. https://doi.org/10.1109/ICI2ST51859.2021.00018",
    "National Privacy Commission. (2012). Republic Act No. 10173: Data Privacy Act of 2012. https://privacy.gov.ph/data-privacy-act/",
    "Otuya, S., & Eginiwin, E. J. (2017). Inventory management and SMEs profitability: A study of furniture manufacturing, wholesale and eatery industry in Delta State, Nigeria. Journal of Finance and Accounting, 5(3), 75–79. https://doi.org/10.12691/jfa-5-3-1",
    "Parkan, C. (2003). Measuring the effect of a new point of sale system on the performance of drugstore operations. Computers & Operations Research, 30(5), 729–744. https://doi.org/10.1016/S0305-0548(02)00047-3",
    "Peffers, K., Tuunanen, T., Rothenberger, M. A., & Chatterjee, S. (2007). A design science research methodology for information systems research. Journal of Management Information Systems, 24(3), 45–77. https://doi.org/10.2753/MIS0742-1222240302",
    "Premkumar, G., & Roberts, M. (1999). Adoption of new information technologies in rural small businesses. Omega, 27(4), 467–484. https://doi.org/10.1016/S0305-0483(98)00071-1",
    "Plomp, M. G. A., Huiden, R. P., & Batenburg, R. S. (2011). Determinants of point-of-sale system adoption: A survey among small independent retailers in the Netherlands. In Proceedings of the 17th Americas Conference on Information Systems. https://aisel.aisnet.org/amcis2011_submissions/276/",
    "Rekik, Y., Sahin, E., & Dallery, Y. (2008). Inventory inaccuracy in retail stores due to theft: An analysis of the benefits of RFID. International Journal of Production Economics, 112(1), 264–278. https://doi.org/10.1016/j.ijpe.2008.08.048",
    "Rekik, Y., Syntetos, A. A., & Jemai, Z. (2015). An e-retailing supply chain subject to inventory inaccuracies. International Journal of Production Economics, 167, 139–155. https://doi.org/10.1016/j.ijpe.2015.04.011",
    "Rekik, Y., Syntetos, A. A., & Glock, C. H. (2019). Modelling (and learning from) inventory inaccuracies in e-retailing/B2B contexts. Decision Sciences, 50(6), 1184–1223.",
    "Rogers, E. M. (2003). Diffusion of innovations (5th ed.). Free Press.",
    "Sagala, G. H., & Őri, D. (2024). Toward SMEs digital transformation success: A systematic literature review. Information Systems and e-Business Management, 22(4), 667–719. https://doi.org/10.1007/s10257-024-00682-2",
    "Sandhu, R. S., Coyne, E. J., Feinstein, H. L., & Youman, C. E. (1996). Role-based access control models. Computer, 29(2), 38–47. https://doi.org/10.1109/2.485845",
    "Schwaber, K., & Sutherland, J. (2020). The Scrum guide: The definitive guide to Scrum: The rules of the game. https://scrumguides.org/scrum-guide.html",
    "Seddon, P. B. (1997). A respecification and extension of the DeLone and McLean model of IS success. Information Systems Research, 8(3), 240–253. https://doi.org/10.1287/isre.8.3.240",
    "Shabani, A., Maroti, G., de Leeuw, S., & Dullaert, W. (2021). Inventory record inaccuracy and store-level performance. International Journal of Production Economics, 235, 108111. https://doi.org/10.1016/j.ijpe.2021.108111",
    "Sison, P., Oreiro, K., Camalit, J., & Ng, G. (2019). A problem-oriented approach to implementing an inventory and point-of-sale system for Company KCP. Innovatus, 2(1), 95–100. https://doi.org/10.5281/zenodo.4484959",
    "Sommerville, I. (2015). Software engineering (10th ed.). Pearson.",
    "Tanaman, M. T., Baylosis, J. L. A., Abiles, B. J. A., Catungal, M. L. P., & Encarnacion, P. C. (2023). Web-based inventory management system. International Journal of Science and Applied Information Technology, 12(5), 44–48. https://doi.org/10.30534/ijsait/2023/021252023",
    "Thong, J. Y. L. (1999). An integrated model of information systems adoption in small businesses. Journal of Management Information Systems, 15(4), 187–214. https://doi.org/10.1080/07421222.1999.11518227",
    "Yuwono, T., Suroso, A., & Novandari, W. (2024). Information and communication technology in SMEs: A systematic literature review. Journal of Innovation and Entrepreneurship, 13, Article 31. https://doi.org/10.1186/s13731-024-00392-6",
    "Saren, J. L., Galiposo, A. R., Servandil, E. L., Canama, G., Buagas, J., Responso, D. M., & Bacong, K. M. (2026a). Llano SELECTA dealer interview questionnaire [Unpublished questionnaire]. ACLC College of Bukidnon.",
    "Saren, J. L., Galiposo, A. R., Servandil, E. L., Canama, G., Buagas, J., Responso, D. M., & Bacong, K. M. (2026b). Llano SELECTA dealer POS and inventory system [Unpublished software repository and database schema]. ACLC College of Bukidnon.",
    "Saren, J. L., Galiposo, A. R., Servandil, E. L., Canama, G., Buagas, J., Responso, D. M., & Bacong, K. M. (2026c). Llano SELECTA dealer project proposal letter [Unpublished proposal]. ACLC College of Bukidnon.",
]


def main():
    WORK.mkdir(exist_ok=True)
    img_paths = {n: WORK / f"{n}.png" for n in ("methodology", "flow", "architecture", "dfd", "erd")}
    figure_methodology(img_paths["methodology"])
    figure_flow(img_paths["flow"])
    figure_architecture(img_paths["architecture"])
    figure_dfd(img_paths["dfd"])
    figure_erd(img_paths["erd"])

    doc = Document(TEMPLATE)
    body = doc._element.body
    sect = body.sectPr
    for child in list(body):
        if child is not sect:
            body.remove(child)

    sec = doc.sections[0]
    sec.page_width = Inches(8.268)
    sec.page_height = Inches(11.693)
    sec.left_margin = Inches(1.25); sec.right_margin = Inches(1.0)
    sec.top_margin = Inches(1.0); sec.bottom_margin = Inches(1.0)
    sec.header_distance = Inches(1.1); sec.footer_distance = Inches(.5)
    sec.different_first_page_header_footer = True

    # Cover page: same order as the college template.
    for text, size, bold, before, after in [
        ("ACLC COLLEGE OF BUKIDNON CAMPUS", 14, True, 30, 2),
        ("3535 TS. Fashion Bldg., Hagkol, Valencia City, Bukidnon", 11, False, 0, 28),
        ("Llano SELECTA Dealer POS and Inventory system", 16, True, 8, 24),
        ("A Capstone Project Proposal Presented to the Faculty of", 12, False, 2, 0),
        ("ACLC College of Bukidnon CAMPUS", 12, True, 0, 0),
        ("Valencia City, Bukidnon", 12, False, 0, 20),
        ("In Partial Fulfilment of the", 12, False, 0, 0),
        ("Requirements for the Subject Capstone", 12, False, 0, 0),
        ("for the Degree of Bachelor", 12, False, 0, 0),
        ("of Science in Information Technology", 12, False, 0, 18),
        ("By", 12, False, 0, 6),
        ("Jhunnel L. Saren", 12, False, 0, 0),
        ("Ace Rienchlee Galiposo", 12, False, 0, 0),
        ("Ed Laurence Servandil", 12, False, 0, 0),
        ("Gino Canama", 12, False, 0, 0),
        ("Jasper Buagas", 12, False, 0, 0),
        ("Dan Micheal Responso", 12, False, 0, 0),
        ("Kent Michael Bacong", 12, False, 0, 20),
        ("Academic Year 2026–2027", 12, False, 0, 2),
        ("DECEMBER 2026", 12, False, 0, 0),
    ]:
        p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.first_line_indent=Inches(0); p.paragraph_format.space_before=Pt(before); p.paragraph_format.space_after=Pt(after); p.paragraph_format.line_spacing=1.1
        r=p.add_run(text); r.bold=bold; r.font.name="Arial"; r._element.rPr.rFonts.set(qn("w:eastAsia"),"Arial"); r.font.size=Pt(size)

    # Table of contents field for Word to populate after pagination.
    p=doc.add_paragraph(); p.paragraph_format.page_break_before=True
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before=Pt(5); p.paragraph_format.space_after=Pt(18)
    r=p.add_run("TABLE OF CONTENTS"); r.bold=True; r.font.name="Arial"; r.font.size=Pt(12)
    p=doc.add_paragraph(); pformat(p,WD_ALIGN_PARAGRAPH.LEFT,False,after=0,line=1.15)
    add_toc_field(p)
    p.paragraph_format.keep_together=True

    # Chapters 1–3.
    add_heading(doc,"Chapter 1",1,True)
    add_heading(doc,"PROJECT AND ITS BACKGROUND",1)
    add_para(doc,"This chapter explains the work carried out by Llano SELECTA Dealer, the record-keeping challenges identified in the project proposal, and the purpose and boundaries of the proposed system. The project will organize dealer-side bookings, deliveries, product and stock records, payment records, and freezer monitoring. It is intended to support the dealer’s operations while leaving the official SELECTA POS in place (Saren et al., 2026c).")
    add_heading(doc,"Project Context",2)
    add_para(doc,"Llano SELECTA Dealer is located at P18 Malabuaya Batangan, Valencia City, Bukidnon. It supplies stores and customers in Batangan, San Isidro, and Lumabayo in Valencia City, throughout the Cabanglasan area, and throughout the San Fernando area (project team, personal communication, October 31, 2026). The team reports using Excel and hardcopy order sheets to record store-level product quantities, with separate records for receiving, delivery, payment collection, and monthly freezer checks (project team, personal communication, October 31, 2026). The project proposal also identifies the need to organize dealer-side records (Saren et al., 2026c).")
    add_para(doc,"The dealer already uses the official SELECTA POS to submit product orders to the SELECTA bodega and record sales against a monthly quota. This is SELECTA’s POS, not a dealer-owned ordering platform (project team, personal communication, October 31, 2026). The proposed Llano SELECTA Dealer POS and Inventory system will support the dealer’s own booking, receiving, stock, delivery, invoice, payment-record, freezer, and reporting work. It will not replace or directly connect to SELECTA’s POS. The dealer system may hold an external order reference or manually entered quota figure for review (Saren et al., 2026b, 2026c).")
    add_heading(doc,"Current Business Flow",2)
    add_para(doc,"A booker travels to stores on the assigned route, usually on Monday or Tuesday, alone or with a backride. One example is Valencia–San Fernando on Monday and Cabanglasan on Tuesday; the exact route and assigned person may change with staff availability. The booker records each store’s requested products and quantities in an Excel sheet and a hardcopy form. The booker then gives the records to the owner, who reviews the total and places the bodega order through the official SELECTA POS. The proposed dealer system can keep the store booking and the external POS reference together, but the owner must still submit the order in SELECTA’s system (project team, personal communication, October 31, 2026).")
    add_para(doc,"When the SELECTA truck arrives at the dealer, staff and a checker compare the delivered products with the order documents and inspect each item, especially the ice-cream packaging. They record the arrival date, truck plate number, quantities received, and any damaged, melted, or missing products; the receiver signs the delivery document. In the described cycle, the truck may arrive on Wednesday, followed by dealer deliveries on later days. Thursday to Cabanglasan and Friday to the Valencia–San Fernando route are examples, not fixed schedules. Staff prepare store-specific ice boxes, tape and label them with each store’s name, and load them into the Bongo delivery vehicle. A usual delivery crew has a driver and two staff members to load and unload products, but assignments can change (project team, personal communication, October 31, 2026).")
    add_para(doc,"At each store, the delivery team checks the products actually handed over against the order and receipt. If an item is missing from a store’s box, the staff record the short quantity and deduct it from that customer’s bill. Melted or otherwise unsaleable products, called BO in the supplied workflow, are brought back to the dealer and deducted from the store’s bill. The staff member carrying the receipts totals the sales or purchase orders and compares the expected collection with the money received. Customers may pay in cash, GCash, or by bank check. The team reports that cash can sometimes be short, including by about ₱1,000. The owner or assigned staff later enters the sales and quota information in the official SELECTA POS. The monthly quota changes; ₱1,000,000 is an example, not a permanent target (project team, personal communication, October 31, 2026).")
    add_para(doc,"SELECTA owns the freezers assigned to stores. The supplied workflow describes a ₱10,000 payment when a freezer is placed: ₱9,000 for the initial products and ₱1,000 as a processing fee. The exact collection and accounting rules will be confirmed with the owner before they are treated as final system requirements. Each month, staff scan the freezer barcode in the Timemark phone app and take a photo of the code. The proposed dealer system can record the freezer, verification month, scanned barcode, responsible staff member, and photo or manual reference, but it will not connect automatically to Timemark (project team, personal communication, October 31, 2026).")
    add_para(doc,"These details describe the project team’s current understanding of the workflow. The blank interview questionnaire contains no responses, so the study will confirm the steps, amounts, responsibilities, and exceptions with the owner and staff before finalizing requirements. No interview findings or measured results are claimed at this stage (Saren et al., 2026a).")
    add_para(doc,"The attached interview questionnaire asks about staff roles, booking channels, records, current tools, stock, delivery scheduling, freezer checks, reports, access rights, and desired functions. It is blank and contains no interview answers. The researchers will use it to learn how the dealer works and confirm which functions are needed before final evaluation. The project therefore presents the system’s planned capabilities and study methods, not measured improvements or completed interview findings (Saren et al., 2026a).")
    add_para(doc,"The purpose of this capstone is to develop and evaluate a dealer-side web system that gives authorized users a consistent way to manage operational records and review their status. The design follows the project’s current repository as a starting point, then uses user requirements and testing to guide refinements. It aims to improve record organization and traceability, with actual usability and quality results to be established during the study (Saren et al., 2026b).")

    add_heading(doc,"Problem Statement",2)
    add_para(doc,"Llano SELECTA Dealer needs one organized way to connect store bookings, the owner’s separate SELECTA bodega order, truck receiving, stock records, store deliveries, invoice deductions, payment collection, route reconciliation, and freezer verification. Excel and hardcopy records support bookings, while SELECTA POS and Timemark remain separate tools. The study will examine whether a dealer-side system can make these records easier to follow without replacing or integrating directly with SELECTA POS or Timemark.")
    add_para(doc,"Specifically, the study will answer the following questions:",indent=False)
    problems=[
        "How are store bookings grouped by route and transferred from the booker to the owner for a separate order in SELECTA POS?",
        "How can the system record ordered, received-good, damaged or melted, and missing quantities, together with the truck and receiving details?",
        "How can the system record route assignments, store delivery results, BO and shortage deductions, returns, and per-store invoices?",
        "How can the system record cash, GCash, and check payments and compare expected collections with actual route totals while keeping SELECTA POS and Timemark separate?",
        "How well does the completed system meet its functional requirements and the selected software-quality criteria when evaluated by intended users and technical reviewers?",
    ]
    for i,t in enumerate(problems,1): add_numbered(doc,i,t)

    add_heading(doc,"Objectives of the Study",2)
    add_para(doc,"General Objective",bold_lead="General Objective",indent=False,after=4)
    add_para(doc,"To design, develop, and evaluate a web-based dealer POS and inventory system for Llano SELECTA Dealer that organizes its bookings, inventory, deliveries, payment records, freezer checks, and operational reports.")
    add_para(doc,"Specific Objectives",bold_lead="Specific Objectives",indent=False,after=4)
    objectives=[
        "To document and analyze route booking, SELECTA POS ordering, stock receiving, store delivery, invoice adjustment, payment collection, freezer verification, and staff-assignment workflows.",
        "To develop dealer-side records for store bookings, external bodega order references, receiving checks, inventory movements, route runs and crew, store delivery outcomes, invoices, payment methods, freezer fees, and monthly verification evidence.",
        "To provide status views and reports for bookings, received and saleable stock, missing and BO returns, invoice deductions, payment totals and variances, quota references, freezer checks, and audit history.",
        "To test the system’s functional requirements and evaluate selected quality criteria, including functional suitability, usability, reliability, and security, with intended users and qualified reviewers.",
    ]
    for i,t in enumerate(objectives,1): add_numbered(doc,i,t)

    add_heading(doc,"Significance of the Study",2)
    add_para(doc,"Llano SELECTA Dealer owner. The owner may review route bookings, the external SELECTA order reference, receiving differences, delivery adjustments, payment totals, cash variance, quota references, and freezer checks in one dealer-side system. The views can support follow-up but do not guarantee better sales or remove the need for physical counts and approval.")
    add_para(doc,"Dealer staff. Bookers, checkers, drivers, loaders, and receipt carriers may see the records relevant to their assigned work. Recording the assigned people for each route run can help the dealer keep a history when a booker or driver is replaced or when staff availability changes.")
    add_para(doc,"Customers and stores. Customers do not directly use the proposed application. Clearer store-level quantities and records of missing or BO products may help staff explain invoice deductions and payment balances and relay accurate updates.")
    add_para(doc,"The researchers. The project gives the researchers practice in gathering requirements, designing a web information system, coordinating data across related modules, and evaluating a working application with users.")
    add_para(doc,"Future researchers and developers. The documented workflows, data structure, system boundary, and evaluation plan may serve as a reference for later work on dealer operations. Future work can compare measured outcomes or add features only after confirming the dealer’s needs and external approvals.")

    add_heading(doc,"Scope and Limitations",2)
    add_para(doc,"Scope",bold_lead="Scope",indent=False,after=3)
    add_para(doc,"The study covers a web-based dealer-side application for Llano SELECTA Dealer at P18 Malabuaya Batangan, Valencia City, Bukidnon, serving the stated Valencia City, Cabanglasan, and San Fernando areas. Authorized owner or administrator and staff accounts may use the application through a browser. Planned modules cover user roles; customer and product records; store bookings by route and date; manual SELECTA order references; bodega receiving with expected, good, damaged or melted, and missing quantities; inventory balances and movement history; route runs and changing crew assignments; store stops and delivered-item outcomes; invoices and deductions for shortages or BO returns; cash, GCash, and check records; expected-versus-actual route reconciliation; freezer custody and the described fee breakdown; monthly barcode verification and photo evidence; notifications; reports; settings; and audit history. Data include the dates, quantities, statuses, references, staff activity, and customer details needed for these operations.")
    add_para(doc,"Limitations",bold_lead="Limitations",indent=False,after=3)
    add_para(doc,"The dealer application will not replace, modify, or directly integrate with SELECTA POS, the SELECTA bodega system, or Timemark. Owners will still place bodega orders and record quota sales in SELECTA POS; Timemark scans will remain separate, with any dealer-side record entered or uploaded by staff. The application will not process cash, GCash, bank checks, or other payments, and it cannot confirm settlement with a bank or payment provider. It will record user-reported amounts and route variances for review. It will not provide accounting or tax filing, demand forecasting, automatic purchase approval, GPS tracking, route optimization, temperature sensors, or automatic freezer monitoring. Routes, days, quota targets, staff, and the freezer-fee policy may change and must be confirmed before implementation. Reports depend on timely entries, physical checks, and reconciliation. The study will not claim reduced errors or processing time until baseline and post-use evidence are collected.")

    add_heading(doc,"Definition of Terms",2)
    terms=[
        ("Audit history","The system’s record of selected user actions and changes, used to review when and by whom a record was created or updated."),
        ("Barcode verification","A scheduled check in which an authorized user scans or records product barcode information to verify freezer or product records."),
        ("Booking","A customer request or commitment recorded for products and a planned delivery; creating it alone does not reduce on-hand stock."),
        ("Bongo delivery vehicle","The vehicle named by the dealer for carrying prepared store orders on dealer delivery runs."),
        ("Bodega order","A dealer record for products requested from the bodega or supplier before receiving quantities are confirmed."),
        ("BO","The term used by the dealer for melted or otherwise unsaleable products that are returned and deducted from the store’s bill."),
        ("Freezer asset","A freezer owned by SELECTA and assigned to a store; the dealer system may record its barcode, assigned location, fee details, and verification history."),
        ("Inventory ledger","A dated history of stock increases and decreases, with the movement type, product, quantity, and responsible user."),
        ("Payment record","A record of amount, method, date, and reference for a payment reported by the user; it is not a payment transaction processor."),
        ("Route reconciliation","A comparison of the route’s expected cash and other recorded payments with the actual amounts counted or confirmed, including any variance."),
        ("SELECTA POS","The existing SELECTA system used by the owner to submit bodega product orders and record quota sales; it remains separate from the proposed dealer application."),
        ("Timemark verification","The current monthly phone-based process for scanning a SELECTA freezer barcode and taking a photo of the code."),
        ("Role-based access","Permission controls that limit system functions according to a user’s assigned role."),
        ("Saleable stock","Product quantity recorded as available for a new booking or other authorized dealer action."),
        ("System quality evaluation","A planned assessment of selected software criteria, user task results, and feedback using defined measures."),
    ]
    for term,definition in sorted(terms,key=lambda x:x[0].casefold()): add_term(doc,term,definition)

    add_heading(doc,"Chapter 2",1,True)
    add_heading(doc,"REVIEW OF RELATED LITERATURE AND STUDIES",1)
    add_para(doc,"This chapter reviews 50 related studies, frameworks, and standards that inform inventory accuracy, retail POS use, small-business adoption, software design, and evaluation. The sources are discussed in terms of what they studied, what they found or proposed, and how their limits affect this project. Studies from other industries and countries provide useful design guidance, but their results are not treated as evidence about Llano SELECTA Dealer.")
    add_heading(doc,"Related Literature",2)
    add_para(doc,"Retail systems depend on records that agree with physical events. Research on inventory inaccuracy shows that errors can affect replenishment and product availability, while auditing and consistent movement records can help identify where differences begin. Other studies show that technology choices must match the size, roles, and readiness of the organization. For this project, these findings support clear transaction histories, role-specific functions, user review, and a narrow integration boundary.")
    groups=[
        ("Inventory control and record accuracy",1,15),
        ("Retail identification and inventory visibility",16,21),
        ("Digital tools and POS systems in small organizations",22,35),
        ("Technology adoption, system success, and evaluation",36,50),
    ]
    for label,start,end in groups:
        add_heading(doc,label,2)
        for idx in range(start-1,end):
            title,body=ANNOTATIONS[idx]
            add_para(doc,f"{idx+1}. {body}",bold_lead=f"{idx+1}.",after=7,keep=True)
    add_heading(doc,"Synthesis and Research Gap",2)
    add_para(doc,"The reviewed literature points to four connected lessons. First, computer records are useful only when they reflect actual events. Studies on record inaccuracy connect hidden losses, delayed updates, and unverified receipts with stock errors and out-of-stock decisions. Second, visibility should follow the process: customer bookings, physical receipts, stock reservations, dispatch, and final delivery are separate events. A system should keep them linked without reducing stock at the wrong stage. Third, small-business systems are adopted more readily when functions fit the users’ work, equipment, skills, and reporting needs. Finally, system quality should be evaluated through task results and user experience, not only through the presence of features.")
    add_para(doc,"Existing research and local system projects demonstrate POS, inventory, and web applications for retailers, small enterprises, and other service settings. Many focus on checkout transactions or general stock tracking. RFID studies examine higher-cost item visibility; adoption studies often cover different countries or business types; system-development studies usually report a single organization or pilot. These sources do not establish the dealer’s actual booking, bodega, delivery, payment-record, and freezer procedures, and their reported results cannot be transferred directly to Llano SELECTA Dealer.")
    add_para(doc,"The project gap is therefore local and operational. The dealer needs a system designed around its own records and the link among customer bookings, bodega receiving, stock movements, delivery outcomes, payment records, and freezer verification. It also needs a clear separation from the official SELECTA POS. The proposed capstone addresses this gap with a dealer-side web system, documented user requirements, traceable records, role-based access, operational reports, and planned quality evaluation. This contribution is a fit-for-setting application and evaluation plan, not a claim that no similar POS or inventory system exists.")

    add_heading(doc,"Chapter 3",1,True)
    add_heading(doc,"RESEARCH METHODOLOGY",1)
    add_para(doc,"This chapter explains how the researchers will study dealer workflows, confirm system requirements, refine the application, and evaluate it. The method combines a developmental system project with descriptive requirement gathering and task-based software evaluation. No participant results or quality scores are reported in this proposal; they will be collected after access, consent, and evaluation measures are agreed with the dealer.")
    add_heading(doc,"Research Setting",2)
    add_para(doc,"The study will be conducted at Llano SELECTA Dealer, located at P18 Malabuaya Batangan, Valencia City, Bukidnon. The dealer serves the Batangan, San Isidro, and Lumabayo areas of Valencia City, the whole Cabanglasan area, and the whole San Fernando area (project team, personal communication, October 31, 2026). The setting is relevant because the planned system supports the dealer’s route bookings, SELECTA truck receiving, store deliveries, payment reconciliation, and freezer checks. Expected participants include the owner or administrator and staff who book orders, check receiving, drive or load deliveries, carry receipts, record payments, or verify freezers. Since staff and drivers may be replaced, the study will include people who perform these tasks during data gathering rather than assume fixed assignments. Final participant numbers will be agreed with the dealer (Saren et al., 2026c).")
    add_para(doc,"Customers and suppliers are not planned direct users of the dealer application. Customers give orders to the booker or staff. The owner continues to place product orders and record quota sales in the official SELECTA POS. Monthly freezer barcode scans remain in Timemark. The dealer system may store a manual POS reference and its own freezer verification evidence, but no automated connection to either external application is assumed.")
    add_heading(doc,"Research Design",2)
    add_para(doc,"The study will use a developmental research design. The main output is a working software artifact created to address an identified operational problem. The researchers will document the existing process, translate user needs into requirements, design and refine the application, test the functions, and evaluate selected quality criteria with intended users and qualified technical reviewers. This design fits a capstone that develops and assesses an information system (Hevner et al., 2004; Peffers et al., 2007).")
    add_para(doc,"The study will use descriptive techniques during requirements gathering and evaluation. Interview responses and process observations will be summarized by topic, while system checks will record whether defined test cases pass. User evaluation will use task-based questions and a structured rating form selected with the adviser. If a numeric quality score is reported, the researchers will identify the scale, respondents, and scoring method. Results will describe the tested prototype and participating setting only; they will not be generalized to all SELECTA dealers.")
    add_heading(doc,"Data Gathering and Requirements Analysis",2)
    add_para(doc,"Requirements will be gathered through the attached structured and open-ended interview questionnaire, a process walkthrough, and authorized review of the dealer’s Excel and hardcopy order sheets, SELECTA receiving documents, delivery receipts, payment records, and freezer-verification examples. The questionnaire asks about staff roles, booking channels, current tools, SELECTA POS use, stock and freezer checks, reports, access rights, pain points, and desired functions. It is blank and contains no interview answers, so it is an instrument for future data gathering, not a source of completed findings (Saren et al., 2026a).")
    add_para(doc,"The researchers will invite the owner or administrator and staff who perform booking, receiving checks, driving, loading, receipt collection, payment recording, or freezer verification. Participants will be selected purposively because they can describe or perform relevant tasks. Because staffing and driver assignments can change, the final participant list will reflect the people available during the approved study period. The number will be agreed with the dealer and documented before data collection rather than guessed in this paper.")
    add_para(doc,"With permission, the researchers will walk through a normal weekly cycle: record store quantities by route, prepare the owner’s SELECTA POS order, receive the truck, inspect and count products, prepare store-labeled boxes, deliver products, record shortages and BO returns, adjust invoices, reconcile cash and other payments, and check freezer-verification records. The team will note inputs, decisions, handoffs, exceptions, and outputs users need. They will review only records needed to understand the workflow and will avoid copying customer identifiers into the manuscript. The Excel and hardcopy examples will be checked against interview responses and observations when provided and approved.")
    add_para(doc,"The researchers will group notes into functional requirements, quality requirements, business rules, user roles, reports, and external-system limits. Repeated themes such as duplicate entry, receiving differences, missing or BO items, unexplained cash variance, delayed updates, or difficulty finding a record will be reported only when participants or approved records support them. A requirements list will be reviewed with the dealer representative before final system changes. Participants will be informed of the purpose, voluntary nature, and use of their information. Personal information will be limited to what is necessary, access will be restricted, and stored research notes will be handled according to the Data Privacy Act principles (National Privacy Commission, 2012).")
    add_heading(doc,"System Development Methodology",2)
    add_para(doc,"The researchers will use iterative development with short build-and-review cycles. This is suitable because user feedback may clarify operational details after staff see a working screen. Each cycle will select a small set of approved requirements, design and implement them, check the functions, and review the result with the project team and, when available, a dealer representative. The approach follows iterative software-development principles while keeping the study’s phases and deliverables visible (Dybå & Dingsøyr, 2008; Schwaber & Sutherland, 2020; Sommerville, 2015).")
    add_image(doc,img_paths["methodology"])
    add_caption(doc,"Figure 1. Iterative System Development Methodology")
    add_para(doc,"The process begins with planning and confirmation of business needs. During design, the team prepares screen layouts, data relationships, user roles, and system flows. Development implements approved modules and connects the web client, API, and database. Testing checks each function against requirements and records defects for correction. Review collects user feedback, confirms remaining work, and updates the next cycle. The study will retain requirement notes, design diagrams, code changes, test cases, and review decisions as project evidence.")
    add_heading(doc,"Methodology Phase Guide",2)
    add_table(doc,["Phase","What the Team Will Do","Expected Deliverable"],[
        ("Planning","Confirm objectives, users, current workflows, project boundary, and approved requirements.","Requirements list and work plan"),
        ("Design","Prepare use flows, screen drafts, architecture, DFD, ERD, and access rules.","Reviewed design and data model"),
        ("Development","Build or refine route bookings, receiving differences, stock, delivery outcomes, invoice deductions, payment reconciliation, freezer checks, and reports.","Working application increments"),
        ("Testing","Check stock counts, missing and BO deductions, payment totals and cash variance, barcode matching, roles, and report accuracy; record issues and retest fixes.","Test records and corrected build"),
        ("User review","Ask the owner and available bookers, checkers, drivers, loaders, or receipt carriers to complete agreed tasks and give structured feedback.","Task notes, feedback, and quality summary"),
        ("Documentation","Prepare user instructions, final project report, and system limitations.","Capstone manuscript and user guide"),
    ],[1.15,2.85,2.0],10)

    add_heading(doc,"System Flow",2)
    add_para(doc,"An authorized booker records store quantities and route information in the dealer system. The owner reviews the grouped demand and separately enters the approved bodega order in SELECTA POS; the dealer system may keep its reference. At truck receiving, staff record the arrival date, truck plate, receiver and checker, and each item’s expected, good, damaged or melted, and missing quantities. Only accepted saleable stock increases the usable balance; damaged or missing quantities are recorded separately. The receiver signs the truck document after the check.")
    add_para(doc,"After receiving, an authorized user creates a route run and assigns the available driver and two loading staff or other approved crew. Staff prepare store-labeled, taped ice boxes and load the Bongo vehicle. At each delivery stop they record the ordered and loaded quantities, accepted items, shortages, BO items returned, and intact items brought back. The invoice is based on accepted quantities and approved deductions. Staff record each cash, GCash, or check payment, then compare the route’s expected collection with the actual cash counted and other recorded payments. A variance is saved with a reason for review. SELECTA POS quota entry and Timemark barcode scans remain separate tasks; staff may enter external references or verification evidence in the dealer system manually. Incomplete or rejected data return to the user for correction.")
    add_image(doc,img_paths["flow"])
    add_caption(doc,"Figure 2. Proposed System Flow")

    add_heading(doc,"System Architecture",2)
    add_para(doc,"The application uses a browser-based client, an application API, and a relational database. The client is built with React and TypeScript using Vite. It sends requests to a Node.js and Express API, where user access and operational rules are checked. The API uses Prisma to read and write MySQL records. The current repository includes modules for customers, route bookings, bodega-order references, stock receiving, inventory movements, delivery runs and item outcomes, invoices and payments, route reconciliation, freezers and monthly barcode verification, reports, notifications, settings, and audit history (Saren et al., 2026b).")
    add_para(doc,"The official SELECTA POS, SELECTA bodega ordering, Timemark, banks, and GCash remain external. The owner manually enters orders and quota details in SELECTA POS; staff record references in the dealer application. Staff scan freezer barcodes and take the code photo in Timemark, then may add evidence to the dealer record if required. Payment methods are recorded after payment; the application does not move money or confirm a bank or GCash settlement. A production host, network security configuration, backups, and deployment responsibilities must be confirmed with the dealer before live use. The diagram describes application components and external boundaries, not a deployed environment.")
    add_image(doc,img_paths["architecture"])
    add_caption(doc,"Figure 3. Proposed System Architecture")

    add_heading(doc,"System Development Requirements",2)
    add_para(doc,"The table lists a practical proposed setup for development and operation. Final devices will depend on the dealer’s existing equipment and the approved deployment plan. A phone with a camera supports the current Timemark barcode scan and photo process; the dealer application stores its own verification entry and does not control Timemark. The project does not require RFID, IoT, or payment-processing hardware.")
    add_para(doc,"Hardware Requirements",bold_lead="Hardware Requirements",indent=False,after=4)
    add_table(doc,["Requirement","Proposed Specification","Purpose"],[
        ("Development computer","Computer with a modern multi-core processor, at least 8 GB RAM, and SSD storage","Runs the browser client, API, database, and development tools during project work."),
        ("User workstation","Desktop or laptop with a current web browser, keyboard, and reliable access to the dealer network","Allows staff and administrators to use the web application."),
        ("Application/database host","Local or managed server with sufficient storage, access controls, and backup capacity; final host to be approved","Stores application services and operational records for the agreed environment."),
        ("Phone with camera","Existing phone with the Timemark app and camera, subject to dealer policy","Scans SELECTA freezer barcodes monthly and captures the code photo; any dealer-system entry is manual."),
        ("Barcode reader","Optional USB reader for dealer-system data entry, if approved","Helps enter a barcode in the dealer application; it does not replace the Timemark scan."),
    ],[1.45,2.2,2.35],9.5)
    add_para(doc,"Software Requirements",bold_lead="Software Requirements",indent=False,after=4)
    add_table(doc,["Requirement","Proposed Specification","Purpose"],[
        ("Client framework","React 18.3.1, TypeScript 5.6.3, Vite 5.4.11","Builds the browser interface and client-side logic."),
        ("API runtime and framework","Node.js runtime with Express 4.21.1 and TypeScript 5.6.3","Serves requests and applies application rules."),
        ("Data access","Prisma ORM 5.22.0","Maps application records to the relational database."),
        ("Database","MySQL; local development setup documented with Laragon","Stores user, product, booking, stock, delivery, freezer, payment-record, and audit data."),
        ("Web browser","Current version of a standards-compliant browser","Displays the client interface to authorized users."),
        ("Development tools","Git and the project’s package manager / scripts","Supports source management and repeatable project setup."),
        ("Security and privacy practices","Role permissions, secure password handling, limited data collection, and approved backup controls","Reduces unnecessary access and supports responsible handling of business and personal information."),
    ],[1.45,2.2,2.35],9.5)

    add_heading(doc,"Data Flow Diagram (DFD)",2)
    add_para(doc,"The context diagram treats the proposed application as one process. The owner or administrator provides user, role, product, setting, quota, and SELECTA order-reference information. Dealer staff enter route bookings, receiving checks, delivery outcomes, invoice deductions, payment details, route reconciliation, and freezer-verification evidence, then receive status views and reports. Customers give requests to staff and receive their products and receipts; they are not direct users in the current scope. SELECTA POS and bodega records and Timemark barcode scans remain external. Staff may enter references or attach a photo manually, but the diagram shows no system-to-system integration or payment processing.")
    add_image(doc,img_paths["dfd"])
    add_caption(doc,"Figure 4. Context Data Flow Diagram of the Proposed System")

    add_heading(doc,"Entity Relationship Diagram (ERD)",2)
    add_para(doc,"The ERD groups the core records that support booking, ordering, receiving, delivery, payment, and freezer work. Customers connect to bookings and freezer assignments. Products connect to booking items, bodega order items, receiving items, delivery items, and inventory movements. Receiving records preserve expected, good, damaged or melted, and missing quantities, together with the truck plate and receiving staff. Delivery runs record routes and the assigned driver and loaders; delivery items record quantities accepted, missing, refused as BO, or returned intact. Invoices hold the billable amount and approved shortage or BO deductions. Payment and route-reconciliation records hold payment methods, expected cash, actual cash, and any variance. Freezer and verification records hold the SELECTA-owned asset, store assignment, fee details, monthly barcode, scan date, responsible staff, and photo evidence (Saren et al., 2026b).")
    add_image(doc,img_paths["erd"],width=6.1)
    add_caption(doc,"Figure 5. Entity Relationship Diagram of the Proposed System")
    add_para(doc,"Primary and foreign keys identify records and connect related details. A booking can contain multiple products, and a product can appear in many bookings. The inventory ledger keeps dated stock movements instead of overwriting history. Route reconciliation summarizes the run after store invoices and payments have been recorded. A reported cash shortage is saved for review; the application cannot determine its cause without a count and an approved explanation. The freezer verification photo is a user-provided record, not a Timemark data feed. The final ERD and field list will be checked against approved requirements and the existing database schema.")

    add_heading(doc,"REFERENCES",1,True)
    add_para(doc,"The following reference list follows APA style. Each source cited in the manuscript is included below.",indent=False,after=12)
    for ref in sorted(REFERENCES, key=lambda x: x.split(" (",1)[0].casefold()):
        add_reference(doc,ref)

    # Ask Word to refresh the generated table of contents and other fields on open.
    settings = doc.settings._element
    update = settings.find(qn("w:updateFields"))
    if update is None:
        update = OxmlElement("w:updateFields")
        settings.append(update)
    update.set(qn("w:val"), "true")

    doc.core_properties.title = "Llano SELECTA Dealer POS and Inventory system: Chapters 1–3"
    doc.core_properties.subject = "Capstone project proposal for ACLC College of Bukidnon"
    doc.core_properties.author = "Jhunnel L. Saren; Ace Rienchlee Galiposo; Ed Laurence Servandil; Gino Canama; Jasper Buagas; Dan Micheal Responso; Kent Michael Bacong"
    doc.core_properties.keywords = "capstone, POS, inventory, SELECTA, dealer, Chapters 1-3"
    doc.save(OUT)
    print(f"Created {OUT}")
    print(f"Annotated sources: {len(ANNOTATIONS)}; reference entries: {len(REFERENCES)}")


if __name__ == "__main__":
    main()
