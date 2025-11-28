import fs from 'fs/promises';
import path from 'path';

const TEMP_DIR = path.join(__dirname, '../../temp');
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Clean up old temporary files
 * Removes files older than MAX_AGE_MS
 */
export async function cleanupOldTempFiles() {
    try {
        // Ensure temp directory exists
        await fs.mkdir(TEMP_DIR, { recursive: true });

        const files = await fs.readdir(TEMP_DIR);
        const now = Date.now();
        let deletedCount = 0;

        for (const file of files) {
            try {
                const filePath = path.join(TEMP_DIR, file);
                const stats = await fs.stat(filePath);

                // Delete if older than max age
                if (now - stats.mtimeMs > MAX_AGE_MS) {
                    await fs.unlink(filePath);
                    deletedCount++;
                    console.log(`🗑️  Cleaned up old temp file: ${file}`);
                }
            } catch (error) {
                // Ignore errors for individual files
                console.warn(`⚠️  Could not clean up ${file}:`, error);
            }
        }

        if (deletedCount > 0) {
            console.log(`✅ Cleaned up ${deletedCount} old temp files`);
        }
    } catch (error) {
        console.error('❌ Error during temp cleanup:', error);
    }
}

/**
 * Clean up all temporary files
 * Use with caution - removes ALL files in temp directory
 */
export async function cleanupAllTempFiles() {
    try {
        const files = await fs.readdir(TEMP_DIR);

        for (const file of files) {
            try {
                await fs.unlink(path.join(TEMP_DIR, file));
                console.log(`🗑️  Deleted temp file: ${file}`);
            } catch (error) {
                console.warn(`⚠️  Could not delete ${file}:`, error);
            }
        }

        console.log(`✅ Cleaned up all temp files`);
    } catch (error) {
        console.error('❌ Error during temp cleanup:', error);
    }
}
