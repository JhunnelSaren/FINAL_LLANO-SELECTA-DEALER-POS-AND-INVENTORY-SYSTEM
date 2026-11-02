from copy import deepcopy
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from io import BytesIO
import importlib.util
import re
import xml.etree.ElementTree as ET

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from docx.text.paragraph import Paragraph

ROOT = Path(r"D:\JHUNNEL SAREN\ACLC COLLEGE\2_LLANO POS AND INVENTORY SYSTEM")
WORK = ROOT / ".capstone_work"
TEMPLATE = Path(r"C:\Users\LENOVO I5\Downloads\CAPSTONE TEMPLATE (1).docx")
PRIOR = ROOT / "Llano_SELECTA_Dealer_POS_and_Inventory_System_Chapters_1-3_Revised.docx"
OUT = ROOT / "Llano_SELECTA_Dealer_POS_and_Inventory_System_Chapters_1-3_New_Template.docx"
DOCX_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
W = "{%s}" % DOCX_NS

spec = importlib.util.spec_from_file_location("prior_builder", WORK / "build_capstone.py")
prior_builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prior_builder)


def p_by_text(doc, text, occurrence=0):
    found = [p for p in doc.paragraphs if p.text.strip() == text.strip()]
    if len(found) <= occurrence:
        raise ValueError(f"Paragraph not found: {text!r}")
    return found[occurrence]


def p_by_drawing(doc, occurrence=0):
    found = [p for p in doc.paragraphs if p._p.xpath(".//w:drawing")]
    return found[occurrence]


def paragraph_after(paragraph):
    node = paragraph._p.getnext()
    if node is None or node.tag != W + "p":
        raise ValueError("The next body element is not a paragraph.")
    return Paragraph(node, paragraph._parent)


def section_texts(doc, start, end):
    a = next(i for i, p in enumerate(doc.paragraphs) if p.text.strip() == start.strip())
    b = next(i for i, p in enumerate(doc.paragraphs[a + 1 :], a + 1) if p.text.strip() == end.strip())
    return [p.text.strip() for p in doc.paragraphs[a + 1 : b] if p.text.strip()]


def set_runs(paragraph, parts, indent=True, align=WD_ALIGN_PARAGRAPH.JUSTIFY, line=1.5, before=0, after=0):
    p = paragraph._p
    ppr = p.pPr
    starts = [deepcopy(x) for x in p if x.tag in (W + "bookmarkStart", W + "permStart")]
    ends = [deepcopy(x) for x in p if x.tag in (W + "bookmarkEnd", W + "permEnd")]
    for child in list(p):
        p.remove(child)
    if ppr is not None:
        p.append(ppr)
    for item in starts:
        p.append(item)
    for text, bold, italic in parts:
        if not text:
            continue
        run = paragraph.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(12)
        run.font.color.rgb = RGBColor(0, 0, 0)
        run.bold = bold
        run.italic = italic
    for item in ends:
        p.append(item)
    paragraph.alignment = align
    pf = paragraph.paragraph_format
    pf.first_line_indent = Inches(.5) if indent else Inches(0)
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    pf.line_spacing = line
    return paragraph


def set_text(paragraph, text, bold=False, italic=False, indent=True):
    return set_runs(paragraph, [(text, bold, italic)], indent=indent)


def insert_after(anchor, text="", style="Normal", bold=False, italic=False, indent=True,
                 align=WD_ALIGN_PARAGRAPH.JUSTIFY, line=1.5, before=0, after=0):
    p = anchor._parent.add_paragraph(style=style)
    anchor._p.addnext(p._p)
    set_runs(p, [(text, bold, italic)], indent=indent, align=align, line=line, before=before, after=after)
    return p


def insert_before(anchor, text="", style="Normal", bold=False, italic=False, indent=True,
                  align=WD_ALIGN_PARAGRAPH.JUSTIFY, line=1.5, before=0, after=0):
    p = anchor._parent.add_paragraph(style=style)
    anchor._p.addprevious(p._p)
    set_runs(p, [(text, bold, italic)], indent=indent, align=align, line=line, before=before, after=after)
    return p


def add_texts_after(anchor, texts, bold=False):
    for text in texts:
        anchor = insert_after(anchor, text, bold=bold)
    return anchor


