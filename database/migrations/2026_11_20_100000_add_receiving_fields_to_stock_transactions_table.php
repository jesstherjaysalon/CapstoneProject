<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_transactions', function (Blueprint $table) {
            $table->uuid('receipt_id')->nullable()->index();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference_number')->nullable();
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->decimal('total_cost', 12, 2)->nullable();
            $table->string('status')->default('confirmed');
            $table->timestamp('confirmed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('stock_transactions', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropIndex(['receipt_id']);
            $table->dropColumn([
                'receipt_id',
                'supplier_id',
                'reference_number',
                'unit_cost',
                'total_cost',
                'status',
                'confirmed_at',
            ]);
        });
    }
};
