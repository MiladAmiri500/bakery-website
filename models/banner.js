const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    type: { type: String, required: true },  // 'hero' or 'side'
    image: { type: String, required: true },
    title: { type: String },
    text: { type: String },
    link: { type: String }  // URL to click (e.g., /product/id)
});

module.exports = mongoose.model('Banner', bannerSchema);