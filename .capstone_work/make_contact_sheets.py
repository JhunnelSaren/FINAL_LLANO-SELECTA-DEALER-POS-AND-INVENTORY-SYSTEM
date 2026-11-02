from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

folder = Path(__file__).resolve().parent / "final-render-revised"
pages = sorted(folder.glob("page-*.png"), key=lambda p: int(p.stem.split("-")[-1]))
thumb_w, thumb_h = 500, 650
pad, label_h, gap = 18, 34, 18
font = ImageFont.load_default()

for start in range(0, len(pages), 5):
    group = pages[start:start + 5]
    rows = (len(group) + 1) // 2
    sheet = Image.new("RGB", (2 * (thumb_w + 2 * pad) + gap,
                               rows * (thumb_h + label_h + 2 * pad) + gap),
                      (228, 232, 237))
    draw = ImageDraw.Draw(sheet)
    for i, page in enumerate(group):
        im = Image.open(page).convert("RGB")
        im.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        col, row = i % 2, i // 2
        x = gap + col * (thumb_w + 2 * pad)
        y = gap + row * (thumb_h + label_h + 2 * pad)
        draw.text((x + pad, y + 6), f"Page {start + i + 1}", fill=(25, 44, 70), font=font)
        px = x + pad + (thumb_w - im.width) // 2
        py = y + label_h
        sheet.paste(im, (px, py))
        draw.rectangle((px, py, px + im.width - 1, py + im.height - 1), outline=(140, 150, 165), width=1)
    out = folder / f"contact-{start // 5 + 1:02d}.png"
    sheet.save(out)
    print(out.name)
