// App.jsx
// Main application component with all iPhone fixes integrated

import React, { useState, useRef } from 'react';
import ResultsDisplay from './ResultsDisplay';
import {
    validateAndCompressImage,
    processAndDisplayImage,
    getErrorMessage
} from './imageProcessing';
import './App.css';

function App() {
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState({ percent: 0, message: '' });
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleImageCapture = async (file) => {
        if (!file) return;

        try {
            setIsLoading(true);
            setError(null);
            setProgress({ percent: 0, message: 'Starting...' });

            // Validate and compress image (fixes Issue #2)
            const validatedFile = await validateAndCompressImage(file);
            setProgress({ percent: 20, message: 'Image validated' });

            // Process image (fixes Issue #1 - preserves original)
            const result = await processAndDisplayImage(
                validatedFile,
                (percent, message) => {
                    setProgress({ percent, message });
                }
            );

            // Update results
            setResults(result);
            setIsLoading(false);

        } catch (err) {
            setIsLoading(false);
            setError(getErrorMessage(err));
            console.error('Image capture error:', err);
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            handleImageCapture(file);
        }
    };

    const handleCameraCapture = (event) => {
        const file = event.target.files[0];
        if (file) {
            handleImageCapture(file);
        }
    };

    const handleRetake = () => {
        // Clean up previous results
        if (results?.originalImageUrl) {
            URL.revokeObjectURL(results.originalImageUrl);
        }

        setResults(null);
        setError(null);
        setProgress({ percent: 0, message: '' });

        // Reset file inputs
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    };

    const handleSave = () => {
        console.log('Results saved');
        // You can add additional save logic here (e.g., save to database)
    };

    // If we have results, show the results screen
    if (results) {
        return (
            <ResultsDisplay
                originalImageUrl={results.originalImageUrl}
                detections={results.detections}
                pillCount={results.pillCount}
                originalWidth={results.originalWidth}
                originalHeight={results.originalHeight}
                onRetake={handleRetake}
                onSave={handleSave}
            />
        );
    }

    // Otherwise show the capture screen
    return (
        <div className="app">
            <div className="capture-screen">
                {/* Header */}
                <header className="app-header">
                    <h1 className="app-title">
                        <span className="title-icon">💊</span>
                        Pill Counter
                    </h1>
                    <p className="app-subtitle">
                        Accurate AI-powered pill counting
                    </p>
                </header>

                {/* Main content area */}
                <div className="capture-content">
                    {error && (
                        <div className="error-message">
                            <div className="error-icon">⚠️</div>
                            <p className="error-text">{error}</p>
                            <button
                                className="error-dismiss"
                                onClick={() => setError(null)}
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    <div className="capture-options">
                        {/* Camera capture button */}
                        <div className="capture-option">
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleCameraCapture}
                                style={{ display: 'none' }}
                                id="camera-input"
                                disabled={isLoading}
                            />
                            <label
                                htmlFor="camera-input"
                                className={`capture-button camera ${isLoading ? 'disabled' : ''}`}
                            >
                                <span className="button-icon">📸</span>
                                <span className="button-label">Take Photo</span>
                                <span className="button-hint">Use your camera</span>
                            </label>
                        </div>

                        <div className="divider">
                            <span>or</span>
                        </div>

                        {/* File upload button */}
                        <div className="capture-option">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                                id="file-input"
                                disabled={isLoading}
                            />
                            <label
                                htmlFor="file-input"
                                className={`capture-button upload ${isLoading ? 'disabled' : ''}`}
                            >
                                <span className="button-icon">🖼️</span>
                                <span className="button-label">Choose Photo</span>
                                <span className="button-hint">From your gallery</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="app-footer">
                    <p>Powered by AI • Privacy-First • No Data Stored</p>
                </footer>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-card">
                        <div className="loading-spinner"></div>
                        <p className="loading-message">{progress.message}</p>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${progress.percent}%` }}
                            />
                        </div>
                        <p className="progress-percent">{Math.round(progress.percent)}%</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
