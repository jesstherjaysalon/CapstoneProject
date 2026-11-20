<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $hasProfileId = Schema::hasColumn('job_orders', 'profile_id');
        $hasNewProfileId = Schema::hasColumn('job_orders', 'profile_id_new');

        if (!$hasProfileId && !$hasNewProfileId) {
            throw new RuntimeException('Neither job_orders.profile_id nor its temporary migration column exists.');
        }

        if ($hasProfileId && strtolower(Schema::getColumnType('job_orders', 'profile_id')) === 'json') {
            if ($hasNewProfileId) {
                throw new RuntimeException('Both the JSON profile_id and profile_id_new exist; refusing to discard either column.');
            }
            return;
        }

        if (!$hasNewProfileId) {
            Schema::table('job_orders', function (Blueprint $table) {
                $table->json('profile_id_new')->nullable();
            });
        }

        if ($hasProfileId) {
            DB::statement('UPDATE job_orders SET profile_id_new = JSON_ARRAY(profile_id) WHERE profile_id IS NOT NULL');

            $profileForeignKey = collect(Schema::getForeignKeys('job_orders'))
                ->first(fn ($foreignKey) => in_array('profile_id', $foreignKey['columns'], true));

            Schema::table('job_orders', function (Blueprint $table) use ($profileForeignKey) {
                if ($profileForeignKey) {
                    $table->dropForeign($profileForeignKey['name']);
                }
                $table->dropColumn('profile_id');
            });
        }

        if (!Schema::hasColumn('job_orders', 'profile_id')
            && Schema::hasColumn('job_orders', 'profile_id_new')) {
            Schema::table('job_orders', function (Blueprint $table) {
                $table->renameColumn('profile_id_new', 'profile_id');
            });
        }
    }

    public function down(): void
    {
        $hasProfileId = Schema::hasColumn('job_orders', 'profile_id');
        $hasTemporaryProfileId = Schema::hasColumn('job_orders', 'profile_id_temp');

        if ($hasProfileId && strtolower(Schema::getColumnType('job_orders', 'profile_id')) !== 'json') {
            $this->restoreProfileForeignKey();
            return;
        }

        if (!$hasProfileId && !$hasTemporaryProfileId) {
            throw new RuntimeException('Neither job_orders.profile_id nor its temporary rollback column exists.');
        }

        if ($hasProfileId) {
            if (!$hasTemporaryProfileId) {
                Schema::table('job_orders', function (Blueprint $table) {
                    $table->unsignedBigInteger('profile_id_temp')->nullable();
                });
            }

            DB::statement("UPDATE job_orders SET profile_id_temp = JSON_UNQUOTE(JSON_EXTRACT(profile_id, '$[0]')) WHERE profile_id IS NOT NULL");

            Schema::table('job_orders', function (Blueprint $table) {
                $table->dropColumn('profile_id');
            });
        }

        if (!Schema::hasColumn('job_orders', 'profile_id')
            && Schema::hasColumn('job_orders', 'profile_id_temp')) {
            Schema::table('job_orders', function (Blueprint $table) {
                $table->renameColumn('profile_id_temp', 'profile_id');
            });
        }

        $this->restoreProfileForeignKey();
    }

    private function restoreProfileForeignKey(): void
    {
        $hasProfileForeignKey = collect(Schema::getForeignKeys('job_orders'))
            ->contains(fn ($foreignKey) => in_array('profile_id', $foreignKey['columns'], true));

        if (!$hasProfileForeignKey) {
            Schema::table('job_orders', function (Blueprint $table) {
                $table->foreign('profile_id')->references('id')->on('profiles')->nullOnDelete();
            });
        }
    }
};
