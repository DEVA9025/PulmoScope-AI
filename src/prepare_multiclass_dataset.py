
from pathlib import Path
import csv
import random
import shutil
import hashlib
import sys

ROOT = Path(r"F:\lung disease detection system")
ORIGINAL = ROOT / "dataset"
MULTI = ROOT / "dataset_multiclass"
RAW = MULTI / "raw"

OUTPUT = {
    "train": MULTI / "train",
    "validation": MULTI / "validation",
    "test": MULTI / "test",
}

CLASSES = ["NORMAL", "PNEUMONIA", "TUBERCULOSIS", "COVID19"]
EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}
SEED = 42


def get_images(folder):
    if not folder.exists():
        raise FileNotFoundError(f"Source folder not found: {folder}")

    return sorted(
        p for p in folder.rglob("*")
        if p.is_file() and p.suffix.lower() in EXTENSIONS
    )


def split_images(images):
    """Deterministic 70% train, 15% validation, 15% test split."""
    images = list(images)
    random.Random(SEED).shuffle(images)

    n = len(images)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    return {
        "train": images[:train_end],
        "validation": images[train_end:val_end],
        "test": images[val_end:],
    }


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    # Do not overwrite existing prepared images.
    for split_dir in OUTPUT.values():
        if split_dir.exists() and any(
            p.is_file() for p in split_dir.rglob("*")
        ):
            sys.exit(
                f"STOP: {split_dir} already contains files. "
                "No files were copied. Inspect or clear the output "
                "directories before running again."
            )

    # Keep the original Normal/Pneumonia splits unchanged.
    sources = {
        ("train", "NORMAL"): ORIGINAL / "train" / "NORMAL",
        ("train", "PNEUMONIA"): ORIGINAL / "train" / "PNEUMONIA",
        ("validation", "NORMAL"): ORIGINAL / "validation" / "NORMAL",
        ("validation", "PNEUMONIA"): ORIGINAL / "validation" / "PNEUMONIA",
        ("test", "NORMAL"): ORIGINAL / "test" / "NORMAL",
        ("test", "PNEUMONIA"): ORIGINAL / "test" / "PNEUMONIA",
    }

    manifest_rows = []

    # Collect original dataset images.
    for (split, class_name), source_folder in sources.items():
        for src in get_images(source_folder):
            manifest_rows.append(
                (src, split, class_name, "original_pneumonia_dataset")
            )

    # Split TB and COVID images separately.
    extra_sources = {
        "TUBERCULOSIS": RAW / "tuberculosis" / "Tuberculosis",
        "COVID19": RAW / "covid19" / "COVID-19 Chest X-Ray Dataset",
    }

    for class_name, source_folder in extra_sources.items():
        images = get_images(source_folder)

        if not images:
            sys.exit(f"STOP: No images found in {source_folder}")

        parts = split_images(images)

        print(f"\n{class_name}: {len(images)} source images")
        for split, part in parts.items():
            print(f"  {split}: {len(part)} images")
            for src in part:
                manifest_rows.append(
                    (src, split, class_name, source_folder.name)
                )

    # Validate target classes before copying.
    for _, _, class_name, _ in manifest_rows:
        if class_name not in CLASSES:
            sys.exit(f"Unexpected class: {class_name}")

    # Create output folders and copy files.
    manifest_path = MULTI / "manifest.csv"
    MULTI.mkdir(parents=True, exist_ok=True)

    with manifest_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow([
            "source_path",
            "destination_path",
            "split",
            "class_name",
            "source_dataset",
            "sha256",
        ])

        counts = {
            split: {class_name: 0 for class_name in CLASSES}
            for split in OUTPUT
        }
        seen_hashes = {}

        for index, (src, split, class_name, source_name) in enumerate(
            manifest_rows, start=1
        ):
            destination_folder = OUTPUT[split] / class_name
            destination_folder.mkdir(parents=True, exist_ok=True)

            # Prefix names to prevent filename collisions.
            filename = f"{source_name}_{index}_{src.name}"
            destination = destination_folder / filename

            shutil.copy2(src, destination)
            file_hash = sha256(destination)

            seen_hashes.setdefault(file_hash, []).append(
                (split, class_name, str(src))
            )

            writer.writerow([
                str(src),
                str(destination),
                split,
                class_name,
                source_name,
                file_hash,
            ])

            counts[split][class_name] += 1

            if index % 500 == 0:
                print(f"Copied {index}/{len(manifest_rows)} images...")

    print("\n=== DATASET PREPARATION COMPLETE ===")
    for split in OUTPUT:
        print(f"\n{split.upper()}")
        for class_name in CLASSES:
            print(f"  {class_name}: {counts[split][class_name]}")
        print(f"  Total: {sum(counts[split].values())}")

    duplicate_groups = [
        entries for entries in seen_hashes.values()
        if len(entries) > 1
    ]

    print(f"\nExact-content duplicate groups: {len(duplicate_groups)}")
    if duplicate_groups:
        print(
            "WARNING: Inspect duplicate groups in the manifest/hash "
            "data before treating the test set as independent."
        )

    print(f"\nManifest saved to: {manifest_path}")
    print("Raw source datasets were not modified.")


if __name__ == "__main__":
    main()
