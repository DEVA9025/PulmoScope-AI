
from pathlib import Path
import json

import numpy as np
import tensorflow as tf
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
)

ROOT = Path(r"F:\lung disease detection system")
TEST_DIR = ROOT / "dataset_multiclass" / "test"
MODEL_PATH = ROOT / "model" / "efficientnetb0_multiclass_best.keras"
CLASS_NAMES_PATH = ROOT / "model" / "multiclass_class_names.json"
REPORT_PATH = ROOT / "model" / "multiclass_test_report.txt"

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 8

with CLASS_NAMES_PATH.open("r", encoding="utf-8") as f:
    class_names = json.load(f)

test_ds = tf.keras.utils.image_dataset_from_directory(
    TEST_DIR,
    class_names=class_names,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=False,
)

model = tf.keras.models.load_model(MODEL_PATH)

true_labels = np.concatenate([
    labels.numpy() for _, labels in test_ds
])

probabilities = model.predict(test_ds, verbose=1)
predicted_labels = np.argmax(probabilities, axis=1)

accuracy = accuracy_score(true_labels, predicted_labels)

report = classification_report(
    true_labels,
    predicted_labels,
    labels=list(range(len(class_names))),
    target_names=class_names,
    digits=4,
    zero_division=0,
)

matrix = confusion_matrix(
    true_labels,
    predicted_labels,
    labels=list(range(len(class_names))),
)

print("\n=== HELD-OUT TEST RESULTS ===")
print(f"Test accuracy: {accuracy:.4f} ({accuracy * 100:.2f}%)")

print("\n=== PER-CLASS REPORT ===")
print(report)

print("=== CONFUSION MATRIX ===")
print("Rows = actual class; columns = predicted class")
print("Class order:", class_names)
print(matrix)

with REPORT_PATH.open("w", encoding="utf-8") as f:
    f.write(f"Test accuracy: {accuracy:.4f}\n\n")
    f.write("Class order: " + ", ".join(class_names) + "\n\n")
    f.write("Classification report:\n")
    f.write(report)
    f.write("\nConfusion matrix:\n")
    f.write(str(matrix))

print("\nReport saved to:", REPORT_PATH)
