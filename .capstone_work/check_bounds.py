from pathlib import Path
from PIL import Image

folder = Path(__file__).resolve().parent / "final-render-revised2"
for number in range(1, 11):
    image = Image.open(folder / f"page-{number:02d}.png").convert("RGB")
    pixels = image.load()
    ys = [y for y in range(image.height) for x in range(image.width) if max(pixels[x, y]) < 160]
    print(number, min(ys), max(ys))
