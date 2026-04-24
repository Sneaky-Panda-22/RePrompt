# test_physics.py
from modules.preprocessors import preprocess
from modules.physics_analyzer import analyze_physics

meta    = preprocess(r"D:\Study\RePrompt\modules\spy-x-family-anya-forger-desktop-wallpaper.jpg")
physics = analyze_physics(meta)
print(physics.to_json())