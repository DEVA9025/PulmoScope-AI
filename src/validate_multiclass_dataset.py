
from pathlib import Path
from PIL import Image

root = Path("dataset_multiclass")
classes = ["NORMAL", "PNEUMONIA", "TUBERCULOSIS", "COVID19"]
splits = ["train", "validation", "test"]
extensions = {".jpg", ".jpeg", ".png", ".bmp"}

bad_images = []
total_images = 0

print("IMAGE VALIDATION")

for split in splits:
    print(f"\n{split.upper()}")

    for class_name in classes:
        folder = root / split / class_name

        if not folder.exists():
            print(f"ERROR: Missing folder: {folder}")
            continue

        files = [
            p for p in folder.rglob("*")
            if p.is_file() and p.suffix.lower() in extensions
        ]

        total_images += len(files)

        for path in files:
            try:
                with Image.open(path) as img:
                    img.verify()
            except Exception as error:
                bad_images.append((str(path), str(error)))

        print(f"{class_name}: {len(files)} images")

print(f"\nTotal images checked: {total_images}")
print(f"Unreadable images: {len(bad_images)}")

for path, error in bad_images[:20]:
    print(f"BAD IMAGE: {path}")
    print(f"Reason: {error}")

if not bad_images:
    print("\nSUCCESS: All checked images are readable.")
