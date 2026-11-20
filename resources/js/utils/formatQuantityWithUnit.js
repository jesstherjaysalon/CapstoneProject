export default function formatQuantityWithUnit(quantity, unit) {
    const unitLabel = String(unit || '').trim();
    if (!unitLabel) return String(quantity);

    const normalizedUnit = unitLabel.toLowerCase();
    if (normalizedUnit === 'pc' || normalizedUnit === 'pcs') {
        return `${quantity} ${Number(quantity) === 1 ? 'pc' : 'pcs'}`;
    }
    if (normalizedUnit === 'piece' || normalizedUnit === 'pieces') {
        return `${quantity} ${Number(quantity) === 1 ? 'piece' : 'pieces'}`;
    }

    return `${quantity} ${unitLabel}`;
}