def add_subhead_after(anchor, text, use_heading_style=False):
    style = "Heading 2" if use_heading_style else "Normal"
    p = insert_after(anchor, text, style=style, bold=True, indent=False,
                     align=WD_ALIGN_PARAGRAPH.LEFT, line=1.15, before=8, after=2)
    if use_heading_style:
        p.paragraph_format.keep_with_next = True
    return p


def clear_paragraph(paragraph):
    set_runs(paragraph, [], indent=False, align=WD_ALIGN_PARAGRAPH.LEFT, line=1.0)


def set_picture(paragraph, path, width=6.05):
    clear_paragraph(paragraph)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = paragraph.paragraph_format
    pf.first_line_indent = Inches(0)
    pf.space_before = Pt(3)
    pf.space_after = Pt(2)
    pf.keep_together = True
    paragraph.add_run().add_picture(str(path), width=Inches(width))
    return paragraph


def set_heading(paragraph, text, level=2):
    paragraph.style = f"Heading {level}"
    set_text(paragraph, text, bold=True, indent=False)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER if level == 1 else WD_ALIGN_PARAGRAPH.LEFT
    paragraph.paragraph_format.keep_with_next = True
    return paragraph


def fill_reference(paragraph, reference):
    # APA 7 layout: hanging indent; italicize journal title and volume, or a stand-alone title.
    paragraph.style = "Normal"
    p = paragraph._p
    for child in list(p):
        if child.tag != W + "pPr":
            p.remove(child)
    prefix, rest = reference.split("). ", 1) if "). " in reference else ("", reference)
    prefix = prefix + "). " if prefix else ""
    title_end = rest.find(". ")
    title = rest if title_end < 0 else rest[: title_end + 1]
    tail = "" if title_end < 0 else rest[title_end + 2 :]
    volume_match = re.search(r", (\d+)(?:\(|,)", tail)
    if volume_match:
        journal = tail[: volume_match.start()]
        volume_start = volume_match.start() + 2
        volume_end_match = re.search(r"(?<=\d)(?:\([^)]*\))?(?=,)", tail[volume_start:])
        if volume_end_match:
            volume_end = volume_start + volume_end_match.end()
            volume = tail[volume_start:volume_end]
            after_volume = tail[volume_end:]
            chunks = [(prefix, False), (title, False), (journal + ", ", True), (volume, True), (after_volume, False)]
        else:
            chunks = [(prefix, False), (title, False), (tail, False)]
    else:
        chunks = [(prefix, False), (rest, True)]
    parts = [(t, False, ital) for t, ital in chunks if t]
    set_runs(paragraph, parts, indent=False, align=WD_ALIGN_PARAGRAPH.LEFT, line=1.5, after=0)
    pf = paragraph.paragraph_format
    pf.left_indent = Inches(.5)
    pf.first_line_indent = Inches(-.5)
    pf.keep_together = True


def merge_package(generated_bytes, output_path):
    """Keep the new template shell byte-for-byte and merge only document edits and added PNGs."""
    original = ZipFile(TEMPLATE)
    generated = ZipFile(BytesIO(generated_bytes))
    original_names = set(original.namelist())
    generated_names = set(generated.namelist())
    new_media = sorted(n for n in generated_names - original_names if n.startswith("word/media/"))
    original_rels = ET.fromstring(original.read("word/_rels/document.xml.rels"))
    generated_rels = ET.fromstring(generated.read("word/_rels/document.xml.rels"))
    ids = {e.attrib.get("Id") for e in original_rels}
    for rel in generated_rels:
        if rel.attrib.get("Id") not in ids:
            original_rels.append(deepcopy(rel))
    parts = {name: original.read(name) for name in original.namelist()}
    parts["word/document.xml"] = generated.read("word/document.xml")
    parts["word/_rels/document.xml.rels"] = ET.tostring(original_rels, encoding="utf-8", xml_declaration=True)
    for name in new_media:
        parts[name] = generated.read(name)
    with ZipFile(output_path, "w", ZIP_DEFLATED) as outzip:
        for name, data in parts.items():
            outzip.writestr(name, data)


