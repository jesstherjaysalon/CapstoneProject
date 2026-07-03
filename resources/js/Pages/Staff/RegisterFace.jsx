import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

export default function RegisterFace({ staff, storeUrl, backUrl }) {
    const [capturedImage, setCapturedImage] = useState(null);
    const [faceValidity, setFaceValidity] = useState(null);
    const [streamError, setStreamError] = useState('');
    const [cameraAccessible, setCameraAccessible] = useState(true);
    const [availableCameras, setAvailableCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState(null);
    const [loadingCameras, setLoadingCameras] = useState(true);
    const [isVirtualCamera, setIsVirtualCamera] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [qualityChecks, setQualityChecks] = useState({
        faceDetected: false,
        centered: false,
        eyesOpen: false,
        lookingStraight: false,
        goodLighting: false,
        notBlurry: false,
        fullyVisible: false,
        properDistance: false,
    });
    const [progress, setProgress] = useState(0);
    const [currentTip, setCurrentTip] = useState('Position your face in the center of the guide');

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const currentStreamRef = useRef(null);
    const analysisIntervalRef = useRef(null);

    const form = useForm({
        face_image: null,
    });

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
                    setStreamError('No camera devices detected on this system.');
                    setCameraAccessible(false);
                    setLoadingCameras(false);
                    return;
                }

                setAvailableCameras(videoDevices);
                setSelectedCameraId(videoDevices[0].deviceId);
                setLoadingCameras(false);
            } catch (error) {
                setStreamError('Failed to enumerate camera devices.');
                setCameraAccessible(false);
                setLoadingCameras(false);
            }
        };

        if (!navigator.mediaDevices?.enumerateDevices) {
            setStreamError('Camera enumeration not supported in this browser.');
            setCameraAccessible(false);
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
                setStreamError('Camera not supported in this browser.');
                setCameraAccessible(false);
                return;
            }

            // Detect if this is a virtual camera
            const selectedCamera = availableCameras.find(cam => cam.deviceId === deviceId);
            const isVirtual = selectedCamera ? isVirtualCameraDevice(selectedCamera.label) : false;
            setIsVirtualCamera(isVirtual);

            // Build constraints based on camera type
            let constraints;
            if (isVirtual) {
                // Virtual cameras (DroidCam, Iriun, OBS) need permissive constraints
                // Start with flexible resolution range
                constraints = {
                    video: {
                        deviceId: deviceId ? { exact: deviceId } : undefined,
                        width: { min: 320, ideal: 640, max: 1920 },
                        height: { min: 240, ideal: 480, max: 1920 },
                    },
                    audio: false,
                };
            } else {
                // Physical cameras support strict constraints
                constraints = {
                    video: {
                        deviceId: deviceId ? { exact: deviceId } : undefined,
                        width: { ideal: 1080 },
                        height: { ideal: 1920 },
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
                            setStreamError('Failed to start video playback.');
                            setCameraAccessible(false);
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

                return () => clearTimeout(timeoutId);
            }

            setStreamError('');
            setCameraAccessible(true);
        } catch (error) {
            console.error('Camera access error:', error);
            setStreamError('Camera access denied. Please enable permissions or try a different camera.');
            setCameraAccessible(false);
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

    // QUALITY CHECK SIMULATION (In production, this would use real face detection)
    const analyzeFrame = () => {
        if (!videoRef.current || !cameraAccessible || capturedImage) return;

        setAnalyzing(true);

        // Simulate quality checks (replace with real face detection in production)
        const randomDelay = Math.random() * 500 + 300;
        
        setTimeout(() => {
            // Simulate progressive quality detection
            const newChecks = {
                faceDetected: true,
                centered: Math.random() > 0.3,
                eyesOpen: Math.random() > 0.2,
                lookingStraight: Math.random() > 0.3,
                goodLighting: Math.random() > 0.25,
                notBlurry: Math.random() > 0.2,
                fullyVisible: Math.random() > 0.15,
                properDistance: Math.random() > 0.3,
            };

            setQualityChecks(newChecks);

            // Calculate progress
            const passedChecks = Object.values(newChecks).filter(Boolean).length;
            const totalChecks = Object.keys(newChecks).length;
            const newProgress = Math.round((passedChecks / totalChecks) * 100);
            setProgress(newProgress);

            // Update tip based on failed checks
            const failedChecks = Object.entries(newChecks)
                .filter(([_, passed]) => !passed)
                .map(([check]) => check);

            if (failedChecks.length > 0) {
                const tips = {
                    centered: 'Move your face to the center of the guide',
                    eyesOpen: 'Keep your eyes open and look at the camera',
                    lookingStraight: 'Face the camera directly, not from the side',
                    goodLighting: 'Improve lighting - face should be well-lit',
                    notBlurry: 'Hold steady and avoid moving',
                    fullyVisible: 'Ensure your entire face is visible in the frame',
                    properDistance: 'Move closer or further from the camera',
                };
                setCurrentTip(tips[failedChecks[0]] || 'Adjust your position');
            } else {
                setCurrentTip('Perfect! All checks passed. Ready to capture.');
            }

            setAnalyzing(false);
        }, randomDelay);
    };

    // Start continuous analysis when camera is ready
    useEffect(() => {
        if (cameraAccessible && !capturedImage) {
            analysisIntervalRef.current = setInterval(analyzeFrame, 1500);
        }
        return () => {
            if (analysisIntervalRef.current) {
                clearInterval(analysisIntervalRef.current);
            }
        };
    }, [cameraAccessible, capturedImage]);

    useEffect(() => {
        if (form.errors.face_image && capturedImage) {
            setFaceValidity(false);
        }
    }, [form.errors, capturedImage]);

    // CAPTURE IMAGE
    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width =	video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (!blob) return;

            const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });

            form.setData('face_image', file);
            setCapturedImage(URL.createObjectURL(blob));
            setFaceValidity(true);
            // Stop analysis after capture
            if (analysisIntervalRef.current) {
                clearInterval(analysisIntervalRef.current);
            }
        }, 'image/jpeg', 0.95);
    };

    const retake = () => {
        setCapturedImage(null);
        setFaceValidity(null);
        form.setData('face_image', null);
        setProgress(0);
        setQualityChecks({
            faceDetected: false,
            centered: false,
            eyesOpen: false,
            lookingStraight: false,
            goodLighting: false,
            notBlurry: false,
            fullyVisible: false,
            properDistance: false,
        });
        setCurrentTip('Position your face in the center of the guide');
        // Resume analysis
        if (cameraAccessible) {
            analysisIntervalRef.current = setInterval(analyzeFrame, 1500);
        }
    };

    const submit = (e) => {
        e.preventDefault();

        form.post(storeUrl, {
            forceFormData: true,
        });
    };

    return (
        <>
            <Head title="Face Registration" />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                <div className="mx-auto max-w-5xl space-y-6">

                    {/* HEADER */}
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900">
                            Face Registration
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Capture a clear portrait to secure your account access
                        </p>
                    </div>

                    {/* ERROR */}
                    {streamError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
                            {streamError}
                        </div>
                    )}

                    <div className="grid gap-6 lg:grid-cols-2">

                        {/* CAMERA CARD */}
                        <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-gray-700">
                                    Live Camera (Portrait Mode)
                                </h2>

                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    cameraAccessible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                    {cameraAccessible ? 'Active' : 'Disabled'}
                                </span>
                            </div>

                            {/* CAMERA SELECTION DROPDOWN */}
                            <div>
                                <label htmlFor="camera-select" className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Camera
                                </label>
                                <select
                                    id="camera-select"
                                    value={selectedCameraId || ''}
                                    onChange={handleCameraChange}
                                    disabled={loadingCameras || availableCameras.length === 0}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                <p className="text-xs text-gray-500 mt-1">
                                    {availableCameras.length} camera(s) detected
                                </p>
                            </div>

                            {/* PORTRAIT CAMERA */}
                            <div className={`relative mx-auto w-full max-w-sm aspect-[9/16] overflow-hidden rounded-2xl bg-black border-4 transition ${
                                faceValidity === true
                                    ? 'border-green-500'
                                    : faceValidity === false
                                    ? 'border-red-500'
                                    : progress === 100
                                    ? 'border-green-400'
                                    : 'border-gray-200'
                            }`}>

                                {!capturedImage ? (
                                    <video
                                        ref={videoRef}
                                        className="h-full w-full object-cover scale-x-[-1]"
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <img
                                        src={capturedImage}
                                        className="h-full w-full object-cover"
                                        alt="Captured"
                                    />
                                )}

                                {/* FACE GUIDE OVERLAY */}
                                {!capturedImage && (
                                    <>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className={`w-40 h-52 border-4 rounded-full transition-all duration-300 ${
                                                progress === 100 ? 'border-green-400' : 'border-white/60'
                                            }`} />
                                        </div>
                                        
                                        {/* Analyzing indicator */}
                                        {analyzing && (
                                            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full p-2">
                                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Quality Progress Bar */}
                            {!capturedImage && (
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700">Quality Check</span>
                                        <span className={`text-sm font-semibold ${
                                            progress === 100 ? 'text-green-600' : 'text-gray-600'
                                        }`}>
                                            {progress}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                                                progress === 100 ? 'bg-green-500' : 'bg-indigo-600'
                                            }`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className={`text-xs mt-2 ${
                                        progress === 100 ? 'text-green-600 font-medium' : 'text-gray-500'
                                    }`}>
                                        {currentTip}
                                    </p>
                                </div>
                            )}

                            {/* ACTION BUTTONS */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={captureImage}
                                    disabled={!cameraAccessible || progress !== 100 || capturedImage}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {progress === 100 ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Capture
                                        </>
                                    ) : (
                                        'Capture'
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={retake}
                                    disabled={!capturedImage}
                                    className="flex-1 border border-gray-300 hover:bg-gray-50 py-3 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Retake
                                </button>
                            </div>
                        </div>

                        {/* FORM CARD */}
                        <form
                            onSubmit={submit}
                            className="bg-white rounded-2xl shadow-lg p-5 space-y-5"
                        >

                            <div>
                                <h2 className="text-sm font-semibold text-gray-700">
                                    Quality Requirements
                                </h2>
                                <p className="text-sm text-gray-500 mt-2">
                                    All checks must pass before capturing
                                </p>
                            </div>

                            {/* Quality Check List */}
                            <div className="space-y-2">
                                {[
                                    { key: 'faceDetected', label: 'Face detected' },
                                    { key: 'centered', label: 'Face centered' },
                                    { key: 'eyesOpen', label: 'Eyes open' },
                                    { key: 'lookingStraight', label: 'Looking straight at camera' },
                                    { key: 'goodLighting', label: 'Good lighting' },
                                    { key: 'notBlurry', label: 'Image not blurry' },
                                    { key: 'fullyVisible', label: 'Face fully visible' },
                                    { key: 'properDistance', label: 'Proper distance from camera' },
                                ].map((check) => (
                                    <div key={check.key} className="flex items-center gap-3">
                                        {qualityChecks[check.key] ? (
                                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        ) : (
                                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                                        )}
                                        <span className={`text-sm ${
                                            qualityChecks[check.key] ? 'text-gray-900' : 'text-gray-400'
                                        }`}>
                                            {check.label}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* PREVIEW */}
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Captured Preview
                                </label>

                                <div className="mt-2 h-56 rounded-xl border bg-gray-100 flex items-center justify-center overflow-hidden">
                                    {capturedImage ? (
                                        <img
                                            src={capturedImage}
                                            className="h-full w-full object-cover"
                                            alt="Preview"
                                        />
                                    ) : (
                                        <span className="text-gray-400 text-sm">
                                            No image captured
                                        </span>
                                    )}
                                </div>

                                {form.errors.face_image && (
                                    <p className="text-red-600 text-sm mt-2">
                                        {form.errors.face_image}
                                    </p>
                                )}
                            </div>

                            {/* BUTTONS */}
                            <div className="flex gap-3 pt-2">
                                <Link
                                    href={backUrl}
                                    className="flex-1 text-center border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50"
                                >
                                    Back
                                </Link>

                                <button
                                    type="submit"
                                    disabled={form.processing || !capturedImage}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {form.processing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        'Submit'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />
            </div>
        </>
    );
}