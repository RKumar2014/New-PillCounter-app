// ResultsDisplay_IMG_SOLUTION.jsx
// DEFINITIVE SOLUTION - Uses <img> instead of <canvas> for display
// This fixes the iPhone display issue by avoiding canvas scaling problems

import React, { useEffect, useState } from 'react';

const ResultsDisplay = ({ 
  originalImageUrl, 
  detections, 
  pillCount, 
  originalWidth, 
  originalHeight,
  onRetake,
  onSave 
}) => {
  const [displayImageUrl, setDisplayImageUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    if (!originalImageUrl || !detections) return;

    setIsProcessing(true);

    // Create canvas offscreen (not displayed)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Set canvas to FULL original dimensions
      canvas.width = originalWidth;
      canvas.height = originalHeight;

      // Draw original image at full size
      ctx.drawImage(img, 0, 0, originalWidth, originalHeight);

      // Draw detections
      detections.forEach((detection, index) => {
        // Semi-transparent fill
        ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
        ctx.fillRect(detection.x, detection.y, detection.width, detection.height);

        // Bounding box
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = Math.max(4, originalWidth / 800);
        ctx.strokeRect(detection.x, detection.y, detection.width, detection.height);

        // Pill number with background
        const fontSize = Math.max(24, originalWidth / 100);
        ctx.font = `bold ${fontSize}px Arial`;
        
        const text = (index + 1).toString();
        const metrics = ctx.measureText(text);
        const padding = fontSize * 0.3;
        
        // Background for number
        ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
        ctx.fillRect(
          detection.x,
          detection.y,
          metrics.width + padding * 2,
          fontSize + padding * 2
        );
        
        // Number text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(text, detection.x + padding, detection.y + fontSize + padding * 0.3);
      });

      // Convert canvas to blob and create URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setDisplayImageUrl(url);
          setIsProcessing(false);
        }
      }, 'image/jpeg', 0.95);
    };

    img.onerror = () => {
      console.error('Failed to load image');
      setIsProcessing(false);
    };

    img.src = originalImageUrl;

    // Cleanup
    return () => {
      if (displayImageUrl) {
        URL.revokeObjectURL(displayImageUrl);
      }
    };
  }, [originalImageUrl, detections, originalWidth, originalHeight]);

  const handleDownload = () => {
    if (!displayImageUrl) return;
    
    const link = document.createElement('a');
    link.href = displayImageUrl;
    link.download = `pill-count-${pillCount}.jpg`;
    link.click();
  };

  const handleShare = async () => {
    if (!displayImageUrl) return;

    try {
      const response = await fetch(displayImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `pill-count-${pillCount}.jpg`, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Pill Count Results',
          text: `Counted ${pillCount} pills`
        });
      } else {
        handleDownload();
      }
    } catch (error) {
      console.error('Share failed:', error);
      handleDownload();
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        padding: '15px',
        background: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '15px',
          padding: '15px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '15px',
          color: 'white',
          marginBottom: '10px'
        }}>
          <span style={{ fontSize: '48px', fontWeight: 'bold' }}>{pillCount}</span>
          <span style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            PILLS DETECTED
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-around', gap: '10px' }}>
          <div style={{
            flex: 1,
            padding: '8px',
            background: '#f5f5f5',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
              RESOLUTION:
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>
              {originalWidth} × {originalHeight}
            </div>
          </div>
          <div style={{
            flex: 1,
            padding: '8px',
            background: '#f5f5f5',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
              DETECTIONS:
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>
              {detections.length}
            </div>
          </div>
        </div>
      </div>

      {/* Image Container - THE FIX: Using <img> instead of <canvas> */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '10px',
        minHeight: 0
      }}>
        {isProcessing ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px',
            padding: '40px',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '15px',
            marginTop: '50px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
              Rendering results...
            </p>
          </div>
        ) : displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt="Pill detection results"
            style={{
              width: '100%',
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              objectFit: 'contain'
            }}
          />
        ) : (
          <div style={{
            padding: '40px',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '15px',
            textAlign: 'center'
          }}>
            <p style={{ color: '#f44336', fontWeight: 'bold' }}>
              Failed to load results
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{
        flexShrink: 0,
        padding: '15px',
        background: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={onRetake}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <span style={{ fontSize: '20px' }}>📷</span>
          <span>Take Another Photo</span>
        </button>

        <button
          onClick={handleShare}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <span style={{ fontSize: '20px' }}>💾</span>
          <span>Save/Share</span>
        </button>
      </div>

      {/* Tips */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(255, 255, 255, 0.9)',
        borderTop: '1px solid rgba(0, 0, 0, 0.1)'
      }}>
        <details style={{ padding: '12px 15px' }}>
          <summary style={{
            cursor: 'pointer',
            fontWeight: '600',
            color: '#667eea',
            listStyle: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}>
            💡 Tips for Better Results
          </summary>
          <ul style={{
            margin: '10px 0 0 0',
            paddingLeft: '20px',
            fontSize: '14px',
            color: '#555'
          }}>
            <li>Ensure good lighting</li>
            <li>Use a contrasting background</li>
            <li>Keep pills well-separated</li>
            <li>Hold camera steady</li>
            <li>Avoid shadows over pills</li>
          </ul>
        </details>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ResultsDisplay;
