import urllib.request
import json
import subprocess
import os

video_path = r"C:\Users\Taydinh\Downloads\snapsave.vn_tiktok_6a18f3586bd2a.mp4"
audio_path = "temp_audio.wav"

# Extract audio
subprocess.run(["ffmpeg", "-y", "-i", video_path, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", audio_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    import speech_recognition as sr
    r = sr.Recognizer()
    with sr.AudioFile(audio_path) as source:
        audio = r.record(source)
    text = r.recognize_google(audio, language="vi-VN")
    with open("transcription.txt", "w", encoding="utf-8") as f:
        f.write(text)
except Exception as e:
    with open("transcription.txt", "w", encoding="utf-8") as f:
        f.write(f"Error: {e}")

os.remove(audio_path)
