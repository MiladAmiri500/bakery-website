require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/product');
const Blog = require('./models/blog');
const Category = require('./models/category');
const express = require('express');
const path = require('path'); // Built-in Node.js module for file reading/writing
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Banner = require('./models/banner');
const User = require('./models/user');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const app = express();
const port = process.env.PORT || 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Parse form data
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'freshcart-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
    sameSite: 'lax'
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.locals.user = req.user || null;  // Passport sets req.user
    next();
});

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Local strategy
passport.use(new LocalStrategy({
    usernameField: 'email'
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ email });
        if (!user) return done(null, false, { message: 'Invalid email or password' });
        if (user.googleId) return done(null, false, { message: 'Please login with Google' });
        if (!await user.comparePassword(password)) return done(null, false, { message: 'Invalid email or password' });
        return done(null, user);
    } catch (err) {
        done(err);
    }
}));

// Google strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
                user.googleId = profile.id;
                await user.save();
            } else {
                user = new User({ googleId: profile.id, email: profile.emails[0].value, role: 'user' });
                await user.save();
            }
        }
        done(null, user);
    } catch (err) {
        done(err);
    }
}));



mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Milad:122122122Aa@cluster0.h6l6hvs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB error:', err));

// Middleware for user auth
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
}

// Middleware for admin auth
function isAdminAuthenticated(req, res, next) {
    if (req.user && req.user.role === 'admin') return next();
    res.redirect('/admin/login');
}

// Middleware to add nestedCategories
async function addNestedCategories(req, res, next) {
    const topCategories = await Category.find({ parent: null });
    res.locals.nestedCategories = await Promise.all(topCategories.map(async (cat) => {
        const subs = await Category.find({ parent: cat._id });
        return { ...cat.toObject(), subcategories: subs };
    }));
    next();
}

// Login page
app.get('/login', (req, res) => {
    res.render('login', { error: req.session.error });
    delete req.session.error;
});

app.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
    failureMessage: true
}), (req, res) => {
    req.session.cart = req.user.cart || [];
    req.session.wishlist = req.user.wishlist || [];
    const redirectTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectTo);
});

// Signup page
app.get('/signup', (req, res) => {
    res.render('signup', { error: req.session.error });
    delete req.session.error;
});

app.post('/signup', async (req, res) => {
    const { email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
        req.session.error = 'Passwords do not match';
        return res.redirect('/signup');
    }
    try {
        const existing = await User.findOne({ email });
        if (existing) {
            req.session.error = 'User already exists';
            return res.redirect('/signup');
        }
        const newUser = new User({ email, password, role: 'user' });
        await newUser.save();
        req.login(newUser, (err) => {
            if (err) {
                req.session.error = 'Error during login after signup';
                return res.redirect('/signup');
            }
            res.redirect('/');  // Redirect to home after signup
        });
    } catch (err) {
        console.error('Signup error:', err);
        req.session.error = 'Failed signing up. Please try again.';
        res.redirect('/signup');
    }
});

// Google auth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/login'
}), (req, res) => {
    req.session.cart = req.user.cart || [];
    req.session.wishlist = req.user.wishlist || [];
    const redirectTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectTo);
});

// Admin login
app.get('/admin/login', (req, res) => {
    res.render('admin-login', { error: req.session.error });
    delete req.session.error;
});

app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.role !== 'admin' || !await user.comparePassword(password)) {
            req.session.error = 'Invalid admin credentials';
            return res.redirect('/admin/login');
        }
        req.login(user, (err) => {
            if (err) {
                req.session.error = 'Error during admin login';
                return res.redirect('/admin/login');
            }
            res.redirect('/admin');
        });
    } catch (err) {
        console.error('Admin login error:', err);
        req.session.error = 'Failed logging in as admin. Please try again.';
        res.redirect('/admin/login');
    }
});

// Logout
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy();
        res.redirect('/');
    });
});

