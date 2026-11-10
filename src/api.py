
import base64
import io
import json
import os

import numpy as np
import tensorflow as tf

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import FastAPI, File, HTTPException, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from tensorflow import keras


# --------------------------------------------------
# 1. PROJECT CONFIGURATION
# --------------------------------------------------

PROJECT_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

MODEL_PATH = os.path.join(
    PROJECT_DIR,
    "model",
    "efficientnetb0_multiclass_best.keras",
)

CLASS_NAMES_PATH = os.path.join(
    PROJECT_DIR,
    "model",
    "multiclass_class_names.json",
)

IMAGE_SIZE = (224, 224)
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


# --------------------------------------------------
# 2. LOAD MODEL
# --------------------------------------------------

if not os.path.isfile(MODEL_PATH):
    raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

if not os.path.isfile(CLASS_NAMES_PATH):
    raise FileNotFoundError(
        f"Class names file not found: {CLASS_NAMES_PATH}"
    )

with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as file:
    CLASS_NAMES = json.load(file)

EXPECTED_CLASSES = {
    "NORMAL",
    "PNEUMONIA",
    "TUBERCULOSIS",
    "COVID19",
}

if set(CLASS_NAMES) != EXPECTED_CLASSES:
    raise ValueError(f"Unexpected class names: {CLASS_NAMES}")

print("Loading four-class model...")
model = keras.models.load_model(MODEL_PATH)
print("Model loaded successfully.")
print("Classes:", CLASS_NAMES)


# --------------------------------------------------
# 3. FASTAPI AND CORS
# --------------------------------------------------

app = FastAPI(
    title="Lung X-ray Classification API",
    description=(
        "Research prototype for four-class X-ray "
        "classification and Grad-CAM visualization."
    ),
    version="1.2.0",
)

# Authentication and Patient records routes
from src.auth_router import router as auth_router, current_user
from src.patients_router import router as patients_router

