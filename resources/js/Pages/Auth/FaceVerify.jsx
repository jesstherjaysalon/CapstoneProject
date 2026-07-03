import { Head, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import GuestLayout from '@/Layouts/GuestLayout';
import { Check, X, Loader2, Shield } from 'lucide-react';

export default function FaceVerify({ email, verifyUrl }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const currentStreamRef = useRef(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [faceFile, setFaceFile] = useState(null);
    const [faceValidity, setFaceValidity] = useState(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [autoCaptureTriggered, setAutoCaptureTriggered] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const [scanning, setScanning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [faceScore, setFaceScore] = useState(null);
    const [confidence, setConfidence] = useState(0);
    const [verificationStatus, setVerificationStatus] = useState('idle'); // idle, scanning, matched, failed
    const [availableCameras, setAvailableCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState(null);
    const [loadingCameras, setLoadingCameras] = useState(true);
    const [isVirtualCamera, setIsVirtualCamera] = useState(false);

    // DETECT IF CAMERA IS VIRTUAL (DroidCam, Iriun, OBS, etc.)
    const isVirtualCameraDevice = (cameraLabel) => {
        if (!cameraLabel) return false;
        const label = cameraLabel.toLowerCase();
        const virtualCameraPatterns = [
            'droidcam',
            'iriun',
            'obs',
            'virtual',
            'logitech',
            'usb video device',
            'android camera',
            'android',
            'droid',
            'mobile',
            'phone camera',
            'ip camera',
            'network camera'
        ];
        // More aggressive detection: if it contains any of these patterns OR doesn't mention common laptop/built-in names
        const hasVirtualPattern = virtualCameraPatterns.some(pattern => label.includes(pattern));
        const isUnknownOrGeneric = !label.includes('integrated') && !label.includes('built-in') && 
                                   !label.includes('webcam') && !label.includes('(usb)') &&
                                   label.includes('usb');
        return hasVirtualPattern || isUnknownOrGeneric;
    };

    // ENUMERATE AVAILABLE CAMERAS
    useEffect(() => {
        const enumerateCameras = async () => {
            try {
                setLoadingCameras(true);
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');

                if (videoDevices.length === 0) {
                    setError('No camera devices detected on this system.');
                    setCameraReady(false);
                    setLoadingCameras(false);
                    return;
                }

                setAvailableCameras(videoDevices);
                setSelectedCameraId(videoDevices[0].deviceId);
                setLoadingCameras(false);
            } catch (error) {
                setError('Failed to enumerate camera devices.');
                setCameraReady(false);
                setLoadingCameras(false);
            }
        };

        if (!navigator.mediaDevices?.enumerateDevices) {
            setError('Camera enumeration not supported in this browser.');
            setCameraReady(false);
            setLoadingCameras(false);
            return;
        }

        enumerateCameras();
    }, []);

    // START CAMERA WITH SELECTED DEVICE
    const startCamera = async (deviceId) => {
        try {
            // Stop existing stream if any
            if (currentStreamRef.current) {
                currentStreamRef.current.getTracks().forEach(track => track.stop());
                currentStreamRef.current = null;
            }

            if (!navigator.mediaDevices?.getUserMedia) {
                setError('Camera not supported in this browser.');
                setCameraReady(false);
                return;
            }

            // Detect if this is a virtual camera
            const selectedCamera = availableCameras.find(cam => cam.deviceId === deviceId);
            const isVirtual = selectedCamera ? isVirtualCameraDevice(selectedCamera.label) : false;
            setIsVirtualCamera(isVirtual);

            // Build constraints based on camera type
            let constraints;
            if (isVirtual) {
                // Virtual cameras (DroidCam, Iriun, OBS) need permissive constraints without facingMode
                constraints = {
                    video: {
                        deviceId: deviceId ? { exact: deviceId } : undefined,
                        width: { min: 320, ideal: 640, max: 1920 },
                        height: { min: 240, ideal: 480, max: 1920 },
                    },
                    audio: false,
                };
            } else {
                // Physical cameras can use facingMode hint
                constraints = {
                    video: {
                        deviceId: deviceId ? { exact: deviceId } : undefined,
                        facingMode: 'user',
                    },
                    audio: false,
                };
            }

            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (constraintError) {
                // Fallback: try with even more permissive constraints for virtual cameras
                if (isVirtual) {
                    console.warn('Initial constraints failed, trying permissive fallback');
                    const fallbackConstraints = {
                        video: {
                            deviceId: deviceId ? { exact: deviceId } : undefined,
                        },
                        audio: false,
                    };
                    stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                } else {
                    throw constraintError;
                }
            }

            currentStreamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                
                // Force video element to use correct rendering
                videoRef.current.setAttribute('playsinline', '');
                videoRef.current.setAttribute('muted', '');
                videoRef.current.setAttribute('autoplay', '');
                
                // Wait for metadata to load before playing (crucial for virtual cameras)
                const handleLoadedMetadata = () => {
                    if (videoRef.current) {
                        // Ensure video dimensions are properly set
                        console.log(`Video loaded: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
                        
                        videoRef.current.play().catch(err => {
                            console.error('Video play error:', err);
                            setError('Failed to start video playback.');
                            setCameraReady(false);
                        });
                    }
                    if (videoRef.current) {
                        videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
                    }
                };

                videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
                
                // Set timeout to handle edge cases where loadedmetadata doesn't fire
                const timeoutId = setTimeout(() => {
                    if (videoRef.current && videoRef.current.readyState >= 2) {
                        videoRef.current.play().catch(err => console.error('Video play error:', err));
                    }
                }, 1500);

                setError('');
                setCameraReady(true);
                return;
            }

            setError('');
            setCameraReady(true);
        } catch (error) {
            console.error('Camera access error:', error);
            setError('Unable to access the webcam. Please allow camera permissions and refresh the page.');
            setCameraReady(false);
        }
    };

    // INITIALIZE FIRST CAMERA ON LOAD
    useEffect(() => {
        if (selectedCameraId && !loadingCameras) {
            startCamera(selectedCameraId);
        }

        return () => {
            if (currentStreamRef.current) {
                currentStreamRef.current.getTracks().forEach(track => track.stop());
                currentStreamRef.current = null;
            }
        };
    }, [selectedCameraId, loadingCameras, availableCameras]);

    // HANDLE CAMERA CHANGE
    const handleCameraChange = (e) => {
        const newCameraId = e.target.value;
        setSelectedCameraId(newCameraId);
    };

    useEffect(() => {
        if (cameraReady && !capturedImage && !error && !autoCaptureTriggered) {
            setAutoCaptureTriggered(true);
            setMessage('Position your face in the center. Auto-capture will begin in 3 seconds.');
            setElapsedSeconds(0);
            setCountdown(3);
            setVerificationStatus('idle');
            const countdownTimer = setInterval(() => {
                setCountdown((current) => {
                    if (current <= 1) {
                        clearInterval(countdownTimer);
                        captureImage();
                        return 0;
                    }
                    return current - 1;
                });
            }, 1000);
            return () => clearInterval(countdownTimer);
        }
    }, [cameraReady, capturedImage, error, autoCaptureTriggered]);

    useEffect(() => {
        if (faceFile) {
            verifyFace();
        }
    }, [faceFile]);

    useEffect(() => {
        if (!scanning) {
            setElapsedSeconds(0);
            return;
        }

        const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [scanning]);

    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) {
            return;
        }

        setScanning(true);
        setElapsedSeconds(0);
        setMessage('Scanning face...');
        setError('');
        setVerificationStatus('scanning');
        setConfidence(0);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = 640;
        canvas.height = 480;
        const context = canvas.getContext('2d');

        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], 'face_image.jpg', {
                        type: 'image/jpeg',
                    });

                    setFaceFile(file);
                    setCapturedImage(URL.createObjectURL(blob));
                    setFaceValidity(null);
                    setFaceScore(null);
                    setMessage('Analyzing face...');
                }
            }, 'image/jpeg', 0.95);
        }
    };

    const resetCapture = () => {
        setCapturedImage(null);
        setFaceFile(null);
        setFaceValidity(null);
        setFaceScore(null);
        setConfidence(0);
        setError('');
        setMessage('');
        setCountdown(3);
        setAutoCaptureTriggered(false);
        setScanning(false);
        setVerificationStatus('idle');
    };

    const verifyFace = async () => {
        if (!faceFile) {
            return;
        }

        setLoading(true);
        setScanning(true);
        setError('');
        setMessage('Matching face...');
        setVerificationStatus('scanning');

        // Simulate confidence progression for visual effect
        const confidenceInterval = setInterval(() => {
            setConfidence(prev => {
                if (prev >= 85) {
                    clearInterval(confidenceInterval);
                    return prev;
                }
                return prev + Math.random() * 15 + 5;
            });
        }, 300);

        const formData = new FormData();
        formData.append('face_image', faceFile);

        try {
            const response = await axios.post(verifyUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            clearInterval(confidenceInterval);
            
            const actualConfidence = response.data?.confidence ?? (response.data?.score ? response.data.score * 100 : 0) ?? 0;
            setConfidence(isNaN(actualConfidence) ? 0 : actualConfidence);
            setFaceScore(response.data?.score ?? null);

            if (response.data?.verified) {
                setVerificationStatus('matched');
                setMessage('Identity Verified');
                setFaceValidity(true);
                setConfidence(100); // Show 100% when verified
                
                // Auto-login after short delay
                setTimeout(() => {
                    window.location.href = response.data.redirect_url;
                }, 1500);
                return;
            }

            setVerificationStatus('failed');
            setFaceValidity(false);
            setFaceScore(response.data?.score ?? null);

            if (response.data?.score != null || response.data?.confidence != null) {
                setError('');
                setMessage('Face does not match the registered account.');
            } else {
                setError(response.data?.message || 'Face verification failed.');
                setMessage('');
            }
        } catch (submitError) {
            clearInterval(confidenceInterval);
            setVerificationStatus('failed');
            setFaceValidity(false);
            setError(
                submitError.response?.data?.message ||
                'Face verification failed. Please try again.'
            );
            setMessage('');
        } finally {
            setLoading(false);
            setScanning(false);
            setElapsedSeconds(0);
        }
    };

    const previewBorderClass = verificationStatus === 'matched'
        ? 'ring-4 ring-green-500/70 ring-offset-2 ring-offset-white'
        : verificationStatus === 'failed'
            ? 'ring-4 ring-red-500/80 ring-offset-2 ring-offset-white'
            : 'ring ring-blue-900/30';

    const statusText = error
        ? error
        : verificationStatus === 'matched'
            ? 'Identity Verified'
            : verificationStatus === 'failed'
                ? 'Face does not match the registered account.'
                : loading
                    ? 'Processing face...'
                    : scanning
                        ? 'Scanning...'
                        : cameraReady && countdown > 0 && !capturedImage
                            ? `Auto-capture in ${countdown}s`
                            : message || 'Ready to capture';

    return (
        <>
            <Head title="Face Verification" />

            <main className="min-h-screen bg-white p-4 flex items-center justify-center">
                <div className="w-full max-w-md">
                    <header className="mb-4 text-center">
                        <h1 className="text-xl font-semibold text-blue-900">Face Verification</h1>
                        <p className="mt-1 text-sm text-slate-600">Quickly verify your identity using your webcam</p>
                    </header>

                    {/* CAMERA SELECTION DROPDOWN */}
                    <div className="mb-4">
                        <label htmlFor="camera-select" className="block text-sm font-medium text-blue-900 mb-2">
                            Select Camera
                        </label>
                        <select
                            id="camera-select"
                            value={selectedCameraId || ''}
                            onChange={handleCameraChange}
                            disabled={loadingCameras || availableCameras.length === 0}
                            className="w-full px-3 py-2 border border-blue-900/30 rounded-lg text-sm bg-white hover:border-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingCameras ? (
                                <option>Loading cameras...</option>
                            ) : availableCameras.length === 0 ? (
                                <option>No cameras available</option>
                            ) : (
                                availableCameras.map((camera) => (
                                    <option key={camera.deviceId} value={camera.deviceId}>
                                        {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
                                    </option>
                                ))
                            )}
                        </select>
                        <p className="text-xs text-slate-600 mt-1">
                            {availableCameras.length} camera(s) detected
                        </p>
                    </div>

                    <div className={`rounded-xl overflow-hidden ${previewBorderClass} bg-blue-900/30`}>
                        <div className="w-full bg-white relative">
                            {!capturedImage ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-[54vh] md:h-[60vh] object-cover scale-x-[-1] bg-white"
                                />
                            ) : (
                                <img src={capturedImage} alt="Captured face" className="w-full h-[54vh] md:h-[60vh] object-cover bg-white" />
                            )}

                            {/* Scanning overlay */}
                            {scanning && (
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-4">
                                        <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
                                    </div>
                                </div>
                            )}

                            {/* Success overlay */}
                            {verificationStatus === 'matched' && (
                                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-4">
                                        <Check className="w-12 h-12 text-green-600" />
                                    </div>
                                </div>
                            )}

                            {/* Failure overlay */}
                            {verificationStatus === 'failed' && (
                                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-4">
                                        <X className="w-12 h-12 text-red-600" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-3 flex flex-col items-center gap-3">
                        <div className={`text-sm font-medium ${
                            verificationStatus === 'matched' ? 'text-green-600' :
                            verificationStatus === 'failed' ? 'text-red-600' :
                            'text-blue-900'
                        }`}>
                            {statusText}
                        </div>

                        {/* Confidence Indicator */}
                        {(scanning || verificationStatus === 'matched' || verificationStatus === 'failed') && (
                            <div className="w-full">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        Match Confidence
                                    </span>
                                    <span className={`text-lg font-bold ${
                                        confidence >= 50 ? 'text-green-600' :
                                        confidence >= 30 ? 'text-yellow-600' :
                                        'text-red-600'
                                    }`}>
                                        {Math.round(confidence)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-300 ease-out ${
                                            confidence >= 50 ? 'bg-green-500' :
                                            confidence >= 30 ? 'bg-yellow-500' :
                                            'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(confidence, 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="w-full flex gap-3">
                            <button
                                type="button"
                                onClick={captureImage}
                                disabled={loading || !cameraReady || verificationStatus === 'matched'}
                                className="flex-1 inline-flex items-center justify-center rounded-2xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Scanning...' : 'Capture now'}
                            </button>
                            <button
                                type="button"
                                onClick={resetCapture}
                                disabled={loading || verificationStatus === 'matched'}
                                className="inline-flex items-center justify-center rounded-2xl border border-blue-900/30 bg-transparent px-4 py-3 text-sm font-semibold text-blue-900 transition hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Retry
                            </button>
                        </div>

                        <div className="w-full mt-2 text-center text-sm text-slate-600">
                            Signed in as <span className="font-medium text-blue-900">{email}</span>
                        </div>
                    </div>

                    <canvas ref={canvasRef} className="hidden" />
                </div>
            </main>
        </>
    );
}
