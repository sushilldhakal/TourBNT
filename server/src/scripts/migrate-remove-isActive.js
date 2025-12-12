/**
 * Migration script to remove isActive field from all GlobalCategory documents
 * Run this once to clean up existing data after removing isActive from the model
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migration function
const removeIsActiveField = async () => {
  try {
    console.log('🔄 Starting migration: Removing isActive field from GlobalCategory collection...');
    
    // Remove isActive field from all documents in GlobalCategory collection
    const result = await mongoose.connection.db.collection('globalcategories').updateMany(
      {}, // Match all documents
      { $unset: { isActive: "" } } // Remove the isActive field
    );
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Documents modified: ${result.modifiedCount}`);
    console.log(`📊 Documents matched: ${result.matchedCount}`);
    
    // Verify the migration
    const sampleDoc = await mongoose.connection.db.collection('globalcategories').findOne({});
    console.log('📋 Sample document after migration:');
    console.log(JSON.stringify(sampleDoc, null, 2));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Main execution
const runMigration = async () => {
  try {
    await connectDB();
    await removeIsActiveField();
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the migration
runMigration();
