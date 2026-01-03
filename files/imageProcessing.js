// imageProcessing.js
// Complete image processing utility for pill counter with iPhone fixes

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
    
    img.onload = () => {
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
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image. Please try again.'));
    };
    
    // Set timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Image loading timed out. Please try a smaller image.'));
    }, 30000); // 30 second timeout
    
    img.onload = () => {
      clearTimeout(timeoutId);
      img.onload(); // Call original onload
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Processes image and returns results with original image preserved
 * Fixes Issue #1: Results image cropping
 */
export const processAndDisplayImage = async (imageFile, onProgress) => {
  try {
    // Report progress
    if (onProgress) onProgress(10, 'Loading image...');
    
    // Create object URL for original image
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
    
    // Create canvas for processing (downscaled for ML model)
    const processedCanvas = document.createElement('canvas');
    const processCtx = processedCanvas.getContext('2d');
    
    // Downscale for processing efficiency
    const maxProcessingDimension = 1024;
    const scale = Math.min(
      maxProcessingDimension / originalWidth,
      maxProcessingDimension / originalHeight,
      1 // Don't upscale if image is already small
    );
    
    processedCanvas.width = Math.floor(originalWidth * scale);
    processedCanvas.height = Math.floor(originalHeight * scale);
    
    // High quality downscaling
    processCtx.imageSmoothingEnabled = true;
    processCtx.imageSmoothingQuality = 'high';
    processCtx.drawImage(img, 0, 0, processedCanvas.width, processedCanvas.height);
    
    if (onProgress) onProgress(50, 'Detecting pills...');
    
    // Run ML detection on processed canvas
    // Replace this with your actual ML model call
    const detections = await runPillDetection(processedCanvas, (progress) => {
      if (onProgress) onProgress(50 + progress * 0.4, 'Detecting pills...');
    });
    
    if (onProgress) onProgress(90, 'Finalizing results...');
    
    // Scale detections back to original image dimensions
    const scaledDetections = detections.map(detection => ({
      x: detection.x / scale,
      y: detection.y / scale,
      width: detection.width / scale,
      height: detection.height / scale,
      confidence: detection.confidence
    }));
    
    if (onProgress) onProgress(100, 'Complete!');
    
    // Return complete result object
    return {
      originalImageUrl,
      originalWidth,
      originalHeight,
      detections: scaledDetections,
      pillCount: scaledDetections.length,
      processingScale: scale,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Image processing error:', error);
    throw error;
  }
};

/**
 * Mock pill detection function - replace with your actual ML model
 * This is a placeholder that should be replaced with your actual detection code
 */
const runPillDetection = async (canvas, onProgress) => {
  // TODO: Replace this with your actual ML model inference
  // This is just a mock implementation for demonstration
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock detections for demonstration
      const mockDetections = [];
      const numPills = Math.floor(Math.random() * 20) + 5;
      
      for (let i = 0; i < numPills; i++) {
        mockDetections.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          width: 30 + Math.random() * 20,
          height: 30 + Math.random() * 20,
          confidence: 0.85 + Math.random() * 0.15
        });
        
        if (onProgress) {
          onProgress((i + 1) / numPills);
        }
      }
      
      resolve(mockDetections);
    }, 1000);
  });
  
  /* 
  // Example integration with TensorFlow.js or ONNX:
  
  const model = await tf.loadGraphModel('path/to/your/model');
  
  // Prepare input tensor
  const inputTensor = tf.browser.fromPixels(canvas)
    .resizeBilinear([640, 640])
    .expandDims(0)
    .div(255.0);
  
  // Run inference
  const predictions = await model.predict(inputTensor);
  
  // Process predictions into detections array
  const detections = processPredictions(predictions);
  
  // Clean up
  inputTensor.dispose();
  predictions.dispose();
  
  return detections;
  */
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
  };
  
  const errorText = error.message.toLowerCase();
  
  for (const [key, message] of Object.entries(errorMessages)) {
    if (errorText.includes(key)) {
      return message;
    }
  }
  
  return 'An error occurred while processing the image. Please try again.';
};
