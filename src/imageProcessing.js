// imageProcessing.js
// Complete image processing utility for pill counter with Roboflow API integration

const ROBOFLOW_API_KEY = 'us5nPRXtK3HK3V4fF1DC';
const ROBOFLOW_MODEL_ENDPOINT = 'https://serverless.roboflow.com/pill-detection-eye/1';
const CONFIDENCE_THRESHOLD = 0.50; // 50% confidence threshold (matches CTMS app)

/**
 * Validates and compresses large images for processing
 * Fixes Issue #2: Images from distance failing to load
 */
export const validateAndCompressImage = async (file) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_DIMENSION = 4096; // Maximum width/height

    // Check file size first
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('Image file is too large. Please try a closer photo or reduce image quality in camera settings.');
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set timeout to prevent hanging
        const timeoutId = setTimeout(() => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Image loading timed out. Please try a smaller image.'));
        }, 30000); // 30 second timeout

        img.onload = () => {
            clearTimeout(timeoutId);

            let { width, height } = img;
            const originalSize = { width, height };

            // Calculate if resizing is needed
            const needsResize = width > MAX_DIMENSION || height > MAX_DIMENSION;

            if (needsResize) {
                const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
                width = Math.floor(width * scale);
                height = Math.floor(height * scale);

                console.log(`Resizing image from ${originalSize.width}x${originalSize.height} to ${width}x${height}`);
            }

            canvas.width = width;
            canvas.height = height;

            // Use high-quality image rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw image
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob with good quality
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to compress image'));
                        return;
                    }

                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });

                    console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

                    resolve(compressedFile);
                },
                'image/jpeg',
                0.92 // Quality setting
            );

            // Clean up
            URL.revokeObjectURL(img.src);
        };

        img.onerror = () => {
            clearTimeout(timeoutId);
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image. Please try again.'));
        };

        img.src = URL.createObjectURL(file);
    });
};

/**
 * Converts a file to base64 string
 */
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result;
            // Remove data URL prefix if present
            const base64Data = base64.split(',')[1] || base64;
            resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
};

/**
 * Calls Roboflow API for pill detection
 */
