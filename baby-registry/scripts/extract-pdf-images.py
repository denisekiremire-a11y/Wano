"""Crop individual product photos out of the collage images embedded in Baby_List.pdf.

Usage: python3 -I scripts/extract-pdf-images.py <dir with pdfimages -j output> <out dir>

The PDF stores each section's photos as a single collage: a grid of 240x300 tiles with
10px gutters, in photo-number order. The extras page is a single inspiration board,
cropped by hand-measured boxes. Each crop is written as <photo-number>.jpg / insp-<name>.jpg.
"""
import sys, os
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)

GRIDS = {
    "i-000.jpg": [9192, 9193, 9194, 9195, 9198, 9199, 9200, 9201, 9202, 9203, 9204, 9205, 9206],
    "i-001.jpg": [9207, 9208, 9209, 9210, 9211, 9212, 9213, 9214, 9215, 9238, 9239, 9240, 9241, 9242, 9243, 9244, 9250, 9251],
    "i-002.jpg": [9216, 9217, 9218, 9219, 9220, 9221, 9222, 9223, 9224, 9245, 9246, 9247, 9248, 9249],
    "i-003.jpg": [9225, 9226, 9227, 9228, 9229, 9230],
    "i-004.jpg": [9231, 9232, 9233, 9234, 9235, 9236, 9237],
    "i-005.jpg": list(range(9168, 9192)),
}
TILE_W, TILE_H, GAP, BADGE = 240, 300, 10, 42  # BADGE: crop off the photo-number label

for fname, numbers in GRIDS.items():
    im = Image.open(os.path.join(src, fname)).convert("RGB")
    cols = (im.width + GAP) // (TILE_W + GAP)
    for idx, n in enumerate(numbers):
        r, c = divmod(idx, cols)
        x, y = c * (TILE_W + GAP), r * (TILE_H + GAP)
        tile = im.crop((x, y + BADGE, x + TILE_W, y + TILE_H))
        tile.save(os.path.join(out, f"{n}.jpg"), quality=86)

# Inspiration board (extras page). Boxes in original pixel coordinates.
INSP = {
    "bottle-warmer": (30, 110, 250, 350),
    "thermometer": (250, 100, 362, 380),
    "wipe-warmer": (370, 100, 590, 340),
    "bottle-washer": (30, 355, 235, 650),
    "food-maker": (330, 380, 590, 630),
    "portable-warmer": (10, 670, 180, 895),
    "bath-duck": (190, 690, 395, 860),
    "breast-pump": (402, 660, 600, 860),
    "twistshake": (620, 10, 1340, 912),
    "glider": (1355, 175, 1590, 395),
    "sound-machine": (1775, 185, 1950, 395),
    "play-gym": (1355, 395, 1590, 610),
    "high-chair": (1590, 395, 1745, 615),
    "feeding-set": (1730, 395, 1950, 615),
    "diaper-bag": (1355, 610, 1590, 835),
    "bath-essentials": (1575, 610, 1750, 835),
    "knit-romper": (1960, 10, 2655, 912),
    "teddy": (2250, 330, 2655, 800),
}
im = Image.open(os.path.join(src, "i-006.jpg")).convert("RGB")
for name, box in INSP.items():
    im.crop(box).save(os.path.join(out, f"insp-{name}.jpg"), quality=86)
print("done")
