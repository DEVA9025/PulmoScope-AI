# PulmoScope React + FastAPI integration

## What changed
- `src/routes/upload.tsx`: the upload page now sends the selected PNG/JPG/WEBP file to `POST http://localhost:8000/predict`.
- `src/routes/prediction.tsx`: displays the actual API prediction, all returned class scores, and original/Grad-CAM/overlay images from Base64.
- Existing visual style and route structure are retained.

## Run it
1. Start your FastAPI backend from the Python project root:
   `python -m uvicorn src.api:app --reload --host 127.0.0.1 --port 8000`
2. In this frontend folder, install dependencies if needed:
   `npm install`
3. Start the frontend:
   `npm run dev`
4. Open the shown frontend URL, go to Upload, select an X-ray, and click **Analyze X-ray**.
5. The browser opens the Prediction page with the API result and Grad-CAM images.

## Notes
- Backend CORS must allow the frontend's exact origin. The API configuration discussed earlier allows localhost/127.0.0.1 on ports 5173 and 3000. If Vite displays a different port, add that origin to `allow_origins` in `src/api.py`.
- This is a research prototype. Model output scores are not calibrated disease probabilities and are not a medical diagnosis.
- `node_modules` is excluded from this zip to keep it small; `npm install` recreates it.
