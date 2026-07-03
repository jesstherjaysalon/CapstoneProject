import json
import os
import sys
import numpy as np
import face_recognition
import cv2

THRESHOLD = 0.40  # Stricter threshold for better security (lower = more strict)


def print_response(response: dict) -> None:
    print(json.dumps(response, ensure_ascii=False))


def normalize_encoding(encoding) -> np.ndarray:
    """Normalize stored or captured encoding to a float vector."""
    if isinstance(encoding, np.ndarray):
        vector = encoding
    else:
        try:
            vector = np.asarray(encoding, dtype=np.float64)
        except Exception:
            return np.array([], dtype=np.float64)

    if vector.ndim != 1 or vector.shape[0] != 128:
        return np.array([], dtype=np.float64)

    return vector


def compute_face_encoding(image: np.ndarray, face_locations=None) -> list:
    """Compute face encoding using dlib-based face_recognition."""
    face_encodings = face_recognition.face_encodings(image, known_face_locations=face_locations)
    
    if len(face_encodings) == 0:
        return []
    
    return face_encodings[0].tolist()


def compute_distance(known_encoding: list, unknown_encoding: list) -> float:
    """Compute Euclidean distance between two face encodings."""
    known_vector = normalize_encoding(known_encoding)
    unknown_vector = normalize_encoding(unknown_encoding)

    if known_vector.size != 128 or unknown_vector.size != 128:
        return float('inf')

    return float(np.linalg.norm(known_vector - unknown_vector))


def is_match(known_encoding: list, unknown_encoding: list, tolerance: float = THRESHOLD) -> bool:
    """Check whether the unknown encoding matches the known encoding."""
    known_vector = normalize_encoding(known_encoding)
    unknown_vector = normalize_encoding(unknown_encoding)

    if known_vector.size != 128 or unknown_vector.size != 128:
        return False

    try:
        matches = face_recognition.compare_faces([known_vector], unknown_vector, tolerance=tolerance)
    except Exception:
        return False

    return bool(matches[0])


def compute_similarity_from_distance(distance: float) -> float:
    """Convert a Euclidean distance into a normalized similarity score."""
    if not np.isfinite(distance):
        return 0.0
    # Adjusted for stricter threshold (0.4): distance of 0.4 = 50% match, distance of 0.2 = 75% match
    similarity = max(0.0, 1.0 - (distance / 0.8))
    return float(min(1.0, similarity))


def is_image_blurry(image: np.ndarray, face_location=None, threshold: float = 100.0) -> bool:
    """Check if image or face crop is blurry using Laplacian variance."""
    if face_location is not None:
        top, right, bottom, left = face_location
        top = max(0, top)
        left = max(0, left)
        bottom = min(image.shape[0], bottom)
        right = min(image.shape[1], right)
        image = image[top:bottom, left:right]

    if image.size == 0:
        return True

    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    else:
        gray = image

    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    return variance < threshold


def is_face_large_enough(image: np.ndarray, top: int, right: int, bottom: int, left: int, min_ratio: float = 0.06) -> bool:
    """Check if face is large enough relative to image size."""
    total_area = image.shape[0] * image.shape[1]
    face_width = right - left
    face_height = bottom - top
    face_area = face_width * face_height
    return face_area >= total_area * min_ratio


def check_lighting(image: np.ndarray, face_location=None) -> dict:
    """Check lighting conditions."""
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
    good_lighting = 50 <= brightness <= 200
    
    return {'good_lighting': good_lighting, 'brightness': brightness}


def main() -> None:
    if len(sys.argv) != 3:
        print_response({
            'verified': False,
            'message': 'Usage: python verify_face.py /path/to/image /path/to/encoding.json',
        })
        sys.exit(1)

    image_path = sys.argv[1]
    encoding_path = sys.argv[2]

    if not os.path.isfile(image_path):
        print_response({
            'verified': False,
            'message': f'Captured image not found: {image_path}',
        })
        sys.exit(1)

    if not os.path.isfile(encoding_path):
        print_response({
            'verified': False,
            'message': f'Stored encoding file not found: {encoding_path}',
        })
        sys.exit(1)

    try:
        with open(encoding_path, 'r', encoding='utf-8') as file:
            stored_encoding = json.load(file)
    except Exception as exception:
        print_response({
            'verified': False,
            'message': f'Unable to read stored encoding: {exception}',
        })
        sys.exit(1)

    if not isinstance(stored_encoding, list) or len(stored_encoding) == 0:
        print_response({
            'verified': False,
            'message': 'Stored face encoding is invalid.',
        })
        sys.exit(1)

    try:
        image = face_recognition.load_image_file(image_path)
    except Exception as exception:
        print_response({
            'verified': False,
            'message': f'Failed to load captured image: {exception}',
        })
        sys.exit(1)

    if image is None or image.size == 0:
        print_response({
            'verified': False,
            'message': 'Failed to load captured image. Please try again.',
        })
        sys.exit(1)

    # Blur check removed for verification - focus on matching, not quality
    # if is_image_blurry(image, threshold=100.0):
    #     print_response({
    #         'verified': False,
    #         'score': 0.0,
    #         'confidence': 0.0,
    #         'message': 'Captured image is too blurry. Please retake with a sharper photo.',
    #     })
    #     sys.exit(1)

    face_locations = face_recognition.face_locations(image, model='hog')

    if len(face_locations) == 0:
        print_response({
            'verified': False,
            'score': 0.0,
            'confidence': 0.0,
            'message': 'No face detected in the captured image. Please ensure your face is fully visible.',
        })
        sys.exit(1)

    # Reject multiple faces
    if len(face_locations) > 1:
        print_response({
            'verified': False,
            'score': 0.0,
            'confidence': 0.0,
            'message': 'Multiple faces detected in the captured image. Please retake with only one person visible.',
        })
        sys.exit(1)

    # Quality checks removed for verification - focus on matching, not quality
    # Face size, lighting, and blur checks are only for registration (face_encode.py)

    captured_encoding = compute_face_encoding(image, [face_locations[0]])

    if len(captured_encoding) == 0:
        print_response({
            'verified': False,
            'score': 0.0,
            'confidence': 0.0,
            'message': 'Failed to compute face encoding.',
        })
        sys.exit(1)

    distance = compute_distance(stored_encoding, captured_encoding)
    score = compute_similarity_from_distance(distance)
    verified = distance <= THRESHOLD

    print_response({
        'verified': bool(verified),
        'score': float(score),
        'confidence': float(score * 100),  # Percentage for UI
        'threshold': float(THRESHOLD),
        'distance': float(distance),
        'message': 'Identity Verified' if verified else 'Face does not match the registered account.',
    })


if __name__ == '__main__':
    main()
