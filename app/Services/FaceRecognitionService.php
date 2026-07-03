<?php

namespace App\Services;

use RuntimeException;
use Symfony\Component\Process\Process;
use Illuminate\Support\Facades\Config;

class FaceRecognitionService
{
    public function encodeFromPath(string $imagePath): array
    {
        if (! file_exists($imagePath) || ! is_readable($imagePath)) {
            throw new RuntimeException('Face image file is missing or unreadable.');
        }

        $python = $this->resolvePythonExecutable();
        $script = base_path('app/Services/FaceRecognition/face_encode.py');

        $process = new Process([$python, $script, $imagePath], base_path());
        $process->setTimeout(120);
        $process->run();

        $output = trim($process->getOutput());
        $errorOutput = trim($process->getErrorOutput());

        if (! $process->isSuccessful()) {
            $message = $errorOutput ?: $output ?: 'Face recognition process failed.';
            throw new RuntimeException($message);
        }

        try {
            $payload = json_decode($output, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            $message = 'Face recognition returned invalid JSON: '.$exception->getMessage();
            throw new RuntimeException($message);
        }

        if (! is_array($payload)) {
            throw new RuntimeException('Unexpected response from face recognition script.');
        }

        if (! array_key_exists('success', $payload)) {
            throw new RuntimeException('Face recognition response is missing success status.');
        }

        if ($payload['success'] !== true) {
            $message = $payload['message'] ?? 'Face recognition failed.';
            throw new RuntimeException($message);
        }

        if (! isset($payload['encoding']) || ! is_array($payload['encoding'])) {
            throw new RuntimeException('Face recognition did not return a valid encoding.');
        }

        // Return full payload including quality checks
        return $payload;
    }

    protected function resolvePythonExecutable(): string
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
