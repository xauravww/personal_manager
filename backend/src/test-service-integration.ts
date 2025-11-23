import transcriptionService from './services/transcriptionService';

async function testIntegration() {
    const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
    console.log('🧪 Testing TranscriptionService with Faster-Whisper backend...');
    console.log(`   Video URL: ${videoUrl}`);

    try {
        const start = Date.now();
        const result = await transcriptionService.transcribeVideo(videoUrl);
        const duration = (Date.now() - start) / 1000;

        console.log('\n✅ Test Passed!');
        console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
        console.log(`🗣️  Language: ${result.language}`);
        console.log(`📝 Transcript: ${result.transcript}`);

    } catch (error: any) {
        console.error('\n❌ Test Failed:', error.message);
        process.exit(1);
    }
}

testIntegration();