// Add to wishlist
app.post('/wishlist/add/:productId', ensureAuthenticated, async (req, res) => {
    const user = req.user;
    const productId = req.params.productId;
    const productIdObj = new mongoose.Types.ObjectId(productId);
    const index = user.wishlist.findIndex(id => id.toString() === productId);
    let added = false;
    if (index > -1) {
        user.wishlist.splice(index, 1);
    } else {
        user.wishlist.push(productIdObj);
        added = true;
    }
    await user.save();
    req.session.wishlist = user.wishlist.map(id => id.toString()); // Strings for session

    // Check if AJAX request
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
        // Return JSON for AJAX (added: true if now in wishlist)
        res.json({ added });
    } else {
        // Fallback redirect for non-AJAX
        res.redirect(req.headers.referer || '/profile?tab=wishlist');
    }
});

// Remove from wishlist
app.post('/wishlist/remove/:index', ensureAuthenticated, async (req, res) => {
    const index = parseInt(req.params.index);
    req.user.wishlist.splice(index, 1);
    await req.user.save();
    req.session.wishlist = req.user.wishlist.map(id => id.toString());
    res.redirect('/profile?tab=wishlist');
});

// Clear wishlist
app.get('/wishlist/clear', ensureAuthenticated, async (req, res) => {
    req.user.wishlist = [];
    await req.user.save();
    req.session.wishlist = [];
    res.redirect('/profile?tab=wishlist');
});

// Profile
// In app.js, update the /profile route to filter invalid cart items:
app.get('/profile', [ensureAuthenticated, addNestedCategories], async (req, res) => {
    const user = await User.findById(req.user.id).populate('cart.productId wishlist');
    const validCartItems = user.cart.filter(item => item.productId);  // Filter out null productId
    const cart = validCartItems.map(item => ({ ...item.productId.toObject(), quantity: item.quantity }));
    const wishlist = user.wishlist;
    res.render('profile', { user: req.user, cart, wishlist });
});

// Route for the homepage (for now, no changes—can pass products if you want featured ones)
app.get('/', addNestedCategories, async (req, res) => {
    const bestSelling = await Product.find({}).sort({ salesCount: -1 }).limit(15);  // Auto by sales
    const featured = await Product.find({}).limit(15);  // Customize query if needed
    const popular = await Product.find({}).sort({ ratings: -1 }).limit(15);  // By ratings
    const newArrivals = await Product.find({}).sort({ _id: -1 }).limit(15);  // Newest
    const blogs = await Blog.find({}).sort({ date: -1 }).limit(6);
    const heroBanners = await Banner.find({ type: 'hero' });
    const sideBanners = await Banner.find({ type: 'side' });
    res.render('index', { bestSelling, featured, popular, newArrivals, blogs, heroBanners, sideBanners });
});
// Route for products page (now loads from file)
app.get('/products', async (req, res) => {
    const categoryId = req.query.category;
    let currentCategory = null;
    let subcategories = [];
    let products = [];
    let isSubcategoryView = true;
    const allCategories = await Category.find({});

    if (categoryId) {
        currentCategory = await Category.findById(categoryId).populate('parent');
        subcategories = await Category.find({ parent: categoryId });
        if (subcategories.length > 0) {
            isSubcategoryView = true;
        } else {
            products = await Product.find({ category: categoryId }).populate('category');
            isSubcategoryView = false;
        }
    } else {
        products = await Product.find({}).populate('category');
        isSubcategoryView = false;
        currentCategory = { name: 'All Products' };
    }

    const maxPrice = products.length > 0 ? (await Product.aggregate([{ $group: { _id: null, max: { $max: "$price" } } }]))[0].max : 100;

    // nestedCategories as before
    const topCategories = await Category.find({ parent: null });
    const nestedCategories = await Promise.all(topCategories.map(async (cat) => {
        const subs = await Category.find({ parent: cat._id });
        return { ...cat.toObject(), subcategories: subs };
    }));

    res.render('products', { currentCategory, subcategories, products, isSubcategoryView, nestedCategories, allCategories, maxPrice });
});

// In /product/:id
app.get('/product/:id', addNestedCategories, async (req, res) => {
    const product = await Product.findById(req.params.id).populate('category'); // Optional: for description/features
    if (!product) return res.status(404).send('Product not found');
    const relatedProducts = await Product.find({ category: product.category, _id: { $ne: product._id } }).limit(6);
    const isWishlisted = req.user ? req.user.wishlist.includes(product._id) : false;
    const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    res.render('product-detail', { product, relatedProducts, user: req.user, isWishlisted, currentUrl });
});

