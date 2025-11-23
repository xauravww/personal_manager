import sys
import os
import json
from faster_whisper import WhisperModel

def transcribe(file_path, model_size="small"):
    # Run on GPU with FP16 if available, else CPU with INT8
    # device = "cuda" if torch.cuda.is_available() else "cpu"
    # compute_type = "float16" if device == "cuda" else "int8"
    
    # For this environment, let's assume CPU for safety, but faster-whisper is fast on CPU too
    device = "cpu"
    compute_type = "int8"

    print(f"Loading model '{model_size}' on {device} with {compute_type} precision...", file=sys.stderr)
    
    try:
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Transcribing {file_path}...", file=sys.stderr)
    
    try:
        # beam_size=1 (Greedy Search) is much faster than default 5
        # This trades some accuracy for significant speed gains
        segments, info = model.transcribe(file_path, beam_size=1)
        
        print(f"Detected language '{info.language}' with probability {info.language_probability}", file=sys.stderr)

        transcript = ""
        for segment in segments:
            transcript += segment.text + " "
            
        result = {
            "text": transcript.strip(),
            "language": info.language
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(f"Error during transcription: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 transcribe.py <audio_file_path> [model_size]", file=sys.stderr)
        sys.exit(1)
        
    file_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "small"
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}", file=sys.stderr)
        sys.exit(1)
        
    transcribe(file_path, model_size)
