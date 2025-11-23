import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

const execAsync = promisify(exec);

const WHISPER_DIR = path.join(__dirname, '../../whisper/whisper.cpp');
const WHISPER_BINARY = path.join(WHISPER_DIR, 'build/bin/whisper-cli');
const WHISPER_MODEL = path.join(WHISPER_DIR, 'models/ggml-tiny.bin');
const TEMP_DIR = path.join(__dirname, '../../temp');

/**
 * Transcription Service using Whisper.cpp
 * Handles video download, audio extraction, and speech-to-text
 */
class TranscriptionService {
    constructor() {
        this.ensureTempDir();
    }

    /**
     * Ensure temp directory exists
     */
    private async ensureTempDir() {
        try {
            await fs.mkdir(TEMP_DIR, { recursive: true });
        } catch (error) {
            console.error('Error creating temp directory:', error);
        }
    }

    /**
     * Check if whisper.cpp is installed
     */
    async isWhisperInstalled(): Promise<boolean> {
        try {
            await fs.access(WHISPER_BINARY);
            await fs.access(WHISPER_MODEL);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Download video from URL
     */
    private async downloadVideo(url: string, outputPath: string): Promise<void> {
        console.log('📥 Downloading video from:', url);

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const writer = require('fs').createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    }

    /**
     * Extract audio from video using ffmpeg
     */
    private async extractAudio(videoPath: string, audioPath: string): Promise<void> {
        console.log('🎵 Extracting audio...');

        const command = `ffmpeg -i "${videoPath}" -vn -ar 16000 -ac 1 -c:a pcm_s16le "${audioPath}" -y`;

        try {
            await execAsync(command);
            console.log('✅ Audio extracted');
        } catch (error) {
            throw new Error(`Failed to extract audio: ${error}`);
        }
    }

    /**
     * Transcribe audio using whisper.cpp (C++)
     * Returns transcript and detected language
     */
    private async transcribeAudio(audioPath: string, language: string = 'hi'): Promise<{ transcript: string; language: string }> {
        console.log(`🎙️  Transcribing audio with Whisper.cpp (Base Model, language: ${language})...`);

        // Use 'base' model for better speed/accuracy balance than tiny/small on CPU
        const modelPath = path.join(WHISPER_DIR, 'models/ggml-base.bin');

        // Output file path (whisper.cpp adds .txt extension automatically)
        const outputBase = audioPath.replace('.wav', '');
        const outputTxt = outputBase + '.txt';

        // Construct command
        // -m: model path
        // -f: input file
        // -otxt: output text file (flag)
        // -of: output file path (without extension)
        // -l: language code (hi for Hindi, en for English, etc.)
        // Note: Using correct language code so Whisper knows what language is being spoken
        const command = `${WHISPER_BINARY} -m "${modelPath}" -f "${audioPath}" -otxt -of "${outputBase}" -l ${language}`;

        try {
            await execAsync(command);

            // Read transcript from .txt file
            const transcript = await fs.readFile(outputTxt, 'utf-8');

            // Clean up the output file
            await fs.unlink(outputTxt);
            console.log(`🗑️  Deleted: ${path.basename(outputTxt)}`);

            console.log('✅ Transcription complete');
            console.log(`   Text: ${transcript.substring(0, 100)}...`);

            // Return actual detected language, fallback to hi if unknown
            const detectedLang = transcript ? language : 'hi';

            return {
                transcript: transcript.trim(),
                language: detectedLang || 'hi' // Fallback to Hindi if unknown
            };
        } catch (error: any) {
            // Clean up on error
            try {
                await fs.unlink(outputTxt);
            } catch { }

            throw new Error(`Transcription failed: ${error}`);
        }
    }

    /**
     * Clean up temporary files - ALWAYS called, even on error
     */
    private async cleanup(...files: string[]): Promise<void> {
        for (const file of files) {
            try {
                await fs.unlink(file);
                console.log(`🗑️  Deleted: ${path.basename(file)}`);
            } catch (error) {
                // File might not exist, ignore
            }
        }
    }

    /**
     * Main transcription method
     * Downloads video, extracts audio, transcribes, and cleans up
     */
    async transcribeVideo(videoUrl: string, language: string = 'hi'): Promise<{ transcript: string; language: string }> {
        const timestamp = Date.now();
        const videoPath = path.join(TEMP_DIR, `video_${timestamp}.mp4`);
        const audioPath = path.join(TEMP_DIR, `audio_${timestamp}.wav`);

        try {
            // Download video
            await this.downloadVideo(videoUrl, videoPath);

            // Extract audio
            await this.extractAudio(videoPath, audioPath);

            // Transcribe with specified language
            const result = await this.transcribeAudio(audioPath, language);

            return result;
        } finally {
            // ALWAYS cleanup - even if error occurred
            await this.cleanup(videoPath, audioPath);
        }
    }
}

// Export singleton instance
export default new TranscriptionService();
