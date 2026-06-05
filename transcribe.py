import whisper
import warnings
warnings.filterwarnings("ignore")

video_path = r"C:\Users\Taydinh\Downloads\7903610170163.mp4"
print("Loading model...")
model = whisper.load_model("base")
print("Transcribing...")
result = model.transcribe(video_path, language="vi")
print("Done. Writing to file.")
with open("transcription.txt", "w", encoding="utf-8") as f:
    f.write(result["text"])