app.include_router(auth_router)
app.include_router(patients_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# --------------------------------------------------
# 4. IMAGE ENCODING
# --------------------------------------------------

def image_to_base64(image):
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(
        buffer.getvalue()
    ).decode("utf-8")


# --------------------------------------------------
# 5. FIND LAST CONVOLUTIONAL LAYER
# --------------------------------------------------

def find_last_conv_layer(loaded_model):
    for layer in reversed(loaded_model.layers):

        if isinstance(layer, keras.Model):
            for nested_layer in reversed(layer.layers):
                if isinstance(
                    nested_layer,
                    keras.layers.Conv2D,
                ):
                    return layer.name, nested_layer.name

        if isinstance(layer, keras.layers.Conv2D):
            return None, layer.name

    raise ValueError(
        "Could not find a Conv2D layer for Grad-CAM."
    )


# --------------------------------------------------
# 6. GRAD-CAM MODEL AND VISUALIZATION
# --------------------------------------------------

grad_model = None


def build_grad_model(loaded_model):
    """Build a specialized Grad-CAM model that outputs last conv feature maps

    and un-activated (pre-softmax) logits to prevent gradient saturation.
    """
    backbone_name, conv_name = find_last_conv_layer(loaded_model)

    inp = keras.Input(shape=IMAGE_SIZE + (3,), name="gradcam_input")

    if backbone_name is not None:
        backbone = loaded_model.get_layer(backbone_name)
        conv_layer = backbone.get_layer(conv_name)

        # Dual-output backbone: conv feature maps and final backbone output
        backbone_with_conv = keras.Model(
            inputs=backbone.inputs,
            outputs=[conv_layer.output, backbone.output],
            name="backbone_with_conv",
        )

        x = inp
        # Forward pass through layers before backbone (e.g. data_augmentation)
        for layer in loaded_model.layers:
            if layer.name == backbone_name:
                break
            if not isinstance(layer, keras.layers.InputLayer):
                x = layer(x, training=False)

        conv_out, bb_out = backbone_with_conv(x, training=False)

        # Forward pass through downstream classification layers after backbone
        x = bb_out
        after_backbone = False
        downstream_layers = []
        for layer in loaded_model.layers:
            if layer.name == backbone_name:
                after_backbone = True
                continue
            if after_backbone:
                downstream_layers.append(layer)

        for layer in downstream_layers[:-1]:
            x = layer(x, training=False)

        # Final classification layer with linear activation (pre-softmax logits)
        last_layer = downstream_layers[-1]
        dense_logits = keras.layers.Dense(
            units=last_layer.units,
            activation=None,
            use_bias=last_layer.use_bias,
            name="gradcam_dense_logits",
        )
        logits = dense_logits(x)
        dense_logits.set_weights(last_layer.get_weights())

        return keras.Model(
            inputs=inp,
            outputs=[conv_out, logits],
            name="gradcam_model",
        )

    else:
        conv_layer = loaded_model.get_layer(conv_name)
        return keras.Model(
            inputs=loaded_model.inputs,
            outputs=[conv_layer.output, loaded_model.output],
            name="gradcam_model",
        )


def generate_gradcam(image_batch, class_index):
    global grad_model
    if grad_model is None:
        grad_model = build_grad_model(model)

    image_tensor = tf.convert_to_tensor(image_batch)

    with tf.GradientTape() as tape:
        feature_maps, predictions = grad_model(
            image_tensor,
            training=False,
        )
        class_score = predictions[:, class_index]

    gradients = tape.gradient(class_score, feature_maps)

    if gradients is None:
        raise ValueError(
            "Gradients are unavailable for Grad-CAM."
        )

    weights = tf.reduce_mean(
        gradients,
        axis=(1, 2),
    )

    raw_heatmap = tf.reduce_sum(
        feature_maps * weights[:, None, None, :],
        axis=-1,
    )[0]

    raw_heatmap = tf.nn.relu(raw_heatmap)

    raw_min = float(tf.reduce_min(raw_heatmap).numpy())
    raw_max = float(tf.reduce_max(raw_heatmap).numpy())

    print(
        f"Grad-CAM class index: {class_index}; "
        f"raw min: {raw_min:.8g}; "
        f"raw max: {raw_max:.8g}"
    )

    # Normalize safely by peak activation; if activations are near zero,
    # safely produce a blank heatmap instead of failing the request.
    if np.isfinite(raw_max) and raw_max > 1e-12:
        heatmap = (raw_heatmap / raw_max).numpy()
    else:
        heatmap = np.zeros(raw_heatmap.shape, dtype=np.float32)

    heatmap = np.clip(
        heatmap,
        0.0,
        1.0,
    )

    print(
        f"Normalized heatmap min: {heatmap.min():.4f}; "
        f"max: {heatmap.max():.4f}; "
        f"std: {heatmap.std():.4f}"
    )

    return heatmap


# --------------------------------------------------
# 7. COLORIZE HEATMAP AT DISPLAY SIZE
# --------------------------------------------------

def colorize_heatmap(heatmap, display_size):
    heatmap_image = Image.fromarray(
        (np.clip(heatmap, 0.0, 1.0) * 255).astype(np.uint8)
    )

    # PIL size order is (width, height).
    heatmap_image = heatmap_image.resize(
        display_size,
        Image.Resampling.BILINEAR,
    )

    heatmap_array = (
        np.asarray(heatmap_image, dtype=np.float32) / 255.0
    )

    colored = plt.get_cmap("jet")(
        heatmap_array
    )[..., :3]

    colored_image = Image.fromarray(
        (np.clip(colored, 0.0, 1.0) * 255).astype(np.uint8)
    )

    return colored_image, heatmap_array


# --------------------------------------------------
# 8. CREATE OVERLAY (HIGH-CLARITY FOCAL HIGHLIGHT)
# --------------------------------------------------

def create_overlay(original, heatmap_image, heatmap_array):
    original_rgb = (
        np.asarray(original, dtype=np.float32) / 255.0
    )

    heatmap_rgb = (
        np.asarray(heatmap_image, dtype=np.float32) / 255.0
    )

    # 1. Sharpen focal response to suppress diffuse low-level activations
    # and highlight true salient pathological zones.
    h_sharp = np.power(heatmap_array, 1.6)

    # 2. Thresholding: non-salient regions (< 0.28) remain 100% natural X-ray
    # with zero color tint, completely removing dark blue background fog.
    threshold = 0.28
    activation_ramp = np.clip(
        (h_sharp - threshold) / (1.0 - threshold),
        0.0,
        1.0,
    )

    # 3. Smooth cubic transition
    smooth_mask = (
        activation_ramp
        * activation_ramp
        * (3.0 - 2.0 * activation_ramp)
    )

    # 4. Translucent peak opacity (max 0.48) to keep underlying bones,
    # ribs, and lung textures completely clear and legible.
    alpha_map = (0.48 * smooth_mask)[..., None]

    overlay_array = (
        original_rgb * (1.0 - alpha_map)
        + heatmap_rgb * alpha_map
    )

    return Image.fromarray(
        (
            np.clip(overlay_array, 0.0, 1.0) * 255
        ).astype(np.uint8)
    )


# --------------------------------------------------
# 9. HEALTH CHECKS
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Lung X-ray Classification API is running",
        "classes": CLASS_NAMES,
        "model_loaded": True,
    }


