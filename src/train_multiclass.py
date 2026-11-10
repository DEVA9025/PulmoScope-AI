
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
MODEL_DIR.mkdir(parents=True, exist_ok=True)

CLASS_NAMES = ["NORMAL", "PNEUMONIA", "TUBERCULOSIS", "COVID19"]
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 8
EPOCHS = 8
SEED = 42

TRAIN_DIR = DATA_DIR / "train"
VAL_DIR = DATA_DIR / "validation"

BEST_MODEL_PATH = MODEL_DIR / "efficientnetb0_multiclass_best.keras"
CLASS_NAMES_PATH = MODEL_DIR / "multiclass_class_names.json"

# Keep CPU usage reasonable on a typical Windows laptop.
tf.config.threading.set_intra_op_parallelism_threads(4)
tf.config.threading.set_inter_op_parallelism_threads(2)

tf.keras.utils.set_random_seed(SEED)

print("TensorFlow:", tf.__version__)
print("GPUs detected:", tf.config.list_physical_devices("GPU"))
print("Training device: CPU unless a supported GPU is detected")

# --------------------------------------------------
# Load datasets
# EfficientNetB0 expects pixel values in [0, 255].
# Do not add Rescaling(1./255) here.
# --------------------------------------------------
train_ds = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    class_names=CLASS_NAMES,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=True,
    seed=SEED,
)

val_ds = tf.keras.utils.image_dataset_from_directory(
    VAL_DIR,
    class_names=CLASS_NAMES,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=False,
)

print("\nClass order:", train_ds.class_names)

# Prefetch improves pipeline efficiency without caching the
# entire decoded dataset in RAM.
autotune = tf.data.AUTOTUNE
train_ds = train_ds.prefetch(autotune)
val_ds = val_ds.prefetch(autotune)

# --------------------------------------------------
# Calculate class weights from training labels only.
# --------------------------------------------------
class_counts = np.zeros(len(CLASS_NAMES), dtype=np.int64)

for _, labels in train_ds:
    class_counts += np.bincount(
        labels.numpy(),
        minlength=len(CLASS_NAMES),
    )

if np.any(class_counts == 0):
    raise ValueError(f"A class has no training images: {class_counts}")

total = int(class_counts.sum())
class_weights = {
    i: total / (len(CLASS_NAMES) * int(class_counts[i]))
    for i in range(len(CLASS_NAMES))
}

print("\nTraining class counts:")
for i, name in enumerate(CLASS_NAMES):
    print(f"{name}: {class_counts[i]}")

print("\nClass weights:", class_weights)

# Save class mapping for future prediction code.
with CLASS_NAMES_PATH.open("w", encoding="utf-8") as f:
    json.dump(CLASS_NAMES, f, indent=2)

# --------------------------------------------------
# Mild data augmentation
# No horizontal flips, to avoid changing image laterality.
# --------------------------------------------------
augmentation = tf.keras.Sequential(
    [
        tf.keras.layers.RandomRotation(0.03),
        tf.keras.layers.RandomZoom(0.05),
    ],
    name="data_augmentation",
)

# --------------------------------------------------
# Build EfficientNetB0 transfer-learning model
# --------------------------------------------------
base_model = tf.keras.applications.EfficientNetB0(
    include_top=False,
    weights="imagenet",
    input_shape=(*IMAGE_SIZE, 3),
)
base_model.trainable = False

inputs = tf.keras.Input(shape=(*IMAGE_SIZE, 3))
x = augmentation(inputs)
x = base_model(x, training=False)
x = tf.keras.layers.GlobalAveragePooling2D()(x)
x = tf.keras.layers.Dropout(0.30)(x)
x = tf.keras.layers.Dense(128, activation="relu")(x)
x = tf.keras.layers.Dropout(0.20)(x)
outputs = tf.keras.layers.Dense(
    len(CLASS_NAMES),
    activation="softmax",
)(x)

model = tf.keras.Model(inputs, outputs, name="lung_multiclass_efficientnetb0")

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)

model.summary()

# --------------------------------------------------
# Callbacks
# --------------------------------------------------
callbacks = [
    tf.keras.callbacks.ModelCheckpoint(
        filepath=str(BEST_MODEL_PATH),
        monitor="val_loss",
        save_best_only=True,
        verbose=1,
    ),
    tf.keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=3,
        restore_best_weights=True,
        verbose=1,
    ),
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.5,
        patience=2,
        min_lr=1e-6,
        verbose=1,
    ),
]

# --------------------------------------------------
# Train classification head
# --------------------------------------------------
history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS,
    class_weight=class_weights,
    callbacks=callbacks,
)

# Save training history for later plotting.
history_path = MODEL_DIR / "multiclass_training_history.json"
with history_path.open("w", encoding="utf-8") as f:
    json.dump(
        {key: [float(v) for v in values]
         for key, values in history.history.items()},
        f,
        indent=2,
    )

print("\nTraining finished.")
print("Best model:", BEST_MODEL_PATH)
print("Class mapping:", CLASS_NAMES_PATH)
print("Training history:", history_path)

print("\nBest-model validation evaluation:")
best_model = tf.keras.models.load_model(BEST_MODEL_PATH)
results = best_model.evaluate(val_ds, return_dict=True, verbose=1)
for key, value in results.items():
    print(f"{key}: {value:.4f}")

print(
    "\nNOTE: Validation performance is not final test performance. "
    "Use the test set only after model choices are complete."
)

