# Instagram Video Transcription Setup

## Quick Start

### 1. Install Dependencies

```bash
# Install ffmpeg (for audio extraction)
sudo apt-get update && sudo apt-get install -y ffmpeg

# Or on Mac:
brew install ffmpeg
```

### 2. Setup Whisper.cpp

```bash
cd backend
chmod +x setup-whisper.sh
./setup-whisper.sh
```

This will:
- Clone whisper.cpp
- Build the binary
- Download the tiny model (39MB)

### 3. Test Transcription

```bash
# The setup creates:
backend/whisper/whisper.cpp/main          # Whisper binary
backend/whisper/whisper.cpp/models/ggml-tiny.bin  # Tiny model
```

### 4. How It Works

When Instagram webhooks receive a reel:
1. Video downloaded from Meta's CDN URL
2. Audio extracted with ffmpeg → 16kHz WAV
3. Whisper.cpp transcribes → text
4. Transcript saved to resource metadata
5. Included in semantic search embeddings

## Features

✅ **Free forever** - No API costs
✅ **Tiny model** - Only 39MB
✅ **Multilingual** - Perfect for Hinglish
✅ **Fast** - ~5-10 seconds for short reels
✅ **Searchable** - Transcripts included in search
✅ **Offline** - Runs completely locally

## Troubleshooting

**"Whisper.cpp not installed"**
```bash
cd backend && ./setup-whisper.sh
```

**"ffmpeg not found"**
```bash
sudo apt-get install ffmpeg
```

**Slow transcription?**
- Tiny model is optimized for speed
- For better accuracy, use `base` or `small` model:
```bash
cd backend/whisper/whisper.cpp
bash ./models/download-ggml-model.sh base
# Edit transcriptionService.ts: change `ggml-tiny.bin` to `ggml-base.bin`
```

## Model Sizes

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| tiny  | 39MB  | ⚡⚡⚡ | ⭐⭐ |
| base  | 74MB  | ⚡⚡ | ⭐⭐⭐ |
| small | 244MB | ⚡ | ⭐⭐⭐⭐ |

Recommendation: Start with **tiny** for quick tests, upgrade to **base** if needed.

## Testing

Share an Instagram reel and check backend logs:
```
🎙️ Starting transcription...
📥 Downloading video from: https://...
🎵 Extracting audio...
🎙️ Transcribing audio with Whisper...
✅ Transcript: Hello this is a test...
✅ Instagram content saved to resources: clxxxxxx
```

Then search for keywords from the audio - they should match!
