
import os
import csv
import json
import numpy as np
import tensorflow as tf
from tensorflow import keras

# Project paths
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_DIR = os.path.join(PROJECT_DIR, "dataset_multiclass", "test")
MODEL_PATH = os.path.join(
    PROJECT_DIR, "model", "efficientnetb0_multiclass_best.keras"
)
CLASS_NAMES_PATH = os.path.join(
    PROJECT_DIR, "model", "multiclass_class_names.json"
)
OUTPUT_CSV = os.path.join(
    PROJECT_DIR, "model", "normal_as_pneumonia_errors.csv"
)

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 8

# Load the saved class order
with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as file:
    class_names = json.load(file)

print("Class names:", class_names)

# Load the test dataset without shuffling
test_ds = keras.utils.image_dataset_from_directory(
    TEST_DIR,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False,
    class_names=class_names
)

# Keep the exact file order used by the dataset
file_paths = test_ds.file_paths

# Improve input pipeline performance
test_ds = test_ds.prefetch(tf.data.AUTOTUNE)

# Load the original baseline model
model = keras.models.load_model(MODEL_PATH)

# Generate predictions
print("\nAnalyzing test images...")
probabilities = model.predict(test_ds, verbose=1)

predicted_ids = np.argmax(probabilities, axis=1)

# Collect actual labels in dataset order
actual_ids = np.concatenate([
    labels.numpy() for _, labels in test_ds
])

# Find NORMAL images predicted as PNEUMONIA
normal_id = class_names.index("NORMAL")
pneumonia_id = class_names.index("PNEUMONIA")

errors = []

for i, (actual_id, predicted_id) in enumerate(
    zip(actual_ids, predicted_ids)
):
    if actual_id == normal_id and predicted_id == pneumonia_id:
        errors.append({
            "image_path": file_paths[i],
            "actual_class": class_names[actual_id],
            "predicted_class": class_names[predicted_id],
            "normal_probability": float(probabilities[i][normal_id]),
            "pneumonia_probability": float(
                probabilities[i][pneumonia_id]
            ),
            "tb_probability": float(
                probabilities[i][class_names.index("TUBERCULOSIS")]
            ),
            "covid_probability": float(
                probabilities[i][class_names.index("COVID19")]
            )
        })

# Save the error report
os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)

with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as file:
    writer = csv.DictWriter(file, fieldnames=[
        "image_path",
        "actual_class",
        "predicted_class",
        "normal_probability",
        "pneumonia_probability",
        "tb_probability",
        "covid_probability"
    ])
    writer.writeheader()
    writer.writerows(errors)

print("\n========== ERROR ANALYSIS ==========")
print("Total test images:", len(file_paths))
print("NORMAL predicted as PNEUMONIA:", len(errors))
print("CSV report saved to:", OUTPUT_CSV)

print("\nFirst 10 misclassified images:")
for item in errors[:10]:
    print("\nImage:", item["image_path"])
    print("NORMAL probability:",
          round(item["normal_probability"], 4))
    print("PNEUMONIA probability:",
          round(item["pneumonia_probability"], 4))
