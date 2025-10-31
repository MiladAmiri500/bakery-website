const fs = require('fs');
const mongoose = require('mongoose');
const Product = require('./models/product');
const Blog = require('./models/blog');

mongoose.connect('mongodb+srv://Milad:122122122Aa@cluster0.h6l6hvs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('Connected for migration');
        const productsData = JSON.parse(fs.readFileSync('./data/products.json', 'utf8'));
        await Product.insertMany(productsData);
        const blogsData = JSON.parse(fs.readFileSync('./data/blogs.json', 'utf8'));
        await Blog.insertMany(blogsData);
        console.log('Migration complete!');
        process.exit();
    })
    .catch(err => console.log('Error:', err));