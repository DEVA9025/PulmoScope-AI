import tensorflow as tf
from tensorflow.keras import layers, models
from sklearn.utils.class_weight import compute_class_weight
import numpy as np
import os

# ============================================================
# 1. CONFIGURATION
# ============================================================

IMG_SIZE = (224, 224)
BATCH_SIZE = 32

INITIAL_EPOCHS = 8
FINE_TUNE_EPOCHS = 20

TRAIN_DIR = "dataset/train"
VALIDATION_DIR = "dataset/validation"

MODEL_DIR = "model"

os.makedirs(MODEL_DIR, exist_ok=True)

# ============================================================
# 2. LOAD DATASET
# ============================================================

print("\n========================================")
print("LOADING DATASET")
print("========================================")

train_data = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="binary",
    shuffle=True,
    seed=42
)

validation_data = tf.keras.utils.image_dataset_from_directory(
    VALIDATION_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="binary",
    shuffle=False
)

class_names = train_data.class_names

print("\nClasses:", class_names)

# ============================================================
# 3. DATASET PERFORMANCE
# ============================================================

AUTOTUNE = tf.data.AUTOTUNE

train_data = train_data.prefetch(AUTOTUNE)
validation_data = validation_data.prefetch(AUTOTUNE)

# ============================================================
# 4. CALCULATE CLASS DISTRIBUTION
# ============================================================

print("\n========================================")
print("CALCULATING CLASS DISTRIBUTION")
print("========================================")

y_train = []

for images, labels in train_data:
    y_train.extend(labels.numpy().flatten())

y_train = np.array(y_train).astype(int)

classes, counts = np.unique(y_train, return_counts=True)

print("\nTraining class distribution:")

for c, count in zip(classes, counts):
    print(
        f"{class_names[c]} : {count}"
    )

# ============================================================
# 5. MILD CLASS WEIGHTS
# ============================================================

print("\n========================================")
print("CALCULATING CLASS WEIGHTS")
print("========================================")

balanced_weights = compute_class_weight(
    class_weight="balanced",
    classes=classes,
    y=y_train
)

balanced_weights = dict(
    zip(classes, balanced_weights)
)

print("\nOriginal balanced weights:")
print(balanced_weights)

# Reduce the strength of weighting.
# This prevents the model from becoming too biased
# toward PNEUMONIA.

class_weight_dict = {
    0: 1.15,
    1: 0.95
}

print("\nUsing mild custom weights:")
print(class_weight_dict)

# ============================================================
# 6. DATA AUGMENTATION
# ============================================================

data_augmentation = tf.keras.Sequential([
    layers.RandomRotation(0.02),
    layers.RandomZoom(
        height_factor=(-0.05, 0.05),
        width_factor=(-0.05, 0.05)
    ),
    layers.RandomContrast(0.08)
])

# ============================================================
# 7. LOAD EFFICIENTNETB0
# ============================================================

print("\n========================================")
print("LOADING EFFICIENTNETB0")
print("========================================")

base_model = tf.keras.applications.EfficientNetB0(
    include_top=False,
    weights="imagenet",
    input_shape=(224, 224, 3)
)

base_model.trainable = False

# ============================================================
# 8. BUILD MODEL
# ============================================================

inputs = layers.Input(
    shape=(224, 224, 3)
)

x = data_augmentation(inputs)

x = base_model(
    x,
    training=False
)

x = layers.GlobalAveragePooling2D()(x)

x = layers.BatchNormalization()(x)

x = layers.Dropout(0.35)(x)

x = layers.Dense(
    128,
    activation="relu"
)(x)

x = layers.Dropout(0.25)(x)

outputs = layers.Dense(
    1,
    activation="sigmoid"
)(x)

model = models.Model(
    inputs,
    outputs
)

model.summary()

# ============================================================
# 9. STAGE 1 COMPILE
# ============================================================

print("\n========================================")
print("STAGE 1 COMPILE")
print("========================================")

model.compile(
    optimizer=tf.keras.optimizers.Adam(
        learning_rate=1e-4
    ),
    loss="binary_crossentropy",
    metrics=[
        "accuracy",
        tf.keras.metrics.Precision(
            name="precision"
        ),
        tf.keras.metrics.Recall(
            name="recall"
        )
    ]
)

# ============================================================
# 10. STAGE 1 CALLBACKS
# ============================================================

checkpoint_stage1 = tf.keras.callbacks.ModelCheckpoint(
    os.path.join(
        MODEL_DIR,
        "best_stage1.keras"
    ),
    monitor="val_accuracy",
    save_best_only=True,
    mode="max",
    verbose=1
)

