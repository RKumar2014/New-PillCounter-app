# New PillCounter App

Modern pill counting application with AI-powered detection using Roboflow API.

## 🚀 Features

- ✅ AI-powered pill detection with Roboflow API
- ✅ iPhone-optimized interface with safe area support
- ✅ 50% confidence threshold for accurate counting
- ✅ Green numbered pill overlays
- ✅ Detailed prediction logging for debugging
- ✅ Camera capture and file upload support
- ✅ Progressive Web App (PWA) ready

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Vite 5** - Build tool (super fast HMR)
- **Roboflow API** - Pill detection ML model
- **CSS3** - Custom styling with iPhone optimizations

## 📦 Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Development

The app runs on `http://localhost:5175` by default.

## 🚢 Deployment

The production build is in the `dist` folder. Deploy to:
- GitHub Pages
- Vercel (recommended)
- Netlify
- Any static hosting service

## 🔧 Configuration

### Roboflow API
The API key and model endpoint are configured in `src/imageProcessing.js`:
- API Key: `us5nPRXtK3HK3V4fF1DC`
- Model: `pill-detection-eye/1`
- Confidence Threshold: 50%

## 📱 iPhone Optimization

This app is specifically optimized for iPhone devices:
- Dynamic viewport height (dvh) for proper screen sizing
- Safe area insets for notch/Dynamic Island
- PWA-ready with apple-touch-icon support
- Touch-optimized UI elements

## 🐛 Debug Logs

The app includes detailed prediction logging in the browser console:
- Full API responses
- Individual pill predictions with confidence scores
- Image dimensions and processing details

## 📄 License

Private project - © 2026