const callRoboflowAPI = async (base64Data, onProgress) => {
    if (onProgress) onProgress(0.3);

    try {
        const response = await fetch(`${ROBOFLOW_MODEL_ENDPOINT}?api_key=${ROBOFLOW_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: base64Data
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        if (onProgress) onProgress(0.7);

        const data = await response.json();

        // 🔍 DEBUG: Log full API response in CTMS style
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔬 PILL COUNTER API RESPONSE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Full Response:', data);

        if (data?.image) {
            console.log(`📷 Image Size: ${data.image.width}x${data.image.height}`);
        }

        if (data?.predictions) {
            console.log('📈 Total Detections:', data.predictions.length);
            console.log('🎯 Predictions Detail:');
            data.predictions.forEach((pred, idx) => {
                const status = pred.confidence >= 0.50 ? '✅' : '❌';
                console.log(`  ${status} [${idx + 1}] Conf: ${(pred.confidence * 100).toFixed(1)}% | ` +
                    `Size: ${pred.width.toFixed(0)}x${pred.height.toFixed(0)} | ` +
                    `Ratio: ${(pred.width / pred.height).toFixed(2)} | ` +
                    `Pos: (${pred.x.toFixed(0)}, ${pred.y.toFixed(0)})`);
            });
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (onProgress) onProgress(1.0);

        return data;
    } catch (error) {
        console.error('Roboflow API error:', error);
        throw new Error('Failed to analyze image. Please try again.');
    }
};

/**
 * Processes image and returns results with original image preserved
 * Fixes Issue #1: Results image cropping
 */
export const processAndDisplayImage = async (imageFile, onProgress) => {
    try {
        // Report progress
        if (onProgress) onProgress(10, 'Loading image...');

        // Create object URL for original image display
        const originalImageUrl = URL.createObjectURL(imageFile);

        // Load image to get dimensions
        const img = new Image();
        img.src = originalImageUrl;

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Failed to load image'));

            // Timeout after 15 seconds
            setTimeout(() => reject(new Error('Image loading timeout')), 15000);
        });

        if (onProgress) onProgress(30, 'Preparing for analysis...');

        // Store original dimensions
        const originalWidth = img.naturalWidth;
        const originalHeight = img.naturalHeight;

        console.log(`Original image dimensions: ${originalWidth}x${originalHeight}`);

        // Convert ORIGINAL file to base64 (no compression - matches CTMS app)
        const base64Data = await fileToBase64(imageFile);
        console.log(`Sending raw base64 to API (no compression)`);

        if (onProgress) onProgress(50, 'Detecting pills...');

        // Call Roboflow API
        const apiResult = await callRoboflowAPI(base64Data, (progress) => {
            if (onProgress) onProgress(50 + progress * 40, 'Detecting pills...');
        });

        if (onProgress) onProgress(90, 'Finalizing results...');

        // Process predictions from Roboflow
        let detections = [];

        if (apiResult?.predictions && Array.isArray(apiResult.predictions)) {
            // Log ALL predictions with their confidence
            console.log('=== ALL PREDICTIONS DEBUG ===');
            apiResult.predictions.forEach((p, i) => {
                const status = p.confidence >= CONFIDENCE_THRESHOLD ? '✅ ACCEPTED' : '❌ REJECTED';
                console.log(`${i + 1}. ${status} | Confidence: ${(p.confidence * 100).toFixed(1)}% | Position: (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`);
            });
            console.log(`Threshold: ${CONFIDENCE_THRESHOLD * 100}%`);
            console.log('=============================');

            // Filter by confidence threshold and format detections
            detections = apiResult.predictions
                .filter(p => p.confidence >= CONFIDENCE_THRESHOLD)
                .map(p => ({
                    // Roboflow returns center x,y and width,height
                    // Convert to top-left corner for drawing
                    x: p.x - (p.width / 2),
                    y: p.y - (p.height / 2),
                    width: p.width,
                    height: p.height,
                    confidence: p.confidence,
                    class: p.class
                }));

            const rejected = apiResult.predictions.filter(p => p.confidence < CONFIDENCE_THRESHOLD);
            console.log(`📊 Summary: ${detections.length} accepted, ${rejected.length} rejected (below ${CONFIDENCE_THRESHOLD * 100}%)`);
        }

        if (onProgress) onProgress(100, 'Complete!');

        // Return complete result object
        return {
            originalImageUrl,
            originalWidth,
            originalHeight,
            detections,
            pillCount: detections.length,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Image processing error:', error);
        throw error;
    }
};

/**
 * Utility function to draw detections on a canvas
 */
export const drawDetectionsOnCanvas = (canvas, imageSrc, detections) => {
    return new Promise((resolve, reject) => {
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Set canvas to match image dimensions
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Draw detection markers
            detections.forEach((detection, index) => {
                // Draw semi-transparent fill
                ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                ctx.fillRect(detection.x, detection.y, detection.width, detection.height);

                // Draw bounding box
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 3;
                ctx.strokeRect(detection.x, detection.y, detection.width, detection.height);

                // Draw pill number
                ctx.fillStyle = '#FF0000';
                ctx.font = 'bold 24px Arial';
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 4;

                const text = (index + 1).toString();
                const textX = detection.x + 8;
                const textY = detection.y + 28;

                // Text outline for visibility
                ctx.strokeText(text, textX, textY);
                ctx.fillText(text, textX, textY);

                // Draw confidence if available
                if (detection.confidence) {
                    const confText = `${(detection.confidence * 100).toFixed(0)}%`;
                    ctx.font = '14px Arial';
                    const confY = detection.y + detection.height - 8;
                    ctx.strokeText(confText, textX, confY);
                    ctx.fillText(confText, textX, confY);
                }
            });

            resolve();
        };

        img.onerror = () => reject(new Error('Failed to load image for drawing'));
        img.src = imageSrc;
    });
};

/**
 * Creates a downloadable image with detections
 */
export const createDownloadableResult = async (originalImageUrl, detections, originalWidth, originalHeight) => {
    const canvas = document.createElement('canvas');
    await drawDetectionsOnCanvas(canvas, originalImageUrl, detections);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            resolve(url);
        }, 'image/jpeg', 0.95);
    });
};

/**
 * Error handler with user-friendly messages
 */
export const getErrorMessage = (error) => {
    const errorMessages = {
        'too large': 'Image file is too large. Try taking a photo from a closer distance or reduce camera quality settings.',
        'timeout': 'Processing took too long. Please try again with a clearer photo.',
        'failed to load': 'Could not load the image. Please try again.',
        'out of memory': 'Not enough memory to process this image. Try taking a photo from closer.',
        'api request failed': 'Could not connect to the detection service. Please check your internet connection.',
        'failed to analyze': 'Failed to analyze the image. Please try again.',
    };

    const errorText = error.message.toLowerCase();

    for (const [key, message] of Object.entries(errorMessages)) {
        if (errorText.includes(key)) {
            return message;
        }
    }

    return 'An error occurred while processing the image. Please try again.';
};
