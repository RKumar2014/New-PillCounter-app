// ResultsDisplay.jsx
// Optimized results display component for iPhone
// Fixes Issue #1: Shows original image with overlays
// Fixes Issue #3: Proper viewport sizing without excessive scrolling

import React, { useEffect, useRef, useState } from 'react';
import './ResultsDisplay.css';

const ResultsDisplay = ({ 
  originalImageUrl, 
  detections, 
  pillCount, 
  originalWidth, 
  originalHeight,
  onRetake,
  onSave 
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(true);
  const [canvasScale, setCanvasScale] = useState(1);

  useEffect(() => {
    if (!canvasRef.current || !originalImageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Set canvas to exact original dimensions
      canvas.width = originalWidth;
      canvas.height = originalHeight;

      // Draw the original image at full size
      ctx.drawImage(img, 0, 0, originalWidth, originalHeight);

      // Draw detection markers
      drawDetections(ctx, detections);

      setIsDrawing(false);

      // Calculate scale for display
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 20; // Account for padding
        const scale = containerWidth / originalWidth;
        setCanvasScale(Math.min(scale, 1)); // Don't scale up, only down
      }
    };

    img.onerror = () => {
      console.error('Failed to load image for display');
      setIsDrawing(false);
    };

    img.src = originalImageUrl;

    // Cleanup
    return () => {
      img.src = '';
    };
  }, [originalImageUrl, detections, originalWidth, originalHeight]);

  const drawDetections = (ctx, detections) => {
    detections.forEach((detection, index) => {
      // Semi-transparent fill
      ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
      ctx.fillRect(detection.x, detection.y, detection.width, detection.height);

      // Bounding box
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 4;
      ctx.strokeRect(detection.x, detection.y, detection.width, detection.height);

      // Pill number with background
      const pillNumber = (index + 1).toString();
      ctx.font = 'bold 28px Arial';
      
      const metrics = ctx.measureText(pillNumber);
      const textWidth = metrics.width;
      const textHeight = 28;
      
      const bgPadding = 6;
      const bgX = detection.x;
      const bgY = detection.y;
      const bgWidth = textWidth + bgPadding * 2;
      const bgHeight = textHeight + bgPadding * 2;

      // Draw background rectangle
      ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
      ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

      // Draw text
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'top';
      ctx.fillText(pillNumber, bgX + bgPadding, bgY + bgPadding);

      // Draw confidence score if available
      if (detection.confidence) {
        const confText = `${(detection.confidence * 100).toFixed(0)}%`;
        ctx.font = '16px Arial';
        const confY = detection.y + detection.height - 24;
        
        // Background for confidence
        const confMetrics = ctx.measureText(confText);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(detection.x, confY - 4, confMetrics.width + 8, 20);
        
        // Confidence text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(confText, detection.x + 4, confY);
      }
    });
  };

  const handleDownload = async () => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `pill-count-${pillCount}-${timestamp}.jpg`;
      link.href = url;
      link.click();

      URL.revokeObjectURL(url);

      if (onSave) onSave();
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('Failed to save image. Please try again.');
    }
  };

  const handleShare = async () => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      });

      const file = new File([blob], `pill-count-${pillCount}.jpg`, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Pill Count Results',
          text: `Counted ${pillCount} pills`
        });
      } else {
        // Fallback to download
        handleDownload();
      }
    } catch (error) {
      console.error('Failed to share:', error);
      // Fallback to download
      handleDownload();
    }
  };

  return (
    <div className="results-screen">
      {/* Header with count */}
      <div className="results-header">
        <div className="pill-count-badge">
          <span className="count-number">{pillCount}</span>
          <span className="count-label">Pills Detected</span>
        </div>
        
        <div className="results-info">
          <div className="info-item">
            <span className="info-label">Resolution:</span>
            <span className="info-value">{originalWidth} × {originalHeight}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Detections:</span>
            <span className="info-value">{detections.length}</span>
          </div>
        </div>
      </div>

      {/* Image container with proper viewport handling */}
      <div className="results-image-container" ref={containerRef}>
        {isDrawing && (
          <div className="drawing-overlay">
            <div className="spinner"></div>
            <p>Rendering results...</p>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          className="results-canvas"
          style={{
            transform: `scale(${canvasScale})`,
            transformOrigin: 'top center',
            maxWidth: '100%',
            height: 'auto'
          }}
        />

        {/* Image info overlay */}
        <div className="image-info-overlay">
          <span>Tap to zoom • Pinch to scale</span>
        </div>
      </div>

      {/* Action buttons fixed at bottom */}
      <div className="results-actions">
        <button 
          className="action-button primary"
          onClick={onRetake}
        >
          <span className="button-icon">📷</span>
          <span className="button-text">Take Another Photo</span>
        </button>

        <button 
          className="action-button secondary"
          onClick={handleShare}
        >
          <span className="button-icon">💾</span>
          <span className="button-text">Save/Share</span>
        </button>
      </div>

      {/* Tips section (collapsible) */}
      <div className="results-tips">
        <details>
          <summary>💡 Tips for Better Results</summary>
          <ul>
            <li>Ensure good lighting</li>
            <li>Use a contrasting background</li>
            <li>Keep pills well-separated</li>
            <li>Hold camera steady</li>
            <li>Avoid shadows over pills</li>
          </ul>
        </details>
      </div>
    </div>
  );
};

export default ResultsDisplay;
