import whisper
import warnings
import json
warnings.filterwarnings("ignore")

video_path = r"C:\Users\Taydinh\Downloads\snaptik.vn_7656270353571892501.mp4"
print("Loading model...")
model = whisper.load_model("base")
print("Transcribing...")
result = model.transcribe(video_path)
print("Done. Writing to file.")

# Write full text
with open("transcription.txt", "w", encoding="utf-8") as f:
    f.write(result["text"])

# Write segments with timestamps
with open("transcription_segments.json", "w", encoding="utf-8") as f:
    json.dump(result["segments"], f, indent=2, ensure_ascii=False)

print("Transcription finished successfully!")
