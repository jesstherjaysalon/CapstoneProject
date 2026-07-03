<?php

namespace App\Services;

use RuntimeException;
use Symfony\Component\Process\Process;
use Illuminate\Support\Facades\Config;

class FaceVerificationService
{
    public function verifyFace(string $imagePath, string $storedEncodingJsonPath): array
    {
        \Log::info('Face verification service - paths', [
            'imagePath' => $imagePath,
            'storedEncodingJsonPath' => $storedEncodingJsonPath,
        ]);

        if (! is_file($imagePath) || ! is_readable($imagePath)) {
            \Log::error('Captured face image check failed', [
                'is_file' => is_file($imagePath),
                'is_readable' => is_readable($imagePath),
            ]);
            throw new RuntimeException('Captured face image is not available for verification.');
        }

        if (! is_file($storedEncodingJsonPath) || ! is_readable($storedEncodingJsonPath)) {
            \Log::error('Stored encoding file check failed', [
                'is_file' => is_file($storedEncodingJsonPath),
                'is_readable' => is_readable($storedEncodingJsonPath),
                'path_exists' => file_exists($storedEncodingJsonPath),
            ]);
            throw new RuntimeException('Stored face encoding is not available for verification.');
        }

        $python = $this->resolvePythonExecutable();
        $script = base_path('app/Services/FaceRecognition/verify_face.py');

        $process = new Process([$python, $script, $imagePath, $storedEncodingJsonPath], base_path());
        $process->setTimeout(120);
        $process->run();

        $output = trim($process->getOutput());
        $errorOutput = trim($process->getErrorOutput());

        if (! $process->isSuccessful()) {
            $message = $errorOutput ?: $output ?: 'Face verification process failed.';
            throw new RuntimeException($message);
        }

        try {
            $result = json_decode($output, true, 512, JSON_THROW_ON_ERROR);
            
            // Ensure confidence is present for UI
            if (!isset($result['confidence']) && isset($result['score'])) {
                $result['confidence'] = $result['score'] * 100;
            }
            
            return $result;
        } catch (\JsonException $exception) {
            throw new RuntimeException('Face verification returned invalid JSON: ' . $exception->getMessage());
        }
    }

    public function resolvePythonExecutable(): string
    {
        $preferred = Config::get('services.face_recognition.python_path');
        $candidates = array_filter(array_unique([
            $preferred,
            'python',
            'py',
        ]));

        foreach ($candidates as $candidate) {
            if (! $candidate) {
                continue;
            }

            try {
                $process = new Process([$candidate, '--version']);
                $process->run();

                if ($process->isSuccessful()) {
                    return $candidate;
                }
            } catch (\Throwable $e) {
                // Try next candidate.
            }
        }

        throw new RuntimeException(
            'Python interpreter not found. Install Python and add `python` or `py` to your PATH, ' .
            'or set PYTHON_PATH in your .env to the full executable path.'
        );
    }
}
