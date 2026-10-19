<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create a new JSON column
        Schema::table('job_orders', function (Blueprint $table) {
            $table->json('profile_id_new')->nullable();
        });

        // Migrate existing single profile_id values to JSON array format
        DB::statement('UPDATE job_orders SET profile_id_new = JSON_ARRAY(profile_id) WHERE profile_id IS NOT NULL');

        // Drop the old column
        Schema::table('job_orders', function (Blueprint $table) {
            $table->dropColumn('profile_id');
        });

        // Rename the new column to profile_id
        Schema::table('job_orders', function (Blueprint $table) {
            $table->renameColumn('profile_id_new', 'profile_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Create a temporary column to hold the integer data
        Schema::table('job_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('profile_id_temp')->nullable();
        });

        // Migrate JSON array back to single value (take first element)
        DB::statement('UPDATE job_orders SET profile_id_temp = JSON_UNQUOTE(JSON_EXTRACT(profile_id, "$[0]")) WHERE profile_id IS NOT NULL');

        // Drop the old JSON column
        Schema::table('job_orders', function (Blueprint $table) {
            $table->dropColumn('profile_id');
        });

        // Rename the temp column to profile_id
        Schema::table('job_orders', function (Blueprint $table) {
            $table->renameColumn('profile_id_temp', 'profile_id');
        });

        // Add foreign key constraint back
        Schema::table('job_orders', function (Blueprint $table) {
            $table->foreign('profile_id')->references('id')->on('profiles')->nullOnDelete();
        });
    }
};
