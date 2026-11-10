
import csv
import os
import math
from PIL import Image, ImageOps
import matplotlib.pyplot as plt

PROJECT_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

CSV_PATH = os.path.join(
    PROJECT_DIR, "model", "normal_as_pneumonia_errors.csv"
)

OUTPUT_PATH = os.path.join(
    PROJECT_DIR, "model", "normal_error_gallery.png"
)

# Load the first 12 misclassified image paths
with open(CSV_PATH, "r", encoding="utf-8") as file:
    rows = list(csv.DictReader(file))

if not rows:
    print("No misclassified images found.")
    raise SystemExit

rows = rows[:12]

columns = 3
rows_count = math.ceil(len(rows) / columns)

fig, axes = plt.subplots(
    rows_count, columns,
    figsize=(14, 4 * rows_count)
)
axes = axes.flatten()

for index, item in enumerate(rows):
    image_path = item["image_path"]

    try:
        with Image.open(image_path) as image:
            image = ImageOps.exif_transpose(image).convert("RGB")
            axes[index].imshow(image)

        normal_prob = float(item["normal_probability"])
        pneumonia_prob = float(item["pneumonia_probability"])

        axes[index].set_title(
            f"Actual: NORMAL\n"
            f"Predicted: PNEUMONIA\n"
            f"NORMAL: {normal_prob:.1%} | "
            f"PNEUMONIA: {pneumonia_prob:.1%}",
            fontsize=9
        )
        axes[index].axis("off")

    except Exception as error:
        axes[index].set_title(f"Could not load image:\n{error}")
        axes[index].axis("off")

for index in range(len(rows), len(axes)):
    axes[index].axis("off")

fig.suptitle(
    "Misclassified NORMAL X-ray Images — Model Error Audit",
    fontsize=14
)
fig.tight_layout()
fig.savefig(OUTPUT_PATH, dpi=150, bbox_inches="tight")
plt.close(fig)

print("Gallery saved to:", OUTPUT_PATH)
