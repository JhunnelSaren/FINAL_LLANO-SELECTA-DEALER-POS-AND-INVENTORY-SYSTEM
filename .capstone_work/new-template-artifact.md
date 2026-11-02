# New Capstone Template Execution Contract

## Reference identity

- Reference DOCX: `C:\Users\LENOVO I5\Downloads\CAPSTONE TEMPLATE (1).docx`
- SHA-256 before editing: `e90fb532ee0b1e7ac77248861672cce90c5e7682bc83631c600e692c8d425e1c`
- Reference size: 1,392,435 bytes; 25 package parts; 11 rendered pages.
- Render evidence: `.capstone_work/new-template-preview.pdf` and `.capstone_work/new-template-pages/page-01.png` through `page-11.png`.
- Section/style evidence: `.capstone_work/new-template-style-evidence.json`; section audit: one section, Letter portrait.
- Package part hashes and sizes: `.capstone_work/new-template-package-inventory.json`.

## Page system and typography

- One US Letter portrait section (8.5 × 11 inches); margins: left 1.25 in, right 1 in, top/bottom 1 in; header distance 1.1 in, footer distance 0.5 in; first page uses a different header/footer setting.
- Body paragraphs use Arial 12 pt, 1.5 line spacing, justified alignment, 0.5 in first-line indent, and no extra paragraph spacing. Remove red and italic example formatting from all replaced placeholder prose.
- Heading 1 uses Arial 12 pt bold, centered; Heading 2 uses Arial 12 pt bold, left aligned. Preserve source heading properties and page-break behavior.
- The cover page is centered and includes the ACLC logo, college name/address, capstone title, presentation statement, degree, author names, and date.
- Later pages retain the source header grid, ACLC logo, page borders, and recurring lines. Preserve `word/header1.xml`, its relationships, and anchored drawings.
- Preserve existing table geometry and table borders. Fill the hardware requirements table (3 rows × 2 columns) and software requirements table (2 rows × 2 columns) with concise, readable entries; add rows only if necessary.

## Content flow and edit-slot map

1. Cover page: replace “Your Title”, “A Portfolio Presented…”, the three researcher placeholders, and December 2025. Use the project title, capstone statement, all seven proposal-letter authors, and December 2026. Retain the ACLC logo and campus address.
2. Table of contents: retain the page-2 content control, field structure, bookmarks, dotted leaders, and template layout. Update visible section labels and page references after pagination is final. Add Chapter 2 related systems, Data Flow Diagram, and References as compact entries if the template page permits.
3. Chapter 1 (existing body starting at `word/document.xml` top-level body child 35): fill the project context, problem statement, objectives, significance, scope/limitations, and definition slots. Add a current business flow subsection. Include the P18 Malabuaya Batangan setting, covered routes, current Excel/hardcopy process, external SELECTA POS and Timemark boundaries, freezer payment example, receiving checks, Bongo deliveries, missing/BO deductions, variable crew, payment methods, reconciliation, and monthly quota example. Attribute supplied workflow notes as personal communication. Do not claim completed interviews or measured improvements.
4. Chapter 2: replace the attendance-system examples and the “at least 50 studies” instruction. Keep the template headings for related literature and related systems. Discuss inventory accuracy, small-business POS and inventory use, system adoption, usability, security, and iterative development. Include 50 numbered, concise related works based on the existing 50-source review; distinguish empirical studies from frameworks, standards, and law. Add a synthesis and research gap. Include APA 7 in-text citations and matching references.
5. Chapter 3: replace all attendance examples. Include research setting and a Google Maps screenshot of the Batangan vicinity with a clear note that the exact P18 pin was not returned; developmental research design; data gathering plan using the blank interview questionnaire; Agile methodology and existing Agile-cycle illustration; dealer system flow; system architecture; hardware/software requirements; DFD; ERD and clear description. State that SELECTA POS, Timemark, banks, and GCash remain external and are not integrated.
6. References: append an APA-style References section and alphabetized references for sources cited in Chapters 1–3. Include the Google Maps source only if its screenshot is included. Personal communication does not receive a reference-list entry.

## Stable source locators

- Cover text: `word/document.xml`, body children 4, 7, 10, 13, 18–29; inline ACLC logo in child 1.
- Table of contents: `word/document.xml`, top-level child 32 (`w:sdt`) containing the page-2 TOC control and PAGEREF fields; preserve its control, fields, bookmarks, and paragraph layout.
- Chapter body: `word/document.xml`, top-level children 35–207; existing Heading 1/2 paragraphs and their bookmarks are anchors for the TOC. Replace template example text in place where possible; clone paragraph properties for added prose without removing bookmark targets.
- Existing body illustrations: child 150 is the Agile cycle; child 168 is the attendance flow image slot and may be replaced by the dealer workflow figure. Keep the cover logo. Add map, architecture, DFD, and ERD figures as new image relationships and inline drawings.
- Requirements tables: body children 190 and 194.
- Header and recurring page furniture: `word/header1.xml` and `word/_rels/header1.xml.rels`; preserve-only.
- Styles, numbering, theme, settings, custom XML, footnotes/endnotes, document properties, and original media are preserve-only unless a field refresh requires a settings-only update.

## Package and fidelity gates

- The reference remains byte-for-byte unchanged at the recorded hash.
- Preserve all package parts and relationships other than the intended `word/document.xml` body edits, added figure/media relationships, added figure media, and controlled TOC field updates. Do not drop `customXml`, content controls, original drawings, header/footer assets, styles, numbering, theme, settings, or metadata parts.
- Keep the one-section Letter page system, source header, borders, and typography. Expected pagination changes are allowed because the paper fills intentionally blank slots and adds a 50-source review and references.
- Confirm the final DOCX opens as a valid package, contains no attendance placeholders, includes 50 numbered related works and matching APA references, and renders every page cleanly. Visually inspect every final page and compare the final header, cover, TOC, tables, images, and recurring layout with the reference.
- Refresh TOC/PAGEREF fields in Word when available. If fields cannot be refreshed safely, set `w:updateFields=true` in `word/settings.xml` and record that Word will refresh them on open.
