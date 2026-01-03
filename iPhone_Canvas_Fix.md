# iPhone Canvas Display Issue - Root Cause & Fix

## Diagnosis from Your Screenshots

**Desktop (Working):** ✅
- Resolution: 768 × 1024
- Image fills container perfectly
- 51 pills detected and clearly visible

**iPhone (Broken):** ❌  
- Resolution: 3024 × 4032 (4x larger!)
- Image displays as tiny square
- 14 pills detected but image too small to see

## Root Cause

The canvas is being set to your ML model's processing dimensions (likely 640×640) and the CSS scaling that works on desktop is **NOT being applied on iPhone Safari**.

This happens because:
1. iPhone Safari ignores `!important` CSS in some cases
2. Inline styles in JavaScript override CSS files
3. The canvas element has conflicting transform/scale properties
4. Mobile viewport rendering differs from desktop

## The Fix - Update Your ResultsDisplay Component

### Step 1: Find Your Canvas Rendering Code

Look in your `ResultsDisplay.jsx` (or wherever you render results) for code like this:

```javascript
// Current code (BROKEN on iPhone):
useEffect(() => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  
  canvas.width = 640;  // ← Problem: ML processing size
  canvas.height = 640;
  
  ctx.drawImage(img, 0, 0, 640, 640);
  // Draw detections...
}, []);
```

### Step 2: Replace with This Fixed Code

```javascript
// FIXED code (works on both desktop and iPhone):
useEffect(() => {
  if (!canvasRef.current || !originalImageUrl) return;
  
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = () => {
    // CRITICAL: Set canvas to ORIGINAL image dimensions
    canvas.width = originalWidth;   // 3024 on iPhone
    canvas.height = originalHeight; // 4032 on iPhone
    
    // Draw FULL original image
    ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
    
    // Draw detections at original scale
    detections.forEach((detection, index) => {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 4;
      ctx.strokeRect(detection.x, detection.y, detection.width, detection.height);
      
      ctx.fillStyle = '#00FF00';
      ctx.font = 'bold 32px Arial';
      ctx.fillText((index + 1).toString(), detection.x + 10, detection.y + 35);
    });
    
    // CRITICAL: Scale canvas for display (works on iPhone!)
    const container = canvas.parentElement;
    const containerWidth = container.offsetWidth - 20;
    const scale = Math.min(containerWidth / originalWidth, 1);
    
    // Apply scale using setAttribute (more reliable on iOS)
    canvas.setAttribute('style', `
      width: ${originalWidth * scale}px !important;
      height: ${originalHeight * scale}px !important;
      max-width: 100% !important;
      display: block !important;
      margin: 0 auto !important;
    `);
  };
  
  img.src = originalImageUrl;
}, [originalImageUrl, detections, originalWidth, originalHeight]);
```

### Step 3: Update Your Canvas JSX

Make sure your canvas element looks like this:

```jsx
<div 
  style={{
    flex: 1,
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch', // Important for iOS
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '10px',
    width: '100%'
  }}
>
  <canvas
    ref={canvasRef}
    // Don't add inline styles here - let JS handle it
  />
</div>
```

## Alternative: Use IMG Instead of Canvas

If the canvas approach continues to fail, use an `<img>` tag instead:

```javascript
const [resultImageUrl, setResultImageUrl] = useState(null);

useEffect(() => {
  if (!originalImageUrl || !detections) return;
  
  // Create canvas offscreen
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = () => {
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    
    ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
    
    // Draw detections
    detections.forEach((detection, index) => {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 4;
      ctx.strokeRect(detection.x, detection.y, detection.width, detection.height);
      
      ctx.fillStyle = '#00FF00';
      ctx.font = 'bold 32px Arial';
      ctx.fillText((index + 1).toString(), detection.x + 10, detection.y + 35);
    });
    
    // Convert to image URL
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setResultImageUrl(url);
    }, 'image/jpeg', 0.95);
  };
  
  img.src = originalImageUrl;
  
  return () => {
    if (resultImageUrl) URL.revokeObjectURL(resultImageUrl);
  };
}, [originalImageUrl, detections, originalWidth, originalHeight]);

// Then render:
return (
  <div style={{ padding: '10px', width: '100%' }}>
    {resultImageUrl && (
      <img 
        src={resultImageUrl}
        alt="Results"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}
      />
    )}
  </div>
);
```

## Quick Diagnostic Test

Add this to your browser console on iPhone to see what's happening:

```javascript
const canvas = document.querySelector('canvas');
console.log('Internal dimensions:', canvas.width, 'x', canvas.height);
console.log('Display dimensions:', canvas.offsetWidth, 'x', canvas.offsetHeight);
console.log('Style width:', canvas.style.width);
console.log('Computed style:', window.getComputedStyle(canvas).width);
```

If you see:
- Internal: 640 x 640
- Display: 640px or smaller

That confirms the canvas isn't being scaled for display.

## Why Emergency CSS Didn't Work

The CSS failed because:
1. Your JavaScript is setting inline styles that override CSS
2. iPhone Safari has stricter CSS specificity rules
3. Canvas elements need `setAttribute('style', ...)` on iOS, not just `canvas.style.width`

## The Complete Solution

**Option A:** Update your canvas rendering (Steps 1-3 above)
**Option B:** Switch to `<img>` tag approach (more reliable on iOS)

I recommend **Option B** - using an `<img>` tag is more reliable across devices and doesn't have the canvas scaling issues that plague iOS Safari.

## Testing Checklist

After applying the fix:
- [ ] Image fills container on iPhone
- [ ] Image fills container on desktop (should still work)
- [ ] All pills are visible and numbered
- [ ] No scrolling needed to see full image
- [ ] Resolution displayed correctly (3024×4032)

## Need More Help?

If this still doesn't work, I need to see:
1. Your actual ResultsDisplay component code
2. Console logs from the diagnostic test above
3. The computed styles of the canvas element

The issue is definitely in how the canvas is being sized for display on iPhone Safari.