def main():
    if not TEMPLATE.exists() or not PRIOR.exists():
        raise FileNotFoundError("The template or the reviewed prior paper is missing.")
    old = Document(PRIOR)
    doc = Document(TEMPLATE)

    # Cover page.
    set_text(p_by_text(doc, "“Your Title”"), "Llano SELECTA Dealer POS and Inventory System", bold=True, indent=False)
    set_text(p_by_text(doc, "A Portfolio Presented to the Faculty of"), "A Capstone Project Presented to the Faculty of", indent=False)
    authors = [
        "Jhunnel L. Saren  |  Ace Rienchlee Galiposo",
        "Ed Laurence Servandil  |  Gino Canama",
        "Jasper Buagas  |  Dan Micheal Responso",
        "Kent Michael Bacong",
    ]
    cover_people = doc.paragraphs[25:29]
    for p, name in zip(cover_people, authors):
        set_text(p, name, bold=True, indent=False)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_text(p_by_text(doc, "December 2025"), "December 2026", indent=False)

    # Chapter 1.
    set_heading(p_by_text(doc, "Chapter 1"), "Chapter 1", 1)
    set_heading(p_by_text(doc, "PROJECT AND ITS BACKGROUND"), "PROJECT AND ITS BACKGROUND", 1)
    context_head = p_by_text(doc, "Project Context")
    anchor = add_texts_after(context_head, section_texts(old, "Project Context", "Current Business Flow"))
    anchor = add_subhead_after(anchor, "Current Business Flow", use_heading_style=True)
    add_texts_after(anchor, section_texts(old, "Current Business Flow", "Problem Statement"))
    set_heading(p_by_text(doc, "Problem Statment"), "Problem Statement", 2)
    add_texts_after(p_by_text(doc, "Problem Statement"), section_texts(old, "Problem Statement", "Objectives of the Study"))
    add_texts_after(p_by_text(doc, "Objectives of the Study"), section_texts(old, "Objectives of the Study", "Significance of the Study"))
    add_texts_after(p_by_text(doc, "Significance of the Study"), section_texts(old, "Significance of the Study", "Scope and Limitations"))
    scope_head = p_by_text(doc, "Scope and limitations")
    set_heading(scope_head, "Scope and Limitations", 2)
    add_texts_after(scope_head, section_texts(old, "Scope and Limitations", "Definition of Terms"))
    add_texts_after(p_by_text(doc, "Definition of Terms"), section_texts(old, "Definition of Terms", "Chapter 2"))

    # Chapter 2.
    chapter2_title = p_by_text(doc, "REVIEW OF RELATED LITERATURE AND STUDIES")
    set_heading(p_by_text(doc, "Chapter 2"), "Chapter 2", 1)
    set_heading(chapter2_title, "REVIEW OF RELATED LITERATURE AND STUDIES", 1)
    add_texts_after(chapter2_title, section_texts(old, "Chapter 2", "Related Literature"))
    literature_head = p_by_text(doc, "Related Literature")
    add_texts_after(literature_head, section_texts(old, "Related Literature", "Inventory control and record accuracy"))

    p_by_text(doc, "Related Systems")  # Preserve the template's related-systems slot.
    set_text(p_by_text(doc, "Several attendance systems have been developed to automate the process of monitoring student presence."),
             "Several retail and inventory systems show how small businesses can record sales, stock, and reports. Their functions differ from Llano’s route-based frozen-product work, so they guide the design but do not replace a local requirements review.")
    system_titles = ["Retail POS and Inventory Systems", "Web-Based Inventory Systems", "Small Dealer and Mobile POS Systems"]
    old_system_titles = ["RFID-Based Attendance System", "Biometric Attendance System", "Web-Based Attendance System"]
    system_paragraphs = [
        "Retail POS projects by Mangmang (2018) and Sison et al. (2019) link sales with stock records and exception alerts. Moreno et al. (2025) studied POS use among micro and small businesses in Tacurong City. These works support clear transaction records, stock alerts, and user review. They do not cover the full receiving, route delivery, freezer, and payment-reconciliation process at Llano.",
        "Tanaman et al. (2023) developed a browser-based inventory system for a small business in the Philippines. The work supports using a web interface for stock access and reporting. Its scope does not include the dealer’s store bookings, frozen-product condition checks, route returns, and freezer barcode evidence.",
        "Dalupang (2026) developed and piloted a web-and-mobile POS for small stalls and mobile food businesses. It connects sales and stock with reconciliation tasks. Its GPS and offline functions are outside this project. The proposed Llano system uses the same general idea of linking daily records but keeps the official SELECTA POS and Timemark separate.",
    ]
    for old_title, new_title, text in zip(old_system_titles, system_titles, system_paragraphs):
        head = p_by_text(doc, old_title)
        set_heading(head, new_title, 2)
        add_texts_after(head, [text])
    set_text(p_by_text(doc, "The proposed system adopts features of the web-based approach while integrating automation, data accuracy, and ease of use for both students and instructors."),
             "Together, these systems show useful ways to connect sales, inventory, and reports. The proposed system is shaped around Llano’s own route bookings, SELECTA truck receiving, store delivery, BO returns, payment records, and monthly freezer checks. It will support the dealer’s work without claiming that another business’s results will also occur at Llano.")

    selected = p_by_text(doc, "ADD MORE…. STUDIES RELATED AT LEAST 50 STUDIES THAT SUPPORT YOUR PROPOSED STUDY")
    set_text(selected, "Selected Related Studies, Frameworks, and Standards", bold=True, indent=False)
    start_works = next(i for i, p in enumerate(old.paragraphs) if p.text.strip() == "Inventory control and record accuracy")
    end_works = next(i for i, p in enumerate(old.paragraphs) if p.text.strip() == "Synthesis and Research Gap")
    works = [p.text.strip() for p in old.paragraphs[start_works + 1 : end_works]
             if re.match(r"^\d+\.\s", p.text.strip())]
    if len(works) != 50:
        raise ValueError(f"Expected 50 numbered related works, found {len(works)}")
    anchor = selected
    groups = [(0, 15, "Inventory Control and Record Accuracy"),
              (15, 21, "Product Identification and Inventory Visibility"),
              (21, 35, "Digital Tools and POS Systems in Small Organizations"),
              (35, 50, "Technology Adoption, Software Quality, and Evaluation")]
    for start, end, label in groups:
        anchor = add_subhead_after(anchor, label, use_heading_style=False)
        for work in works[start:end]:
            anchor = insert_after(anchor, work)

    # Synthesis before the preserved Chapter 3 bookmark.
    chapter3_heading = p_by_text(doc, "Chapter 3")
    anchor = insert_before(chapter3_heading, "Synthesis and Research Gap", bold=True, indent=False,
                           align=WD_ALIGN_PARAGRAPH.LEFT, line=1.15, before=8, after=2)
    for text in section_texts(old, "Synthesis and Research Gap", "Chapter 3"):
        anchor = insert_after(anchor, text)

    # Chapter 3.
    set_heading(chapter3_heading, "Chapter 3", 1)
    research_method_head = p_by_text(doc, "RESEARCH METHODOLOGY")
    set_heading(research_method_head, "RESEARCH METHODOLOGY", 1)
    add_texts_after(research_method_head, section_texts(old, "RESEARCH METHODOLOGY", "Research Setting"))

    setting_head = p_by_text(doc, "Research Setting")
    anchor = add_texts_after(setting_head, section_texts(old, "Research Setting", "Research Design"))
    stakeholders = [
        "The main people involved in the study will be the owner or administrator and the available staff who book orders, check incoming stock, prepare boxes, drive or load deliveries, carry receipts, record payments, or check freezers. Work assignments can change, so the study will include the people who perform these tasks during the approved study period.",
        "The owner may use the system to review bookings, receiving differences, route totals, payment records, freezer checks, and reports. Staff may use the records needed for their assigned tasks. Stores and customers are not direct users; they place requests through staff and receive products and receipts.",
    ]
    anchor = add_texts_after(anchor, stakeholders)
    insert_after(anchor, "The map below shows the Batangan vicinity from a Google Maps search. The exact P18 dealer pin was not returned in the search results, so its precise position must be confirmed with the owner (Google, n.d.).")
    map_slot = p_by_text(doc, "ADD GOOGLE MAPS SCREENSHOT")
    set_text(map_slot, "[GOOGLE_MAP_IMAGE]", indent=False)
    map_slot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    map_slot.paragraph_format.first_line_indent = Inches(0)
    insert_after(map_slot, "Figure 1. Google Maps search showing the Batangan vicinity; exact P18 location is approximate.",
                 italic=True, indent=False, align=WD_ALIGN_PARAGRAPH.CENTER, line=1.0, after=4)

    design_head = p_by_text(doc, "Research Design")
    anchor = add_texts_after(design_head, section_texts(old, "Research Design", "Data Gathering and Requirements Analysis"))
    data_heading = add_subhead_after(anchor, "Data Gathering and Requirements Analysis", use_heading_style=False)
    add_texts_after(data_heading, section_texts(old, "Data Gathering and Requirements Analysis", "System Development Methodology"))

    methodology_head = p_by_text(doc, "System Development Methodology")
    add_texts_after(methodology_head, section_texts(old, "System Development Methodology", "Methodology Phase Guide"))
    agile_img = p_by_drawing(doc, 1)
    agile_caption = paragraph_after(agile_img)
    set_text(agile_caption, "Figure 2. Agile development cycle used to guide short build, test, and review cycles.", italic=True, indent=False)
    agile_caption.alignment = WD_ALIGN_PARAGRAPH.CENTER

    flow_head = p_by_text(doc, "System Flow")
    insert_after(flow_head, "The system follows the dealer’s work from store booking to stock and payment reconciliation.")
    flow_img = p_by_drawing(doc, 2)
    set_picture(flow_img, WORK / "flow.png", width=6.05)
    flow_caption = insert_after(flow_img, "Figure 3. Proposed dealer workflow from booking through route reconciliation.",
                                italic=True, indent=False, align=WD_ALIGN_PARAGRAPH.CENTER, line=1.0, after=4)
    add_texts_after(flow_caption, section_texts(old, "System Flow", "System Architecture"))

    architecture_slot = p_by_text(doc, "ADD SCREENSHOT OF YOUR SYSTEM ARCHITECTURE")
    set_picture(architecture_slot, WORK / "architecture.png", width=6.05)
    arch_caption = insert_after(architecture_slot, "Figure 4. Three-part web application architecture and external services.",
                                italic=True, indent=False, align=WD_ALIGN_PARAGRAPH.CENTER, line=1.0, after=4)
    add_texts_after(arch_caption, section_texts(old, "System Architecture", "System Development Requirements"))

    req_head = p_by_text(doc, "System Development")
    insert_after(req_head, "The proposed setup below supports development and regular dealer use. The final device and hosting choices will depend on the dealer’s available equipment and approved deployment plan.")
    set_heading(p_by_text(doc, "Hardware Requirements"), "Hardware Requirements", 2)
    hardware = [
        ("Development computer", "Modern computer with a multi-core processor, at least 8 GB RAM, and SSD storage."),
        ("User device", "Desktop, laptop, or phone with a current browser and reliable access to the approved network."),
        ("Phone and host", "Phone camera for the existing Timemark scan; approved local or managed host with backup capacity."),
    ]
    for row, vals in zip(doc.tables[0].rows, hardware):
        for cell, value in zip(row.cells, vals):
            cell.text = value
            for para in cell.paragraphs:
                para.alignment = WD_ALIGN_PARAGRAPH.LEFT
                para.paragraph_format.space_after = Pt(0)
                para.paragraph_format.line_spacing = 1.0
                for run in para.runs:
                    run.font.name = "Arial"
                    run.font.size = Pt(10)
                    run.font.color.rgb = RGBColor(0, 0, 0)
    sw_label = p_by_text(doc, "Software Requirements")
    set_text(sw_label, "Software Requirements", bold=True, indent=False)
    software = [
        ("Browser client", "React 18, TypeScript 5.6, and Vite 5.4."),
        ("Server and database", "Node.js, Express 4, Prisma ORM 5, and MySQL; exact deployment versions will be confirmed."),
    ]
    for row, vals in zip(doc.tables[1].rows, software):
        for cell, value in zip(row.cells, vals):
            cell.text = value
            for para in cell.paragraphs:
                para.alignment = WD_ALIGN_PARAGRAPH.LEFT
                para.paragraph_format.space_after = Pt(0)
                para.paragraph_format.line_spacing = 1.0
                for run in para.runs:
                    run.font.name = "Arial"
                    run.font.size = Pt(10)
                    run.font.color.rgb = RGBColor(0, 0, 0)

    dfd_head = p_by_text(doc, "Data Flow Diagram")
    insert_after(dfd_head, "The context diagram shows the information that enters and leaves the dealer system. It also shows which activities remain in separate external tools.")
    dfd_slot = paragraph_after(p_by_text(doc, "The context diagram shows the information that enters and leaves the dealer system. It also shows which activities remain in separate external tools."))
    set_picture(dfd_slot, WORK / "dfd.png", width=6.05)
    dfd_caption = insert_after(dfd_slot, "Figure 5. Context data flow for the Llano SELECTA Dealer system.",
                               italic=True, indent=False, align=WD_ALIGN_PARAGRAPH.CENTER, line=1.0, after=4)
    dfd_texts = section_texts(old, "Data Flow Diagram (DFD)", "Entity Relationship Diagram (ERD)")
    add_texts_after(dfd_caption, dfd_texts)

    erd_slot = p_by_text(doc, "ADD SCREENSHOT OF YOUR ERD")
    set_picture(erd_slot, WORK / "erd.png", width=6.05)
    erd_caption = insert_after(erd_slot, "Figure 6. Main records and relationships planned for the dealer system.",
                               italic=True, indent=False, align=WD_ALIGN_PARAGRAPH.CENTER, line=1.0, after=4)
    add_texts_after(erd_caption, section_texts(old, "Entity Relationship Diagram (ERD)", "REFERENCES"))

    # Clear every remaining model instruction and attendance example from the supplied template.
    old_prompts = [
        "Provide an overview of your project. Explain what your study is about, its background, and why it is important. Discuss the problem or need that your project will address, the purpose of the study, and the expected outcome.",
        "Example: Describe how your project idea started, what issue it solves, and how it can benefit users or organizations.",
        "State clearly the main problem your project seeks to solve. Explain what issues exist and how your proposed system or study will address them.",
        "Example: The purpose of this capstone project is to develop a system that will...",
        "List the specific goals you want to achieve through this project. Start each objective with “To…” and make sure each is measurable and realistic.",
        "Example:", "To design and develop a web-based attendance system.",
        "To provide a user-friendly interface for both students and instructors.",
        "To generate accurate and automated attendance reports.",
        "This system uses Radio Frequency Identification (RFID) cards to record attendance automatically. It provides fast scanning and secure identification but requires specific hardware, which can be costly to implement.",
        "This system uses fingerprints or facial recognition to mark attendance. It ensures accuracy and prevents proxy attendance but requires additional setup and maintenance.",
        "This system allows instructors and students to record and access attendance through an online platform. It is cost-effective, easy to access, and ideal for institutions with existing internet infrastructure.",
        "Explain why your study is important and who will benefit from it. Identify the stakeholders such as students, teachers, administrators, or organizations that will gain advantages from your project.",
        "Example: This study is significant because it provides a faster and more reliable way to record attendance, which benefits both students and faculty members.",
        "Describe what your project will cover (scope) and what it will not include (limitations). This helps define the boundaries of your study.",
        "Example: The system will focus only on student attendance monitoring within ACLC College of Bukidnon and will not include integration with other campuses.",
        "List and define key technical terms, acronyms, or concepts used in your study. Provide definitions that are clear and relevant to your project.",
        "Database: A structured collection of data that can be accessed and managed electronically.",
        "User Interface (UI): The visual part of the system through which users interact.",
        "Algorithm: A set of instructions used to perform a specific task or solve a problem.",
        "This chapter presents the review of related literature and systems relevant to the proposed study. It discusses previous research, existing systems, and various concepts that support the development of the web-based attendance system. The purpose of this review is to identify gaps, gather insights, and strengthen the foundation of the proposed project.",
        "The review of related literature focuses on studies, theories, and concepts that are relevant to attendance monitoring, automation, and information systems.",
        "According to [Author, Year], automated systems help improve accuracy and reduce human errors compared to manual methods. Another study by [Author, Year] emphasizes that web-based applications provide flexibility and accessibility, allowing users to manage data anytime and anywhere.",
        "Various studies have also shown that implementing digital attendance systems enhances efficiency in record management and minimizes the workload of instructors. These findings serve as the basis for developing a system that can monitor attendance accurately and efficiently.",
        "ADD MORE…. STUDIES RELATED AT LEAST 50 STUDIES THAT SUPPORT YOUR PROPOSED STUDY",
        "The study will be conducted at [Insert Location], specifically in [mention specific area, e.g., classrooms, offices, or online platform]. This location was chosen because it is directly relevant to the participants and the context of the study.",
        "The primary beneficiaries of this research include:",
        "Students – They will benefit from improved access to tools and resources, or insights that may enhance their learning experience.",
        "Instructors/Teachers – The findings can help them implement more efficient strategies or systems, such as the proposed web-based attendance system.",
        "The Institution – The research outcomes may assist in streamlining administrative processes, improving record management, and enhancing overall operational efficiency.",
        "By conducting the study in this setting, the research aims to provide practical solutions that directly address the needs and challenges experienced in the educational environment.",
        "ADD GOOGLE MAPS SCREENSHOT",
        "This chapter presents the methodology that will be used in the development of the proposed Web-Based Attendance System. It discusses the research design, system development methodology, data collection methods, target respondents, and the tools and technologies to be used. The purpose of this chapter is to provide a detailed plan on how the project will be implemented and evaluated.",
        "The study will utilize a developmental research design, focusing on designing, developing, and testing a web-based attendance system. This approach allows the researchers to create a system that addresses the problems identified in Chapter 1 while evaluating its effectiveness and usability.",
        "The Agile/Waterfall (choose one) methodology will be used to guide the system development process. This includes the following phases:",
        "Planning – Define project objectives, identify system requirements, and set timelines.",
        "Analysis – Gather requirements from target users (students and instructors) and study existing attendance practices.",
        "Design – Create system architecture, database design, and user interface prototypes.",
        "Implementation/Coding – Develop the web-based attendance system using appropriate programming languages and frameworks.",
        "Testing – Conduct system testing to check for errors, bugs, and usability issues.",
        "Deployment and Evaluation – Deploy the system and gather feedback from users for further improvements.",
        "The system will follow these main processes:",
        "User Login – Students and instructors log in using secure credentials.",
        "Attendance Recording – Instructors mark attendance, or students log their presence depending on system settings.",
        "Data Storage – Attendance records are saved in the database.",
        "Reports Generation – The system generates automated attendance reports for students and instructors.",
        "User Feedback – Users can view and verify their attendance records.",
        "ADD SCREENSHOT OF YOUR SYSTEM ARCHITECTURE",
        "The system architecture shows the interaction between users, the interface, the processing logic, and the database. For your system, the flow can be described as follows:",
        "The ERD shows how data is structured and related. Below is a detailed discussion of your database tables:",
    ]
    for p in list(doc.paragraphs):
        if p.text.strip() in old_prompts:
            clear_paragraph(p)

    # Alphabetized APA references, including the map source.
    references = list(prior_builder.REFERENCES)
    references.append("Google. (n.d.). Google Maps [Map showing the Batangan vicinity]. Retrieved October 31, 2026, from https://www.google.com/maps/search/?api=1&query=Purok+18+Malabuaya%2C+Batangan%2C+Valencia+City%2C+Bukidnon%2C+Philippines")
    references = sorted(set(references), key=lambda x: x.split(" (", 1)[0].casefold())
    ref_heading = doc.add_paragraph(style="Heading 1")
    ref_heading.paragraph_format.page_break_before = True
    set_heading(ref_heading, "REFERENCES", 1)
    ref_note = insert_after(ref_heading, "References are listed in APA style and include the works cited in Chapters 1–3.")
    for reference in references:
        p = doc.add_paragraph(style="Normal")
        ref_note._p.addnext(p._p)
        fill_reference(p, reference)
        ref_note = p

    # Keep the existing TOC control and fields; update its cached labels only.
    toc_labels = {
        "Problem Statment": "Problem Statement",
        "Scope and limitations": "Scope and Limitations",
        "RFID-Based Attendance System": "Retail POS and Inventory Systems",
        "Biometric Attendance System": "Web-Based Inventory Systems",
        "Web-Based Attendance System": "Small Dealer and Mobile POS Systems",
    }
    for paragraph in doc._element.body.xpath(".//w:sdtContent//w:p"):
        texts = paragraph.xpath(".//w:t")
        if not texts:
            continue
        joined = "".join(t.text or "" for t in texts)
        for old_label, new_label in toc_labels.items():
            if old_label in joined:
                texts[0].text = (texts[0].text or "").replace(old_label, new_label)

    # Compact redundant empty Normal paragraphs without removing page-breaks or bookmarked paragraphs.
    for p in list(doc.paragraphs):
        if p.text.strip() == "" and p.style.name == "Normal" and not p._p.xpath(".//w:drawing"):
            has_break = bool(p._p.xpath(".//w:br[@w:type='page']")) or p.paragraph_format.page_break_before
            has_bookmark = bool(p._p.xpath(".//w:bookmarkStart | .//w:bookmarkEnd"))
            if not has_break and not has_bookmark:
                p._p.getparent().remove(p._p)

    buffer = BytesIO()
    doc.save(buffer)
    merge_package(buffer.getvalue(), OUT)
    print(f"Created {OUT}")
    print(f"Related works: {len(works)}; references: {len(references)}")


if __name__ == "__main__":
    main()