// In app.js, replace the review post route with this (change middleware to ensureAuthenticated):
app.post('/product/:id/review', ensureAuthenticated, async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        // Optional: Check if user already reviewed (prevent duplicates)
        const existingReview = product.reviews.find(r => r.user === req.user.email);
        if (existingReview) {
            req.session.error = 'You have already reviewed this product.';
            return res.redirect(`/product/${req.params.id}#reviews`);
        }

        product.reviews.push({
            user: req.user.email,  // Use email for anonymity; or req.user._id if you add user ref
            comment: req.body.comment,
            rating: parseInt(req.body.rating)
        });
        // Calculate average ratings
        product.ratings = product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length;
        await product.save();
    }
    res.redirect(`/product/${req.params.id}#reviews`);
});

app.get('/about', async (req, res) => {
    // Compute nestedCategories for sidebar (if not using middleware)
    const topCategories = await Category.find({ parent: null });
    const nestedCategories = await Promise.all(topCategories.map(async (cat) => {
        const subs = await Category.find({ parent: cat._id });
        return { ...cat.toObject(), subcategories: subs };
    }));

    res.render('about', { user: req.user, nestedCategories }); // Pass any needed vars, e.g., user for header
});

app.get('/contact', addNestedCategories, (req, res) => {
    res.render('contact', { user: req.user });
});

// Route for admin page (shows list and add form for both products and blogs)
// Middleware for admin authentication


