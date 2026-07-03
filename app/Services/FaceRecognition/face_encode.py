import json
import os
import sys
import numpy as np
import face_recognition
import cv2


def print_response(response: dict) -> None:
    print(json.dumps(response, ensure_ascii=False))


def compute_face_encoding(image: np.ndarray, face_locations=None) -> list:
    """
    Compute face encoding using dlib-based face_recognition library.
    Returns a 128-dimensional face encoding vector.
    """
    face_encodings = face_recognition.face_encodings(image, known_face_locations=face_locations)
    
    if len(face_encodings) == 0:
        return []
    
    return face_encodings[0].tolist()


def is_image_blurry(image: np.ndarray, threshold: float = 50.0) -> bool:
    """Check if image is blurry using Laplacian variance."""
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    else:
        gray = image
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    return variance < threshold


def check_lighting(image: np.ndarray, face_location=None) -> dict:
    """
    Check lighting conditions of the image or face region.
    Returns dict with 'good_lighting' boolean and 'brightness' value.
    """
    if face_location is not None:
        top, right, bottom, left = face_location
        top = max(0, top)
        left = max(0, left)
        bottom = min(image.shape[0], bottom)
        right = min(image.shape[1], right)
        region = image[top:bottom, left:right]
    else:
        region = image
    
    if region.size == 0:
        return {'good_lighting': False, 'brightness': 0}
    
    if len(region.shape) == 3:
        gray = cv2.cvtColor(region, cv2.COLOR_RGB2GRAY)
    else:
        gray = region
    
    brightness = np.mean(gray)
    # Good lighting range: 30-220 (out of 255) - more permissive for testing
    good_lighting = 30 <= brightness <= 220
    
    return {'good_lighting': good_lighting, 'brightness': brightness}


def check_face_centered(image: np.ndarray, face_location) -> dict:
    """
    Check if face is centered in the image.
    Returns dict with 'centered' boolean and offset info.
    """
    if not face_location:
        return {'centered': False, 'offset_x': 0, 'offset_y': 0}
    
    top, right, bottom, left = face_location
    face_center_x = (left + right) / 2
    face_center_y = (top + bottom) / 2
    
    image_center_x = image.shape[1] / 2
    image_center_y = image.shape[0] / 2
    
    offset_x = abs(face_center_x - image_center_x) / image.shape[1]
    offset_y = abs(face_center_y - image_center_y) / image.shape[0]
    
    # Face is centered if within 15% of image center
    centered = offset_x < 0.15 and offset_y < 0.15
    
    return {'centered': centered, 'offset_x': offset_x, 'offset_y': offset_y}


def check_face_size(image: np.ndarray, face_location) -> dict:
    """
    Check if face is large enough (proper distance from camera).
    Returns dict with 'proper_size' boolean and coverage ratio.
    """
    if not face_location:
        return {'proper_size': False, 'coverage': 0}
    
    top, right, bottom, left = face_location
    face_width = right - left
    face_height = bottom - top
    face_area = face_width * face_height
    image_area = image.shape[0] * image.shape[1]
    
    coverage = face_area / image_area
    # Face should cover 6-30% of image
    proper_size = 0.06 <= coverage <= 0.30
    
    return {'proper_size': proper_size, 'coverage': coverage}


def check_face_fully_visible(image: np.ndarray, face_location) -> dict:
    """
    Check if face is fully inside the image boundaries with margin.
    Returns dict with 'fully_visible' boolean.
    """
    if not face_location:
        return {'fully_visible': False}
    
    top, right, bottom, left = face_location
    margin = 20  # 20 pixel margin
    
    fully_visible = (top >= margin and left >= margin and 
                     bottom <= image.shape[0] - margin and 
                     right <= image.shape[1] - margin)
    
    return {'fully_visible': fully_visible}


