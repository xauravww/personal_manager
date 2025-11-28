#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WHISPER_DIR = path.join(__dirname, '..', 'whisper');
const WHISPER_CPP_DIR = path.join(WHISPER_DIR, 'whisper.cpp');
const MODEL_DIR = path.join(WHISPER_DIR, 'models');
const BUILD_DIR = path.join(WHISPER_CPP_DIR, 'build');
const BINARY_PATH = path.join(BUILD_DIR, 'bin', 'whisper-cli');

console.log('🎙️  Whisper.cpp Setup Script');
console.log('=====================================\n');

function exec(command, options = {}) {
    console.log(`> ${command}`);
    try {
        execSync(command, { stdio: 'inherit', ...options });
    } catch (error) {
        console.error(`❌ Command failed: ${command}`);
        throw error;
    }
}

function checkCommand(command) {
    try {
        execSync(`which ${command}`, { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function main() {
    // Step 1: Check prerequisites
    console.log('📋 Step 1: Checking prerequisites...');

    const requiredCommands = ['git', 'cmake', 'make'];
    const missing = requiredCommands.filter(cmd => !checkCommand(cmd));

    if (missing.length > 0) {
        console.error(`❌ Missing required commands: ${missing.join(', ')}`);
        console.error('Please install them first:');
        console.error('  Ubuntu/Debian: sudo apt-get install git cmake build-essential');
        console.error('  macOS: brew install git cmake');
        process.exit(1);
    }

    console.log('✅ All prerequisites found\n');

    // Step 2: Create whisper directory
    console.log('📁 Step 2: Creating whisper directory...');
    if (!fs.existsSync(WHISPER_DIR)) {
        fs.mkdirSync(WHISPER_DIR, { recursive: true });
        console.log(`✅ Created ${WHISPER_DIR}\n`);
    } else {
        console.log(`✅ Directory already exists\n`);
    }

    // Step 3: Clone whisper.cpp repository
    console.log('📥 Step 3: Cloning whisper.cpp repository...');
    if (!fs.existsSync(WHISPER_CPP_DIR)) {
        exec(`git clone https://github.com/ggerganov/whisper.cpp.git ${WHISPER_CPP_DIR}`);
        console.log('✅ Repository cloned\n');
    } else {
        console.log('✅ Repository already exists, pulling latest changes...');
        exec('git pull', { cwd: WHISPER_CPP_DIR });
        console.log('✅ Repository updated\n');
    }

    // Step 4: Build whisper.cpp
    console.log('🔨 Step 4: Building whisper.cpp...');
    if (!fs.existsSync(BUILD_DIR)) {
        fs.mkdirSync(BUILD_DIR, { recursive: true });
    }

    exec('cmake ..', { cwd: BUILD_DIR });
    exec('make -j$(nproc || echo 4)', { cwd: BUILD_DIR });

    if (fs.existsSync(BINARY_PATH)) {
        console.log('✅ Build successful\n');
    } else {
        console.error('❌ Build failed - binary not found');
        process.exit(1);
    }

    // Step 5: Download model
    console.log('📥 Step 5: Downloading Whisper base model...');
    if (!fs.existsSync(MODEL_DIR)) {
        fs.mkdirSync(MODEL_DIR, { recursive: true });
    }

    const modelPath = path.join(MODEL_DIR, 'ggml-base.bin');
    if (!fs.existsSync(modelPath)) {
        const downloadScript = path.join(WHISPER_CPP_DIR, 'models', 'download-ggml-model.sh');
        exec(`bash ${downloadScript} base`, { cwd: MODEL_DIR });
        console.log('✅ Model downloaded\n');
    } else {
        console.log('✅ Model already exists\n');
    }

    // Step 6: Verify installation
    console.log('✅ Step 6: Verifying installation...');
    if (fs.existsSync(BINARY_PATH) && fs.existsSync(modelPath)) {
        console.log('\n🎉 Whisper.cpp setup complete!');
        console.log(`   Binary: ${BINARY_PATH}`);
        console.log(`   Model: ${modelPath}`);
    } else {
        console.error('❌ Installation verification failed');
        process.exit(1);
    }
}

// Run setup
try {
    main();
} catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
}