// Full admin route
app.get('/admin', isAdminAuthenticated, async (req, res) => {
    try {
        const products = await Product.find({});
        const blogs = await Blog.find({}).sort({ date: -1 });
        const banners = await Banner.find({});
        const categories = await Category.find({}).populate('parent');

        // Compute leaf categories (categories with no subcategories) for product form
        const leafCategories = await Category.aggregate([
            { $lookup: { from: 'categories', localField: '_id', foreignField: 'parent', as: 'children' } },
            { $match: { 'children.0': { $exists: false } } } // No children
        ]).exec();

        // Compute nestedCategories for sidebar
        const topCategories = await Category.find({ parent: null });
        const nestedCategories = await Promise.all(topCategories.map(async (cat) => {
            const subs = await Category.find({ parent: cat._id });
            return { ...cat.toObject(), subcategories: subs };
        }));

        res.render('admin', { products, blogs, banners, categories, leafCategories, nestedCategories });
    } catch (error) {
        console.error('Error fetching admin data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle adding a product (form submit)
app.post('/admin/add', isAdminAuthenticated, async (req, res) => {
    const { name, price, images, category, description, features, unit } = req.body;
    const imageArray = images ? images.split(',').map(i => i.trim()) : [];
    const featureArray = features ? features.split(',').map(f => f.trim()) : [];
    const newProduct = new Product({ name, price: parseFloat(price), images: imageArray, category, description, features: featureArray, unit });
    await newProduct.save();
    res.redirect('/admin');
});

app.get('/admin/delete-category/:id', isAdminAuthenticated, async (req, res) => {
    // Optional: Check if has products or subs before delete
    await Category.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
});



app.get('/admin/edit/:id', isAdminAuthenticated, async (req, res) => {
    const product = await Product.findById(req.params.id);
    res.render('admin-edit-product', { product });  // New view, but for simplicity, integrate in admin or create
});

// Route to delete a product (by index for simplicity)
app.get('/admin/delete/:id', isAdminAuthenticated, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
});

app.post('/admin/update/:id', isAdminAuthenticated, async (req, res) => {
    const { name, price, images, category, description, features, unit } = req.body;
    const imageArray = images ? images.split(',').map(i => i.trim()) : [];
    const featureArray = features ? features.split(',').map(f => f.trim()) : [];
    await Product.findByIdAndUpdate(req.params.id, { name, price: parseFloat(price), images: imageArray, category, description, features: featureArray, unit });
    res.redirect('/admin');
});

// Route to add a blog
app.post('/admin/add-blog', isAdminAuthenticated, async (req, res) => {
    const { title, content, image } = req.body;
    const newBlog = new Blog({ title, content, image, date: new Date() });
    await newBlog.save();
    res.redirect('/admin');  // Redirect back to admin page
});

// Route to delete a blog
app.get('/admin/delete-blog/:id', isAdminAuthenticated, async (req, res) => {
    await Blog.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
});

// Route for blogs page
app.get('/blogs', addNestedCategories, async (req, res) => {
    const blogs = await Blog.find({}).sort({ date: -1 });
    res.render('blogs', { blogs });
});


// Add banner
app.post('/admin/add-banner', isAdminAuthenticated, async (req, res) => {
    const { type, image, title, text, link } = req.body;
    const newBanner = new Banner({ type, image, title, text, link });
    await newBanner.save();
    res.redirect('/admin');
});

// Delete banner
app.get('/admin/delete-banner/:id', isAdminAuthenticated, async (req, res) => {
    await Banner.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
});

// Add to cart (from product "Add" button)
app.post('/cart/add/:productId', ensureAuthenticated, async (req, res) => {
    const quantity = parseInt(req.body.quantity) || 1;
    const product = await Product.findById(req.params.productId);
    if (product) {
        const user = await User.findById(req.user.id);
        const existing = user.cart.find(item => item.productId.toString() === product._id.toString());
        if (existing) {
            existing.quantity += quantity;
        } else {
            user.cart.push({ productId: product._id, quantity });
        }
        await user.save();
        req.session.cart = user.cart.map(item => ({
            productId: item.productId.toString(),
            quantity: item.quantity,
            name: product.name,  // Fetch full if needed, but for simplicity
            price: product.price,
            image: product.images[0]
        }));
    }
    res.redirect('/profile?tab=cart');
});


app.post('/cart/remove/:index', ensureAuthenticated, async (req, res) => {
    const index = parseInt(req.params.index);
    if (req.session.cart) req.session.cart.splice(index, 1);
    const user = await User.findById(req.user.id);
    user.cart.splice(index, 1);
    await user.save();
    res.redirect('/profile?tab=cart');
});

app.get('/search', addNestedCategories, async (req, res) => {
    const query = req.query.q ? req.query.q.toLowerCase() : '';
    const products = await Product.find({ name: { $regex: query, $options: 'i' } });
    const blogs = await Blog.find({
        $or: [{ title: { $regex: query, $options: 'i' } }, { content: { $regex: query, $options: 'i' } }]
    });
    res.render('search', { query, products, blogs });
});

// Clear cart (optional)
app.get('/cart/clear', ensureAuthenticated, async (req, res) => {
    req.user.cart = [];
    await req.user.save();
    req.session.cart = [];
    res.redirect('/profile?tab=cart');
});

// In app.js, add this route after the existing cart routes

app.post('/cart/update/:index', ensureAuthenticated, async (req, res) => {
    const index = parseInt(req.params.index);
    const quantity = parseFloat(req.body.quantity);
    if (isNaN(quantity) || quantity <= 0) {
        // Invalid quantity, redirect without change
        return res.redirect('/profile?tab=cart');
    }
    const user = await User.findById(req.user.id);
    if (user.cart[index]) {
        user.cart[index].quantity = quantity;
        await user.save();
        // Update session if needed, but since profile repopulates, optional
    }
    res.redirect('/profile?tab=cart');
});

app.post('/admin/add-category', isAdminAuthenticated, async (req, res) => {
    const { name, parent, image, description } = req.body;
    const newCategory = new Category({
        name,
        parent: parent || null,
        image: image || '',  // Default to empty if not provided
        description: description || ''
    });
    await newCategory.save();
    res.redirect('/admin');
});

app.get('/admin/delete-category/:id', isAdminAuthenticated, async (req, res) => {
    // Optional: Check if has products or subs before delete
    await Category.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
});

app.get('/categories', addNestedCategories, async (req, res) => {
    res.render('categories', { nestedCategories: res.locals.nestedCategories, user: req.user });
});

app.get('/admin/edit-category/:id', isAdminAuthenticated, async (req, res) => {
    const category = await Category.findById(req.params.id).populate('parent');
    const categories = await Category.find({ _id: { $ne: req.params.id } }); // Exclude self for parent
    res.render('admin-edit-category', { category, categories });
});

app.post('/admin/update-category/:id', isAdminAuthenticated, async (req, res) => {
    const { name, parent, image, description } = req.body;
    await Category.findByIdAndUpdate(req.params.id, {
        name,
        parent: parent || null,
        image: image || '',
        description: description || ''
    });
    res.redirect('/admin');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});