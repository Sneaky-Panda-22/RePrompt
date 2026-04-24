import os
import json
import base64
import requests

IMAGE_FOLDER = "data/images"
OUTPUT_FILE = "dataset.json"

QUESTION = "Analyze this product photograph as a professional photographer. Describe the lighting setup, camera settings, and brand aesthetic."

dataset = []

for file in os.listdir(IMAGE_FOLDER):

    if not file.lower().endswith((".jpg",".jpeg",".png")):
        continue

    path = os.path.join(IMAGE_FOLDER, file)

    with open(path,"rb") as f:
        img = base64.b64encode(f.read()).decode()

    payload = {
        "model":"llava",
        "prompt": QUESTION,
        "images":[img],
        "stream": False
    }

    response = requests.post(
        "http://localhost:11434/api/generate",
        json=payload
    )

    answer = response.json()["response"]

    dataset.append({
        "image": path,
        "question": QUESTION,
        "answer": answer
    })

    print("Processed:", file)

with open(OUTPUT_FILE,"w") as f:
    json.dump(dataset,f,indent=2)

print("Dataset created!")