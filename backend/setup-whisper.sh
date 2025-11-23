#!/bin/bash

# Whisper.cpp Setup Script
# This script downloads and builds whisper.cpp with the tiny model

set -e

echo "🎙️  Setting up Whisper.cpp for local transcription..."

# Create whisper directory in backend
WHISPER_DIR="./whisper"
mkdir -p "$WHISPER_DIR"
cd "$WHISPER_DIR"

# Check if whisper.cpp already exists
if [ -d "whisper.cpp" ]; then
    echo "✅ Whisper.cpp directory already exists"
    cd whisper.cpp
    git pull
else
    echo "📥 Cloning whisper.cpp..."
    git clone https://github.com/ggerganov/whisper.cpp.git
    cd whisper.cpp
fi

# Build whisper.cpp
echo "🔨 Building whisper.cpp..."
make

# Download tiny model (39MB - perfect for quick transcriptions)
echo "📦 Downloading tiny model (39MB)..."
if [ ! -f "models/ggml-tiny.bin" ]; then
    bash ./models/download-ggml-model.sh tiny
else
    echo "✅ Tiny model already downloaded"
fi

echo ""
echo "✅ Whisper.cpp setup complete!"
echo ""
echo "Model location: $(pwd)/models/ggml-tiny.bin"
echo "Binary location: $(pwd)/main"
echo ""
echo "To test: ./main -m models/ggml-tiny.bin -f /path/to/audio.wav"
