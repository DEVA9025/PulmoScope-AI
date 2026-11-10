
import os
import json
import argparse
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt

from PIL import Image
from tensorflow import keras


# Project paths
PROJECT_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

MODEL_PATH = os.path.join(
    PROJECT_DIR, "model", "efficientnetb0_multiclass_best.keras"
)

CLASS_NAMES_PATH = os.path.join(
    PROJECT_DIR, "model", "multiclass_class_names.json"
)

OUTPUT_DIR = os.path.join(PROJECT_DIR, "model", "gradcam_results")

IMAGE_SIZE = (224, 224)


def load_image(image_path):
    """Load and resize an X-ray image."""
    image = Image.open(image_path).convert("RGB")
    image = image.resize(IMAGE_SIZE)

    # Match the image loading pipeline used by the existing model.
    image_array = np.asarray(image, dtype=np.float32)

    return image_array, np.expand_dims(image_array, axis=0)


def find_last_conv_layer(model):
    """Find the last convolutional layer in the model."""
    for layer in reversed(model.layers):
        if isinstance(layer, keras.Model):
            for nested_layer in reversed(layer.layers):
                if isinstance(nested_layer, keras.layers.Conv2D):
                    return layer.name, nested_layer.name

        if isinstance(layer, keras.layers.Conv2D):
            return None, layer.name

    raise ValueError(
        "No Conv2D layer found. Inspect the model architecture."
    )


def build_grad_model(loaded_model):
    """Build a specialized Grad-CAM model that outputs last conv feature maps
    and un-activated (pre-softmax) logits to prevent gradient saturation.
    """
    backbone_name, conv_name = find_last_conv_layer(loaded_model)

    inp = keras.Input(shape=IMAGE_SIZE + (3,), name="gradcam_input")

    if backbone_name is not None:
        backbone = loaded_model.get_layer(backbone_name)
        conv_layer = backbone.get_layer(conv_name)

        backbone_with_conv = keras.Model(
            inputs=backbone.inputs,
            outputs=[conv_layer.output, backbone.output],
            name="backbone_with_conv",
        )

        x = inp
        for layer in loaded_model.layers:
            if layer.name == backbone_name:
                break
            if not isinstance(layer, keras.layers.InputLayer):
                x = layer(x, training=False)

        conv_out, bb_out = backbone_with_conv(x, training=False)

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


_CLI_GRAD_MODEL = None


def create_gradcam(model, image_batch, class_index):
    """Generate a Grad-CAM heatmap for one class."""
    global _CLI_GRAD_MODEL
    if _CLI_GRAD_MODEL is None:
        _CLI_GRAD_MODEL = build_grad_model(model)

    image_tensor = tf.convert_to_tensor(image_batch)

    with tf.GradientTape() as tape:
        conv_outputs, predictions = _CLI_GRAD_MODEL(
            image_tensor, training=False
        )
        class_score = predictions[:, class_index]

    gradients = tape.gradient(class_score, conv_outputs)

    if gradients is None:
        raise ValueError(
            "Gradients are unavailable. Check the model architecture."
        )

    # Average gradients across spatial dimensions.
    weights = tf.reduce_mean(gradients, axis=(1, 2))

    # Weighted combination of feature maps.
    heatmap = tf.reduce_sum(
        conv_outputs * weights[:, tf.newaxis, tf.newaxis, :],
        axis=-1
    )

    heatmap = tf.nn.relu(heatmap)[0]
    maximum = float(tf.reduce_max(heatmap).numpy())

    if np.isfinite(maximum) and maximum > 1e-12:
        heatmap = (heatmap / maximum).numpy()
    else:
        heatmap = np.zeros(heatmap.shape, dtype=np.float32)

    return np.clip(heatmap, 0.0, 1.0)


def main():
    parser = argparse.ArgumentParser(
        description="Four-class X-ray prediction with Grad-CAM"
    )
    parser.add_argument(
        "image",
        help="Path to the chest X-ray image"
    )
    args = parser.parse_args()

    if not os.path.isfile(args.image):
        raise FileNotFoundError(
            f"Image not found: {args.image}"
        )

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as file:
        class_names = json.load(file)

    model = keras.models.load_model(MODEL_PATH)

    original_image, image_batch = load_image(args.image)

    # Predict all four class scores.
    predictions = model.predict(image_batch, verbose=0)[0]
    predicted_index = int(np.argmax(predictions))

    print("\n========== PREDICTION ==========")
    print("Predicted class:", class_names[predicted_index])
    print("\nScores for all four classes:")

    for name, score in zip(class_names, predictions):
        print(f"{name:15s}: {score * 100:.2f}%")

    print(
        "\nNote: These are model scores, not calibrated "
        "probabilities of disease."
    )

    # Generate a heatmap for the predicted class.
    heatmap = create_gradcam(
        model, image_batch, predicted_index
    )

    # Resize heatmap to match the original display dimensions.
    heatmap_image = Image.fromarray(
        np.uint8(heatmap * 255)
    ).resize(IMAGE_SIZE, Image.Resampling.BILINEAR)

    heatmap_array = np.asarray(heatmap_image) / 255.0

    # Save side-by-side visualization.
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    axes[0].imshow(original_image.astype(np.uint8))
    axes[0].set_title("Input X-ray")
    axes[0].axis("off")

    axes[1].imshow(heatmap_array, cmap="jet")
    axes[1].set_title("Grad-CAM Heatmap")
    axes[1].axis("off")

    axes[2].imshow(original_image.astype(np.uint8))
    axes[2].imshow(
        heatmap_array, cmap="jet", alpha=0.4,
        vmin=0, vmax=1
    )
    axes[2].set_title("Heatmap Overlay")
    axes[2].axis("off")

    fig.suptitle(
        f"Predicted: {class_names[predicted_index]} "
        f"({predictions[predicted_index] * 100:.2f}% model score)"
    )

    fig.tight_layout()

    filename = os.path.splitext(
        os.path.basename(args.image)
    )[0] + "_gradcam.png"

    output_path = os.path.join(OUTPUT_DIR, filename)

    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)

    print("\nGrad-CAM visualization saved to:")
    print(output_path)


if __name__ == "__main__":
    main()
