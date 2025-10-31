const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    images: [{ type: String, required: true }],  // Array for multi-images; first is main
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    description: { type: String },
    features: [String],
    unit: { type: String, enum: ['kg', 'lb', 'quantity'], default: 'quantity' },  // New field
    ratings: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    reviews: [{
        user: String,
        comment: String,
        rating: Number,
        date: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('Product', productSchema);