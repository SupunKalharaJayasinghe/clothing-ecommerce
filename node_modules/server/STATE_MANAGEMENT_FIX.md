# State Management Fix

## Problem
The order and payment state logic had several issues:
1. Inconsistent state assignments (e.g., COD orders using 'pending' instead of 'cod_pending')
2. Legacy status field enum constraints preventing new delivery states
3. No state transition validation
4. Manual state updates without centralized logic

## Solution
Implemented a comprehensive state management system with:
1. **Centralized State Manager** (`src/utils/stateManager.js`)
2. **Proper State Initialization** based on payment method
3. **State Transition Validation** preventing invalid changes
4. **Auto-close Logic** for completed orders
5. **Legacy Compatibility** maintaining backward compatibility

## Scripts Available

### Test State Management
```bash
npm run test:states
```
Tests the state management logic to ensure all transitions work correctly.

### Inspect Current Orders
```bash
npm run inspect:orders
```
Shows a sample of current orders and their states, plus statistics by payment method/status.

### Fix Existing Orders
```bash
npm run migrate:fix-orders
```
**⚠️ IMPORTANT**: Run this to fix existing orders with incorrect payment states.
This migration will:
- Fix COD orders: `pending` → `cod_pending`
- Fix CARD orders: ensure proper `initiated`/`paid` status
- Fix BANK orders: `pending` → `pending_verification` (when not verified)
- Update legacy status fields to match new state logic

## Steps to Fix Current Issues

1. **First, inspect current state**:
   ```bash
   npm run inspect:orders
   ```

2. **Run the migration** (if needed):
   ```bash
   npm run migrate:fix-orders
   ```

3. **Restart your server** - the validation errors should be resolved

## Key Changes Made

### Model Updates
- Expanded `Order.status` enum to include all delivery states
- All payment states properly defined in `payment.status` enum

### Controller Updates  
- All controllers now use the state manager for consistent updates
- Proper validation before state transitions
- Better error messages for dispatch validation

### State Manager Features
- `getInitialStates()` - Returns proper initial states by payment method
- `updateOrderStates()` - Validates and prepares state changes
- `applyStateChanges()` - Applies changes and syncs legacy status
- `validateDispatchRequirements()` - Checks dispatch requirements

## State Flow Examples

### COD Order
```
placed (cod_pending) → confirmed → dispatched → delivered → closed (cod_collected)
```

### Card Order  
```
placed (initiated) → [payment] → placed (paid) → dispatched → delivered → closed
```

### Bank Order
```
placed (pending_verification) → [admin verifies] → placed (paid) → dispatched → delivered → closed
```

## Troubleshooting

### "Invalid status" errors
- Run the migration: `npm run migrate:fix-orders`
- Check that the Order model has the expanded status enum

### Dispatch validation errors
- Ensure payment status is correct for the method:
  - COD: needs `cod_pending` or `cod_collected`
  - CARD: needs `paid` or `authorized`  
  - BANK: needs `paid`

### Server keeps restarting
- Stop the dev server
- Run the migration
- Restart the server

The state management system is now robust and will prevent invalid state transitions while maintaining backward compatibility.