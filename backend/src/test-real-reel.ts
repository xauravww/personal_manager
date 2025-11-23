import instagramService from './services/instagramService';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testRealReel() {
    const reelUrl = 'https://www.instagram.com/reel/17896492851201845/';
    console.log(`🔍 Fetching data for reel: ${reelUrl}`);

    try {
        // 1. Fetch CDN URL
        const data = await instagramService.fetchInstagramReelData(reelUrl);
        console.log('✅ Fetched reel data:', {
            title: data.title,
            videoUrl: data.videoUrl ? data.videoUrl.substring(0, 50) + '...' : 'null'
        });

        if (!data.videoUrl) {
            console.error('❌ No video URL found');
            return;
        }

        // 2. Download Video
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const videoPath = path.join(tempDir, 'test_reel.mp4');
        console.log(`⬇️  Downloading video to ${videoPath}...`);

        const response = await axios({
            url: data.videoUrl,
            method: 'GET',
            responseType: 'stream'
        } as any);

        const writer = fs.createWriteStream(videoPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(null));
            writer.on('error', reject);
        });

        console.log('✅ Video downloaded');

        // 3. Transcribe with Faster-Whisper
        console.log('🎙️  Transcribing with Faster-Whisper (small model)...');
        const scriptPath = path.join(__dirname, 'scripts/transcribe.py');

        const start = Date.now();
        const { stdout, stderr } = await execAsync(`python3 "${scriptPath}" "${videoPath}" small`);
        const duration = (Date.now() - start) / 1000;

        console.log('--- STDERR (Progress/Info) ---');
        console.log(stderr);

        console.log('--- STDOUT (Transcript) ---');
        console.log(stdout);

        console.log(`⏱️  Transcription took ${duration.toFixed(2)} seconds`);

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
        }
    }
}

testRealReel();
