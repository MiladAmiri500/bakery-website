const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    image: { type: String },  // URL for category image (used on categories page and home)
    description: { type: String }  // Short description (used on categories page and home)
});

module.exports = mongoose.model('Category', categorySchema);