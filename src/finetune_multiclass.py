
from pathlib import Path
import json

import numpy as np
import tensorflow as tf

# --------------------------------------------------
# Configuration
# --------------------------------------------------
ROOT = Path(r"F:\lung disease detection system")
DATA_DIR = ROOT / "dataset_multiclass"
MODEL_DIR = ROOT / "model"

BASELINE_PATH = MODEL_DIR / "efficientnetb0_multiclass_best.keras"
FINETUNED_PATH = MODEL_DIR / "efficientnetb0_multiclass_finetuned_best.keras"
RESULTS_PATH = MODEL_DIR / "finetuning_comparison.json"

CLASS_NAMES = ["NORMAL", "PNEUMONIA", "TUBERCULOSIS", "COVID19"]
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 8
EPOCHS = 5
SEED = 42

tf.config.threading.set_intra_op_parallelism_threads(4)
tf.config.threading.set_inter_op_parallelism_threads(2)
tf.keras.utils.set_random_seed(SEED)

# --------------------------------------------------
# Verify paths
# --------------------------------------------------
if not BASELINE_PATH.exists():
    raise FileNotFoundError(
        f"Baseline model not found: {BASELINE_PATH}\n"
        "Do not continue until the baseline model is available."
    )

# --------------------------------------------------
# Load train and validation datasets
# --------------------------------------------------
train_ds = tf.keras.utils.image_dataset_from_directory(
    DATA_DIR / "train",
    class_names=CLASS_NAMES,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=True,
    seed=SEED,
)

val_ds = tf.keras.utils.image_dataset_from_directory(
    DATA_DIR / "validation",
    class_names=CLASS_NAMES,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=False,
)

train_ds = train_ds.prefetch(tf.data.AUTOTUNE)
val_ds = val_ds.prefetch(tf.data.AUTOTUNE)

# Calculate weights from training data only.
counts = np.zeros(len(CLASS_NAMES), dtype=np.int64)
for _, labels in train_ds:
    counts += np.bincount(
        labels.numpy(),
        minlength=len(CLASS_NAMES),
    )

if np.any(counts == 0):
    raise ValueError(f"Missing class in training dataset: {counts}")

total = int(counts.sum())
class_weights = {
    i: total / (len(CLASS_NAMES) * int(counts[i]))
    for i in range(len(CLASS_NAMES))
}

print("\nTraining class counts:")
for i, name in enumerate(CLASS_NAMES):
    print(f"{name}: {counts[i]}")
print("Class weights:", class_weights)

# --------------------------------------------------
# Load baseline and evaluate before fine-tuning
# The baseline file is never saved or overwritten.
# --------------------------------------------------
baseline = tf.keras.models.load_model(BASELINE_PATH)

print("\n=== BASELINE VALIDATION RESULTS ===")
baseline_results = baseline.evaluate(
    val_ds,
    return_dict=True,
    verbose=1,
)

for key, value in baseline_results.items():
    print(f"{key}: {value:.4f}")

# --------------------------------------------------
# Find and selectively unfreeze EfficientNetB0
# --------------------------------------------------
model = tf.keras.models.load_model(BASELINE_PATH)

base_model = model.get_layer("efficientnetb0")

# First freeze the entire backbone.
base_model.trainable = False

# Unfreeze only the final 25 backbone layers.
# Keep Batch Normalization frozen for more stable CPU training.
base_model.trainable = True

cutoff = max(0, len(base_model.layers) - 25)

for layer in base_model.layers[:cutoff]:
    layer.trainable = False

for layer in base_model.layers[cutoff:]:
    if isinstance(layer, tf.keras.layers.BatchNormalization):
        layer.trainable = False
    else:
        layer.trainable = True

trainable_layers = [
    layer.name for layer in base_model.layers if layer.trainable
]

print("\nBackbone layers:", len(base_model.layers))
print("Trainable backbone layers:", len(trainable_layers))
print("Last trainable layer names:", trainable_layers[-10:])

if not trainable_layers:
    raise RuntimeError("No backbone layers were unfrozen.")

# Recompile with a low learning rate for fine-tuning.
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)

# --------------------------------------------------
# Callbacks
# --------------------------------------------------
callbacks = [
    tf.keras.callbacks.ModelCheckpoint(
        filepath=str(FINETUNED_PATH),
        monitor="val_loss",
        save_best_only=True,
        verbose=1,
    ),
    tf.keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=2,
        restore_best_weights=True,
        verbose=1,
    ),
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.5,
        patience=1,
        min_lr=1e-7,
        verbose=1,
    ),
]

# --------------------------------------------------
# Fine-tune
# --------------------------------------------------
print("\n=== STARTING FINE-TUNING ===")

history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS,
    class_weight=class_weights,
    callbacks=callbacks,
)

if not FINETUNED_PATH.exists():
    raise RuntimeError(
        "No fine-tuned checkpoint was saved. "
        "Check the training output before proceeding."
    )

# --------------------------------------------------
# Evaluate both models on the same validation dataset
# --------------------------------------------------
print("\n=== FINAL MODEL COMPARISON ===")

best_finetuned = tf.keras.models.load_model(FINETUNED_PATH)
finetuned_results = best_finetuned.evaluate(
    val_ds,
    return_dict=True,
    verbose=1,
)

comparison = {
    "baseline_model": str(BASELINE_PATH),
    "finetuned_model": str(FINETUNED_PATH),
    "validation": {
        "baseline": {
            key: float(value)
            for key, value in baseline_results.items()
        },
        "finetuned": {
            key: float(value)
            for key, value in finetuned_results.items()
        },
    },
    "class_names": CLASS_NAMES,
    "trainable_backbone_layers": trainable_layers,
    "fine_tuning_epochs_completed": len(history.history["loss"]),
}

with RESULTS_PATH.open("w", encoding="utf-8") as f:
    json.dump(comparison, f, indent=2)

for metric in ["accuracy", "loss"]:
    before = baseline_results[metric]
    after = finetuned_results[metric]
    print(
        f"{metric}: baseline={before:.4f}, "
        f"fine-tuned={after:.4f}, difference={after - before:+.4f}"
    )

print("\nBaseline preserved:", BASELINE_PATH)
print("Fine-tuned model:", FINETUNED_PATH)
print("Comparison report:", RESULTS_PATH)
print(
    "\nDo not select a final model from validation accuracy alone. "
    "Review per-class recall and F1-score before deciding."
)
