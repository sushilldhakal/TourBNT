import mongoose from 'mongoose';
import TourModel from '../api/tours/tourModel';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Fix corrupted category data in tours
 * Converts category objects like {label: 'X', value: 'ID', disable: false} to just ObjectId
 */
async function fixCategoryData() {
    try {
        // Connect to database
        const mongoUri = process.env.MONGO_CONNECTION_STRING || process.env.MONGO_URI || 'mongodb://localhost:27017/tripbnt';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database');

        // Find all tours
        const tours = await TourModel.find({}).lean();
        console.log(`📊 Found ${tours.length} tours to check`);

        let fixedCount = 0;
        let errorCount = 0;

        for (const tour of tours) {
            try {
                let needsUpdate = false;
                const fixedCategories: mongoose.Types.ObjectId[] = [];

                if (tour.category && Array.isArray(tour.category)) {
                    for (const cat of tour.category) {
                        // Check if category is an object instead of ObjectId
                        if (typeof cat === 'object' && cat !== null && 'value' in cat) {
                            // Extract the ID from the object
                            const categoryId = (cat as any).value;
                            if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
                                fixedCategories.push(new mongoose.Types.ObjectId(categoryId));
                                needsUpdate = true;
                            } else {
                                console.warn(`⚠️  Invalid category ID in tour ${tour._id}: ${categoryId}`);
                            }
                        } else if (mongoose.Types.ObjectId.isValid(cat)) {
                            // Already a valid ObjectId, keep it
                            fixedCategories.push(new mongoose.Types.ObjectId(cat as any));
                        } else {
                            console.warn(`⚠️  Unknown category format in tour ${tour._id}:`, cat);
                        }
                    }

                    if (needsUpdate) {
                        // Update the tour with fixed categories
                        await TourModel.updateOne(
                            { _id: tour._id },
                            { $set: { category: fixedCategories } }
                        );
                        fixedCount++;
                        console.log(`✅ Fixed tour ${tour._id} - ${tour.title}`);
                    }
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ Error fixing tour ${tour._id}:`, error);
            }
        }

        console.log('\n📊 Summary:');
        console.log(`✅ Fixed: ${fixedCount} tours`);
        console.log(`❌ Errors: ${errorCount} tours`);
        console.log(`✓ Total checked: ${tours.length} tours`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from database');
    }
}

// Run the migration
fixCategoryData();
