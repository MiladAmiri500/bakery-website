const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },  // Markdown/HTML for embeds
    image: { type: String, required: true },
    date: { type: Date, default: Date.now },
    toc: [String],  // Array for table of contents links
    embeds: [{ type: String }]  // URLs for images/videos/links
});

module.exports = mongoose.model('Blog', blogSchema);