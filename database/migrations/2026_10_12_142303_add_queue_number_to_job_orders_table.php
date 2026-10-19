<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('job_orders', function (Blueprint $table) {
            $table->integer('queue_number')->nullable()->unique()->after('status');
            $table->integer('queue_priority')->default(0)->after('queue_number');
            $table->date('queue_date')->nullable()->after('queue_priority');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_orders', function (Blueprint $table) {
            $table->dropColumn(['queue_number', 'queue_priority', 'queue_date']);
        });
    }
};
