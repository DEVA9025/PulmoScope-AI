# Lungsight AI

AI-Powered Multi-Lung Disease Detection System Using Chest X-ray Images with Explainable AI

1. Project Overview

The proposed system is an AI-based clinical decision support system that analyzes chest X-ray images to detect multiple lung diseases using deep learning. It predicts the disease, displays the confidence score, generates a Grad-CAM heatmap to explain the prediction, stores patient records, and produces a PDF report for doctors.

2. Technology Stack

LayerTechnologyPurposeFrontendReact.jsUser InterfaceBackendFastAPIREST API and Business LogicAI ModelEfficientNetB0 / ResNet50Disease ClassificationExplainable AIGrad-CAMPrediction VisualizationDatabaseMySQLStore Doctors, Patients, DiagnosisAuthenticationJWT + bcryptSecure LoginReportReportLabGenerate PDF ReportsDeploymentDockerContainerizationProgramming LanguagePythonAI and Backend Development

3. Overall Architecture

                     Doctor

                        │
                        ▼

                React Frontend

                        │
                JWT Authentication

                        │

────────────────────────────────────────

                FastAPI Backend

        ┌────────────┬────────────┐
        │            │            │
        ▼            ▼            ▼

 Image Preprocessing  AI Model  MySQL Database

        │            │            │

        ▼            ▼            │

   Resize Image  EfficientNet     │

        │            │            │

        ▼            ▼            │

   Normalization  Prediction       │

        │            │            │

        ▼            ▼            │

      Grad-CAM   Confidence Score │

        │            │            │

        └────────────┴────────────┘

                PDF Generation

                        │

                        ▼

               Doctor Dashboard

4. Complete Project Flow

Step 1

Doctor opens the application.

Browser

↓

React Login Page

Step 2

Doctor enters login credentials.

Email

Password

↓

FastAPI verifies credentials.

↓

JWT Token Generated.

↓

Dashboard opens.

Step 3

Doctor selects patient.

Patient Name

Age

Gender

Phone

Symptoms

↓

Save Patient.

Step 4

Doctor uploads Chest X-ray.

Upload Image

↓

PNG/JPG/DICOM

↓

Image sent to FastAPI.

Step 5

Image Preprocessing

Original Image

↓

Resize (224×224)

↓

Normalize Pixels

↓

Convert Tensor

↓

Ready for Model

6. Deep Learning Model

The preprocessed image enters EfficientNet.

Image

↓

EfficientNetB0

↓

Feature Extraction

↓

Classification Layer

↓

Softmax

↓

Disease Prediction

Possible outputs:

 Normal

 Pneumonia

 COVID

 Tuberculosis

 Pulmonary Fibrosis

 Lung Cancer

7. Confidence Score

Softmax produces probabilities.

Example

DiseaseProbabilityNormal0.01Pneumonia0.96COVID0.01TB0.01Fibrosis0.00Lung Cancer0.01

Prediction

Pneumonia

96%

8. Explainable AI

Prediction enters Grad-CAM.

Prediction

↓

Gradients

↓

Feature Maps

↓

Heatmap

↓

Overlay on Chest X-ray

Doctor sees affected lung region.

9. Save into Database

FastAPI stores:

Doctor

Patient

Disease

Confidence

Date

Image Path

GradCAM Path

Report Path

Stored in MySQL.

10. Generate PDF Report

ReportLab creates

Hospital Name

↓

Patient Details

↓

Original X-ray

↓

Prediction

↓

Confidence

↓

Grad-CAM

↓

Timestamp

↓

Doctor Signature

↓

Disclaimer

11. Dashboard

Doctor can

View Reports

↓

Patient History

↓

Search Patient

↓

Download PDF

↓

Delete Records

12. Database Design

Doctor Table

doctor_id

name

email

password

role

Patient Table

patient_id

name

age

gender

phone

Diagnosis Table

diagnosis_id

patient_id

doctor_id

disease

confidence

date

report_path

13. Authentication Flow

Doctor Login

↓

FastAPI

↓

Verify Password

↓

bcrypt

↓

Generate JWT

↓

React Stores Token

↓

Every Request

↓

Authorization Header

↓

Backend Verifies JWT

↓

Access Granted

14. AI Model Training Flow

Dataset

↓

Data Cleaning

↓

Train-Test Split

↓

Image Preprocessing

↓

Transfer Learning

↓

EfficientNet

↓

Training

↓

Validation

↓

Accuracy

↓

Save Model (.pth/.keras)

15. API Flow

POST /login

↓

JWT Token

↓

POST /predict

↓

Prediction

↓

POST /patient

↓

Save Patient

↓

GET /history

↓

Diagnosis History

↓

GET /report

↓

Download PDF

16. Frontend Pages

Login

↓

Dashboard

↓

Upload X-ray

↓

Prediction

↓

Patient History

↓

Reports

↓

Profile

17. Backend Modules

Authentication

↓

Patient Module

↓

Prediction Module

↓

GradCAM Module

↓

Database Module

↓

PDF Module

18. Folder Structure

LungDiseaseDetection/

│

├── frontend/
│     ├── components/
│     ├── pages/
│     ├── services/
│     ├── App.jsx
│     └── package.json
│
├── backend/
│     ├── api/
│     ├── auth/
│     ├── database/
│     ├── models/
│     ├── schemas/
│     ├── utils/
│     ├── main.py
│     └── requirements.txt
│
├── model/
│     ├── efficientnet_model.keras
│     └── train.py
│
├── gradcam/
│     └── gradcam.py
│
├── reports/
│
├── uploads/
│
├── dataset/
│
└── README.md

19. Deployment Flow

React

↓

Build

↓

Docker

↓

FastAPI

↓

AI Model

↓

MySQL

↓

Cloud Server .     
develop the front end layer of this project add the nessasary feature ui with high level animated website ui for this project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d9062928-e424-4f8d-95ff-f2ef875bc7c2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
