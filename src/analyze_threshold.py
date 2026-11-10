
import os
import numpy as np
import tensorflow as tf
from sklearn.metrics import confusion_matrix

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "dataset", "validation")
MODEL_PATH = os.path.join(BASE_DIR, "model", "best_finetuned.keras")

IMG_SIZE = (224, 224)
BATCH_SIZE = 32

# Load validation data in a fixed order
ds = tf.keras.utils.image_dataset_from_directory(
    DATA_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="binary",
    shuffle=False
)

model = tf.keras.models.load_model(MODEL_PATH, compile=False)

y_true = np.concatenate([
    labels.numpy().reshape(-1) for _, labels in ds
]).astype(int)

y_score = np.concatenate([
    model.predict(images, verbose=0).reshape(-1)
    for images, _ in ds
])

print("\nClass order:", ds.class_names)
print("Validation images:", len(y_true))
print("Pneumonia score range:",
      round(float(y_score.min()), 4),
      "to",
      round(float(y_score.max()), 4))

# Compare several thresholds on validation data only
print("\nThreshold comparison (validation only)")
print("Threshold | Accuracy | Normal recall | Pneumonia recall")

for threshold in [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70]:
    y_pred = (y_score >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])

    normal_recall = cm[0, 0] / cm[0].sum()
    pneumonia_recall = cm[1, 1] / cm[1].sum()
    accuracy = np.mean(y_pred == y_true)

    print(
        f"{threshold:9.2f} | {accuracy:8.2%} |"
        f" {normal_recall:12.2%} | {pneumonia_recall:16.2%}"
    )
