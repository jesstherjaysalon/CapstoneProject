<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\FaceData;

class NormalizeFaceEncodings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'normalize:face-encodings';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Normalize face_encoding values in face_data to proper JSON arrays';

    public function handle(): int
    {
        $this->info('Starting normalization of face encodings...');

        $total = 0;
            $count = FaceData::count();
            $this->info("Found face_data rows: {$count}");
        $updated = 0;

        FaceData::chunk(100, function ($rows) use (&$total, &$updated) {
            foreach ($rows as $row) {
                $total++;

                $raw = $row->getAttributes()['face_encoding'] ?? null;
                if ($raw === null) {
                    continue;
                }

                $normalized = null;

                if (is_array($raw)) {
                    $normalized = $raw;
                } elseif (is_string($raw)) {
                    $decoded = json_decode($raw, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $normalized = $decoded;
                    } else {
                        $stripped = stripslashes($raw);
                        $decoded = json_decode($stripped, true);
                        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                            $normalized = $decoded;
                        } else {
                            $trimmed = trim($raw, "'\"");
                            $decoded = json_decode($trimmed, true);
                            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                                $normalized = $decoded;
                            }
                        }
                    }
                }

                if (is_array($normalized)) {
                    // Only update if different to avoid touching timestamps
                    $current = $row->face_encoding;
                    if ($current !== $normalized) {
                        $row->forceFill(['face_encoding' => $normalized])->save();
                        $updated++;
                        $this->line("Updated face_data id={$row->id}");
                    }
                }
            }
        });

        $this->info("Done. Processed: {$total}. Updated: {$updated}.");

        return 0;
    }
}