early_stopping_stage1 = tf.keras.callbacks.EarlyStopping(
    monitor="val_loss",
    patience=4,
    restore_best_weights=True,
    verbose=1
)

reduce_lr_stage1 = tf.keras.callbacks.ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.3,
    patience=2,
    min_lr=1e-7,
    verbose=1
)

# ============================================================
# 11. STAGE 1 TRAINING
# ============================================================

print("\n========================================")
print("STAGE 1: TRAINING CLASSIFICATION HEAD")
print("========================================")

history1 = model.fit(
    train_data,
    validation_data=validation_data,
    epochs=INITIAL_EPOCHS,
    class_weight=class_weight_dict,
    callbacks=[
        checkpoint_stage1,
        early_stopping_stage1,
        reduce_lr_stage1
    ]
)

# ============================================================
# 12. LOAD BEST STAGE 1 MODEL
# ============================================================

print("\n========================================")
print("LOADING BEST STAGE 1 MODEL")
print("========================================")

model = tf.keras.models.load_model(
    os.path.join(
        MODEL_DIR,
        "best_stage1.keras"
    )
)

# ============================================================
# 13. FIND EFFICIENTNET BASE MODEL
# ============================================================

print("\n========================================")
print("PREPARING FINE-TUNING")
print("========================================")

base_model = None

for layer in model.layers:

    if isinstance(
        layer,
        tf.keras.Model
    ):

        if "efficientnet" in layer.name.lower():

            base_model = layer
            break

if base_model is None:
    raise RuntimeError(
        "EfficientNetB0 base model could not be found."
    )

print(
    "Base model:",
    base_model.name
)

# ============================================================
# 14. FINE-TUNING
# ============================================================

base_model.trainable = True

# Freeze first 180 layers
fine_tune_at = 180

for layer in base_model.layers[:fine_tune_at]:

    layer.trainable = False

# Keep BatchNormalization frozen
for layer in base_model.layers:

    if isinstance(
        layer,
        layers.BatchNormalization
    ):

        layer.trainable = False

trainable_count = sum(
    layer.trainable
    for layer in base_model.layers
)

print(
    "\nTrainable EfficientNetB0 layers:",
    trainable_count
)

# ============================================================
# 15. RECOMPILE
# ============================================================

print("\n========================================")
print("FINE-TUNING COMPILE")
print("========================================")

model.compile(
    optimizer=tf.keras.optimizers.Adam(
        learning_rate=5e-6
    ),
    loss="binary_crossentropy",
    metrics=[
        "accuracy",
        tf.keras.metrics.Precision(
            name="precision"
        ),
        tf.keras.metrics.Recall(
            name="recall"
        )
    ]
)

# ============================================================
# 16. FINE-TUNING CALLBACKS
# ============================================================

checkpoint_finetune = tf.keras.callbacks.ModelCheckpoint(
    os.path.join(
        MODEL_DIR,
        "best_finetuned.keras"
    ),
    monitor="val_accuracy",
    save_best_only=True,
    mode="max",
    verbose=1
)

early_stopping_finetune = tf.keras.callbacks.EarlyStopping(
    monitor="val_loss",
    patience=5,
    restore_best_weights=True,
    verbose=1
)

reduce_lr_finetune = tf.keras.callbacks.ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.3,
    patience=2,
    min_lr=1e-8,
    verbose=1
)

# ============================================================
# 17. FINE-TUNE
# ============================================================

print("\n========================================")
print("STAGE 2: FINE-TUNING EFFICIENTNETB0")
print("========================================")

history2 = model.fit(
    train_data,
    validation_data=validation_data,
    epochs=FINE_TUNE_EPOCHS,
    class_weight=class_weight_dict,
    callbacks=[
        checkpoint_finetune,
        early_stopping_finetune,
        reduce_lr_finetune
    ]
)

# ============================================================
# 18. LOAD BEST MODEL
# ============================================================

print("\n========================================")
print("LOADING BEST MODEL")
print("========================================")

best_model = tf.keras.models.load_model(
    os.path.join(
        MODEL_DIR,
        "best_finetuned.keras"
    )
)

# ============================================================
# 19. SAVE FINAL MODEL
# ============================================================

final_model_path = os.path.join(
    MODEL_DIR,
    "efficientnetb0_pneumonia_best.keras"
)

best_model.save(
    final_model_path
)

# ============================================================
# 20. TRAINING COMPLETE
# ============================================================

print("\n========================================")
print("TRAINING COMPLETED")
print("========================================")

print(
    "\nBest model saved at:"
)

print(
    final_model_path
)

print(
    "\nNext step:"
)

print(
    "Run evaluate_model.py"
)