@app.get("/health")
def health():
    return {"status": "ok"}


# --------------------------------------------------
# 10. PREDICT AND GENERATE VISUALIZATIONS
# --------------------------------------------------

@app.post("/predict")
async def predict(file: UploadFile = File(...), user: dict = Depends(current_user)):

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    try:
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=415,
                detail="Upload a JPEG, PNG, or WEBP image.",
            )

        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        if len(contents) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Image exceeds the 10 MB upload limit.",
            )

        try:
            with Image.open(io.BytesIO(contents)) as uploaded:
                # Correct image orientation first.
                display_original = ImageOps.exif_transpose(
                    uploaded
                ).convert("RGB")

                # Preserve original aspect ratio and dimensions.
                display_original = display_original.copy()

        except (UnidentifiedImageError, OSError) as error:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid image.",
            ) from error

        # IMPORTANT:
        # Resize only the model input, not the display image.
        model_input = display_original.resize(
            IMAGE_SIZE,
            Image.Resampling.BILINEAR,
        )

        image_array = np.asarray(
            model_input,
            dtype=np.float32,
        )

        image_batch = np.expand_dims(
            image_array,
            axis=0,
        )

        # Predict the four classes.
        scores = model.predict(
            image_batch,
            verbose=0,
        )[0]

        if not np.all(np.isfinite(scores)):
            raise ValueError(
                "The model returned non-finite scores."
            )

        predicted_index = int(np.argmax(scores))
        predicted_class = CLASS_NAMES[predicted_index]

        # Generate Grad-CAM at model resolution.
        heatmap = generate_gradcam(
            image_batch,
            predicted_index,
        )

        # Resize the heatmap to the original image dimensions.
        heatmap_image, display_heatmap_array = colorize_heatmap(
            heatmap,
            display_original.size,
        )

        # Blend images with matching dimensions.
        overlay = create_overlay(
            display_original,
            heatmap_image,
            display_heatmap_array,
        )

        print("Predicted class:", predicted_class)
        print("Original image size:", display_original.size)
        print("Model input size:", model_input.size)

        return {
            "predicted_class": predicted_class,
            "scores": {
                name: round(float(score), 6)
                for name, score in zip(CLASS_NAMES, scores)
            },
            "images": {
                "original": image_to_base64(display_original),
                "heatmap": image_to_base64(heatmap_image),
                "overlay": image_to_base64(overlay),
            },
            "image_size": {
                "width": display_original.width,
                "height": display_original.height,
            },
            "notice": (
                "Research prototype only. Model scores are "
                "not calibrated probabilities of disease. "
                "Grad-CAM is an exploratory visualization, "
                "not a medical diagnosis."
            ),
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Prediction or Grad-CAM error:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=(
                "Prediction or Grad-CAM generation failed. "
                "Check the backend terminal for details."
            ),
        ) from error

    finally:
        await file.close()