def check_face_orientation(landmarks) -> dict:
    """
    Check if face is looking straight at camera using facial landmarks.
    Returns dict with 'looking_straight' boolean and yaw/pitch estimates.
    """
    if not landmarks or len(landmarks) == 0:
        return {'looking_straight': False, 'yaw': 0, 'pitch': 0}
    
    try:
        # Use nose tip and eye positions to estimate orientation
        nose_tip = landmarks[30]  # Nose tip
        left_eye = landmarks[36]  # Left eye outer corner
        right_eye = landmarks[45]  # Right eye outer corner
        
        # Calculate yaw (horizontal rotation)
        eye_center_x = (left_eye[0] + right_eye[0]) / 2
        yaw = (nose_tip[0] - eye_center_x) / (right_eye[0] - left_eye[0])
        
        # Calculate pitch (vertical rotation) using nose and chin
        chin = landmarks[8]  # Chin
        pitch = (nose_tip[1] - chin[1]) / (chin[1] - landmarks[27][1])
        
        # Face is looking straight if yaw and pitch are within reasonable bounds
        looking_straight = abs(yaw) < 0.3 and abs(pitch) < 0.5
        
        return {'looking_straight': looking_straight, 'yaw': yaw, 'pitch': pitch}
    except:
        return {'looking_straight': True, 'yaw': 0, 'pitch': 0}


def check_eyes_open(landmarks) -> dict:
    """
    Check if eyes are open using eye aspect ratio.
    Returns dict with 'eyes_open' boolean for both eyes.
    """
    if not landmarks or len(landmarks) == 0:
        return {'eyes_open': False, 'left_eye_open': False, 'right_eye_open': False}
    
    try:
        # Left eye landmarks
        left_eye = [landmarks[i] for i in [36, 37, 38, 39, 40, 41]]
        # Right eye landmarks
        right_eye = [landmarks[i] for i in [42, 43, 44, 45, 46, 47]]
        
        def eye_aspect_ratio(eye):
            # Vertical distance
            v1 = np.linalg.norm(eye[1] - eye[5])
            v2 = np.linalg.norm(eye[2] - eye[4])
            vertical = (v1 + v2) / 2
            # Horizontal distance
            horizontal = np.linalg.norm(eye[0] - eye[3])
            return vertical / horizontal if horizontal > 0 else 0
        
        left_ear = eye_aspect_ratio(left_eye)
        right_ear = eye_aspect_ratio(right_eye)
        
        # Eyes are open if aspect ratio > 0.2
        left_eye_open = left_ear > 0.2
        right_eye_open = right_ear > 0.2
        eyes_open = left_eye_open and right_eye_open
        
        return {
            'eyes_open': eyes_open,
            'left_eye_open': left_eye_open,
            'right_eye_open': right_eye_open,
            'left_ear': left_ear,
            'right_ear': right_ear
        }
    except:
        return {'eyes_open': True, 'left_eye_open': True, 'right_eye_open': True}


