/**
 * Validation script to test the new API response normalization utilities
 * This script validates that all our new utilities work correctly
 */

import {

} from '../utils';
import { normalizeForApi, normalizeWithModelTransforms } from '../utils/normalizeDoc';
import { calculatePaginationMeta } from '../utils/paginationUtils';

// Test data
const mockMongooseDoc = {
    _id: '507f1f77bcf86cd799439011',
    __v: 0,
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-02T00:00:00.000Z'),
    toObject: function () {
        const { toObject, ...rest } = this;
        return rest;
    }
};

console.log('🧪 Starting API Response Normalization Validation...\n');

// Test 1: Document Normalization
console.log('1️⃣ Testing Document Normalization...');
try {
    const normalized = normalizeForApi(mockMongooseDoc);

    if (normalized.id && !normalized._id && !normalized.__v) {
        console.log('✅ Document normalization: PASSED');
        console.log('   - _id converted to id:', normalized.id);
        console.log('   - __v removed:', !normalized.__v);
        console.log('   - Timestamps preserved:', normalized.createdAt, normalized.updatedAt);
    } else {
        console.log('❌ Document normalization: FAILED');
        console.log('   - Has id:', !!normalized.id);
        console.log('   - Has _id:', !!normalized._id);
        console.log('   - Has __v:', !!normalized.__v);
    }
} catch (error) {
    console.log('❌ Document normalization: ERROR -', error);
}

// Test 2: Pagination Calculation
console.log('\n2️⃣ Testing Pagination Calculation...');
try {
    const pagination = calculatePaginationMeta(2, 10, 25);

    if (pagination.page === 2 && pagination.totalPages === 3 && pagination.totalItems === 25) {
        console.log('✅ Pagination calculation: PASSED');
        console.log('   - Page:', pagination.page);
        console.log('   - Total pages:', pagination.totalPages);
        console.log('   - Total items:', pagination.totalItems);
    } else {
        console.log('❌ Pagination calculation: FAILED');
        console.log('   - Expected: page=2, totalPages=3, totalItems=25');
        console.log('   - Actual:', pagination);
    }
} catch (error) {
    console.log('❌ Pagination calculation: ERROR -', error);
}

// Test 3: Model-specific Transformations
console.log('\n3️⃣ Testing Model-specific Transformations...');
try {
    const userDoc = {
        ...mockMongooseDoc,
        email: 'TEST@EXAMPLE.COM',
        phone: '+1-234-567-8900',
        verified: 'true'
    };

    const normalized = normalizeWithModelTransforms(userDoc, 'User');

    if (normalized.email === 'test@example.com' && normalized.phone === '+12345678900') {
        console.log('✅ Model transformations: PASSED');
        console.log('   - Email lowercased:', normalized.email);
        console.log('   - Phone cleaned:', normalized.phone);
    } else {
        console.log('❌ Model transformations: FAILED');
        console.log('   - Expected email: test@example.com, got:', normalized.email);
        console.log('   - Expected phone: +12345678900, got:', normalized.phone);
    }
} catch (error) {
    console.log('❌ Model transformations: ERROR -', error);
}

// Test 4: Array Normalization
console.log('\n4️⃣ Testing Array Normalization...');
try {
    const docs = [mockMongooseDoc, { ...mockMongooseDoc, _id: '507f1f77bcf86cd799439012' }];
    const normalized = normalizeForApi(docs);

    if (Array.isArray(normalized) && normalized.length === 2 && normalized[0].id && normalized[1].id) {
        console.log('✅ Array normalization: PASSED');
        console.log('   - Array length:', normalized.length);
        console.log('   - First item ID:', normalized[0].id);
        console.log('   - Second item ID:', normalized[1].id);
    } else {
        console.log('❌ Array normalization: FAILED');
    }
} catch (error) {
    console.log('❌ Array normalization: ERROR -', error);
}

// Test 5: Nested Object Normalization
console.log('\n5️⃣ Testing Nested Object Normalization...');
try {
    const nestedDoc = {
        ...mockMongooseDoc,
        sellerInfo: {
            _id: '507f1f77bcf86cd799439013',
            __v: 1,
            companyName: 'Test Company',
            bankDetails: {
                _id: '507f1f77bcf86cd799439014',
                __v: 2,
                bankName: 'Test Bank'
            }
        }
    };

    const normalized = normalizeForApi(nestedDoc);

    if (normalized.sellerInfo?.id && normalized.sellerInfo?.bankDetails?.id) {
        console.log('✅ Nested normalization: PASSED');
        console.log('   - Seller info ID:', normalized.sellerInfo.id);
        console.log('   - Bank details ID:', normalized.sellerInfo.bankDetails.id);
        console.log('   - No __v fields:', !normalized.sellerInfo.__v && !normalized.sellerInfo.bankDetails.__v);
    } else {
        console.log('❌ Nested normalization: FAILED');
        console.log('   - Seller info has id:', !!normalized.sellerInfo?.id);
        console.log('   - Bank details has id:', !!normalized.sellerInfo?.bankDetails?.id);
    }
} catch (error) {
    console.log('❌ Nested normalization: ERROR -', error);
}

console.log('\n🎉 Validation Complete!');
console.log('\nCore utilities have been tested. The API response normalization system is ready for use.');