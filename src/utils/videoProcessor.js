const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Compresses a video file for web streaming and returns metadata.
 * @param {string} inputPath - Absolute path to the original video file.
 * @param {string} outputName - Desired name for the compressed file
 * @returns {Promise<{url: string, size: number, duration: number}>} - Meta info
 */
const compressVideo = (inputPath, outputName) => {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(__dirname, '..', '..', 'uploads', 'videos');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, outputName);

    console.log(`[Video Compression] Processing: ${inputPath} -> ${outputPath}`);

    // Read duration with ffprobe
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      let durationInSeconds = 0;
      if (!err && metadata && metadata.format) {
        durationInSeconds = Math.round(metadata.format.duration || 0);
      }

      ffmpeg(inputPath)
        .outputOptions([
          '-vcodec libx264',     // Standard H.264 video codec
          '-crf 28',             // High compression quality balance
          '-preset veryfast',
          '-tune zerolatency',
          '-threads 1',
          '-acodec aac',         // Standard AAC audio
          '-b:a 128k',
          '-movflags +faststart' // Move MP4 moov atom to front for instant web streaming
        ])
        .toFormat('mp4')
        .on('start', () => {
          console.log('[Video Compression] FFmpeg process started...');
        })
        .on('progress', (progress) => {
          if (progress.timemark) {
            console.log(`[Video Compression] Progress: ${progress.timemark}`);
          }
        })
        .on('end', () => {
          console.log('[Video Compression] Completed successfully!');
          // Delete original raw large upload
          try {
            if (fs.existsSync(inputPath) && inputPath !== outputPath) {
              fs.unlinkSync(inputPath);
            }
          } catch (e) {
            console.error('[Video Compression] Failed to cleanup raw upload:', e.message);
          }

          let fileSize = 0;
          try {
            const stats = fs.statSync(outputPath);
            fileSize = stats.size;
          } catch (e) {
            console.error('[Video Compression] Could not get file stats:', e.message);
          }

          resolve({
            url: `/uploads/videos/${outputName}`,
            size: fileSize,
            durationInSeconds: durationInSeconds
          });
        })
        .on('error', (err) => {
          console.error('[Video Compression] Error (Falling back to original):', err.message);
          // If compression fails, fallback gracefully to raw file
          resolve({
            url: `/uploads/videos/${path.basename(inputPath)}`,
            size: 0,
            durationInSeconds: durationInSeconds || 600
          });
        })
        .save(outputPath);
    });
  });
};

module.exports = { compressVideo };