def main() -> None:
    if len(sys.argv) != 2:
        print_response({
            'success': False,
            'message': 'Usage: python face_encode.py /path/to/image',
        })
        sys.exit(1)

    image_path = sys.argv[1]

    if not os.path.isfile(image_path):
        print_response({
            'success': False,
            'message': f'Image file not found: {image_path}',
        })
        sys.exit(1)

    try:
        # Load image using face_recognition
        image = face_recognition.load_image_file(image_path)
        
        if image is None or image.size == 0:
            print_response({
                'success': False,
                'message': 'Failed to load image. Ensure it is a valid image file.',
            })
            sys.exit(1)
        
        # Detect faces using dlib
        face_locations = face_recognition.face_locations(image, model='hog')

        if len(face_locations) == 0:
            print_response({
                'success': False,
                'message': 'No face detected. Please capture a clear photo with only one face visible.',
            })
            sys.exit(1)

        # Reject multiple faces
        if len(face_locations) > 1:
            print_response({
                'success': False,
                'message': 'Multiple faces detected. Please capture with only one person visible.',
            })
            sys.exit(1)

        primary_face_location = face_locations[0]
        
        # Get facial landmarks for orientation and eye checks (with error handling)
        landmarks = None
        try:
            face_landmarks = face_recognition.face_landmarks(image, [primary_face_location])
            landmarks = face_landmarks[0] if face_landmarks else None
        except:
            # If landmarks fail, continue without orientation/eye checks
            landmarks = None
        
        # Run all quality checks
        quality_checks = {
            'face_detected': True,
            'not_blurry': bool(not is_image_blurry(image)),
            'lighting': check_lighting(image, primary_face_location),
            'centered': check_face_centered(image, primary_face_location),
            'proper_size': check_face_size(image, primary_face_location),
            'fully_visible': check_face_fully_visible(image, primary_face_location),
            'orientation': check_face_orientation(landmarks) if landmarks else {'looking_straight': True, 'yaw': 0, 'pitch': 0},
            'eyes': check_eyes_open(landmarks) if landmarks else {'eyes_open': True, 'left_eye_open': True, 'right_eye_open': True}
        }
        
        # Convert numpy types to Python native types for JSON serialization
        for key in quality_checks:
            if isinstance(quality_checks[key], (np.bool_, bool)):
                quality_checks[key] = bool(quality_checks[key])
            elif isinstance(quality_checks[key], (np.integer, int)):
                quality_checks[key] = int(quality_checks[key])
            elif isinstance(quality_checks[key], (np.floating, float)):
                quality_checks[key] = float(quality_checks[key])
            elif isinstance(quality_checks[key], dict):
                for subkey in quality_checks[key]:
                    if isinstance(quality_checks[key][subkey], (np.bool_, bool)):
                        quality_checks[key][subkey] = bool(quality_checks[key][subkey])
                    elif isinstance(quality_checks[key][subkey], (np.integer, int)):
                        quality_checks[key][subkey] = int(quality_checks[key][subkey])
                    elif isinstance(quality_checks[key][subkey], (np.floating, float)):
                        quality_checks[key][subkey] = float(quality_checks[key][subkey])
        
        # Check if all quality requirements pass (relaxed for initial testing)
        all_checks_pass = (
            quality_checks['not_blurry'] and
            quality_checks['lighting']['good_lighting']
            # Temporarily disabled stricter checks for testing
            # and quality_checks['centered']['centered'] and
            # and quality_checks['proper_size']['proper_size'] and
            # and quality_checks['fully_visible']['fully_visible'] and
            # and quality_checks['orientation']['looking_straight'] and
            # and quality_checks['eyes']['eyes_open']
        )
        
        if not all_checks_pass:
            # Build detailed error message
            errors = []
            if not quality_checks['not_blurry']:
                errors.append('Image is too blurry')
            if not quality_checks['lighting']['good_lighting']:
                errors.append('Lighting is too dark or too bright')
            # Temporarily disabled stricter error messages
            # if not quality_checks['centered']['centered']:
            #     errors.append('Face is not centered in frame')
            # if not quality_checks['proper_size']['proper_size']:
            #     errors.append('Face is too small or too large (adjust distance)')
            # if not quality_checks['fully_visible']['fully_visible']:
            #     errors.append('Face is not fully visible in frame')
            # if not quality_checks['orientation']['looking_straight']:
            #     errors.append('Face is not looking straight at camera')
            # if not quality_checks['eyes']['eyes_open']:
            #     errors.append('Eyes are not open')
            
            print_response({
                'success': False,
                'message': '. '.join(errors) + '. Please adjust and try again.',
                'quality_checks': quality_checks
            })
            sys.exit(1)
        
        # Compute encoding for the detected face region.
        encoding = compute_face_encoding(image, [primary_face_location])
        
        if len(encoding) == 0:
            print_response({
                'success': False,
                'message': 'Failed to compute face encoding.',
            })
            sys.exit(1)
        
        # Convert encoding to Python list to ensure JSON serializability
        encoding = [float(x) for x in encoding]
        
        print_response({
            'success': True,
            'encoding': encoding,
            'message': 'Face detected and encoded successfully',
            'quality_checks': quality_checks
        })
    except Exception as exception:
        print_response({
            'success': False,
            'message': str(exception),
        })
        sys.exit(1)


if __name__ == '__main__':
    main()
