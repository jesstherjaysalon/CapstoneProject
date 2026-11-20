<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->enum('status', ['pending', 'accepted', 'assigned', 'rejected', 'completed', 'cancelled'])
                ->default('pending')
                ->change();
            $table->decimal('cancellation_paid_amount', 10, 2)->nullable();
            $table->decimal('cancellation_fee', 10, 2)->nullable();
            $table->decimal('refund_amount', 10, 2)->nullable();
            $table->timestamp('cancelled_at')->nullable();
        });
    }

    public function down(): void
    {
        DB::table('bookings')
            ->where('status', 'cancelled')
            ->update(['status' => 'rejected']);

        Schema::table('bookings', function (Blueprint $table) {
            $table->enum('status', ['pending', 'accepted', 'assigned', 'rejected', 'completed'])
                ->default('pending')
                ->change();
            $table->dropColumn([
                'cancellation_paid_amount',
                'cancellation_fee',
                'refund_amount',
                'cancelled_at',
            ]);
        });
    }
};
