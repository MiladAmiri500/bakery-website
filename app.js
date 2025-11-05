require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/product');
const Blog = require('./models/blog');
const Category = require('./models/category');
const express = require('express');
const path = require('path');
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
    res.locals.user = req.user || null;
    // Initialize session cart/wishlist if not present
    if (!req.session.cart) req.session.cart = [];
    if (!req.session.wishlist) req.session.wishlist = [];
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
}), async (req, res) => {
    // Merge session cart/wishlist to user on login
    if (req.session.cart && req.session.cart.length > 0) {
        req.session.cart.forEach(sessionItem => {
            const existing = req.user.cart.find(uItem => uItem.productId.toString() === sessionItem.productId);
            if (existing) {
                existing.quantity += sessionItem.quantity;
            } else {
                req.user.cart.push({ productId: new mongoose.Types.ObjectId(sessionItem.productId), quantity: sessionItem.quantity });
            }
        });
        delete req.session.cart;
    }
    if (req.session.wishlist && req.session.wishlist.length > 0) {
        req.session.wishlist.forEach(id => {
            const objId = new mongoose.Types.ObjectId(id);
            if (!req.user.wishlist.some(wId => wId.toString() === id)) {
                req.user.wishlist.push(objId);
            }
        });
        delete req.session.wishlist;
    }
    await req.user.save();
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
        req.login(newUser, async (err) => {
            if (err) {
                req.session.error = 'Error during login after signup';
                return res.redirect('/signup');
            }
            // Merge session to new user
            if (req.session.cart && req.session.cart.length > 0) {
                req.session.cart.forEach(sessionItem => {
                    newUser.cart.push({ productId: new mongoose.Types.ObjectId(sessionItem.productId), quantity: sessionItem.quantity });
                });
                delete req.session.cart;
            }
            if (req.session.wishlist && req.session.wishlist.length > 0) {
                req.session.wishlist.forEach(id => {
                    newUser.wishlist.push(new mongoose.Types.ObjectId(id));
                });
                delete req.session.wishlist;
            }
            await newUser.save();
            res.redirect('/'); // Redirect to home after signup
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
}), async (req, res) => {
    // Merge session to user
    if (req.session.cart && req.session.cart.length > 0) {
        req.session.cart.forEach(sessionItem => {
            const existing = req.user.cart.find(uItem => uItem.productId.toString() === sessionItem.productId);
            if (existing) {
                existing.quantity += sessionItem.quantity;
            } else {
                req.user.cart.push({ productId: new mongoose.Types.ObjectId(sessionItem.productId), quantity: sessionItem.quantity });
            }
        });
        delete req.session.cart;
    }
    if (req.session.wishlist && req.session.wishlist.length > 0) {
        req.session.wishlist.forEach(id => {
            const objId = new mongoose.Types.ObjectId(id);
            if (!req.user.wishlist.some(wId => wId.toString() === id)) {
                req.user.wishlist.push(objId);
            }
        });
        delete req.session.wishlist;
    }
    await req.user.save();
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
// Add to wishlist (handle auth and guest)
app.post('/wishlist/add/:productId', async (req, res) => {
    const productId = req.params.productId;
    let added = false;
    if (req.user) {
        const user = req.user;
        const index = user.wishlist.findIndex(id => id.toString() === productId);
        if (index > -1) {
            user.wishlist.splice(index, 1);
        } else {
            user.wishlist.push(new mongoose.Types.ObjectId(productId));
            added = true;
        }
        await user.save();
    } else {
        const index = req.session.wishlist.indexOf(productId);
        if (index > -1) {
            req.session.wishlist.splice(index, 1);
        } else {
            req.session.wishlist.push(productId);
            added = true;
        }
    }
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
        res.json({ added });
    } else {
        res.redirect(req.headers.referer || '/wishlist');
    }
});
// Remove from wishlist
app.post('/wishlist/remove/:index', async (req, res) => {
    const index = parseInt(req.params.index);
    if (req.user) {
        const user = await User.findById(req.user.id);
        user.wishlist.splice(index, 1);
        await user.save();
    } else if (req.session.wishlist) {
        req.session.wishlist.splice(index, 1);
    }
    res.redirect('/wishlist');
});
// Wishlist page
app.get('/wishlist', addNestedCategories, async (req, res) => {
    let wishlistProducts = [];
    if (req.user) {
        wishlistProducts = await Product.find({ _id: { $in: req.user.wishlist } });
    } else if (req.session.wishlist) {
        wishlistProducts = await Product.find({ _id: { $in: req.session.wishlist.map(id => new mongoose.Types.ObjectId(id)) } });
    }
    // Compute isInCart, isWishlisted (true for all here)
    wishlistProducts = wishlistProducts.map(p => ({
        ...p.toObject(),
        isInCart: (req.user ? req.user.cart.some(item => item.productId.toString() === p._id.toString()) : req.session.cart.some(item => item.productId === p._id.toString())) || false,
        isWishlisted: true
    }));
    res.render('wishlist', { wishlist: wishlistProducts });
});
// Clear wishlist
app.get('/wishlist/clear', async (req, res) => {
    if (req.user) {
        req.user.wishlist = [];
        await req.user.save();
    } else {
        req.session.wishlist = [];
    }
    res.redirect('/wishlist');
});
// Add to cart (handle auth and guest)
app.post('/cart/add/:productId', async (req, res) => {
    const quantity = parseFloat(req.body.quantity) || 1;
    const productId = req.params.productId;
    const product = await Product.findById(productId);
    if (product) {
        if (req.user) {
            const user = req.user;
            const existing = user.cart.find(item => item.productId.toString() === productId);
            if (existing) {
                existing.quantity += quantity;
            } else {
                user.cart.push({ productId: new mongoose.Types.ObjectId(productId), quantity });
            }
            await user.save();
        } else {
            const existing = req.session.cart.find(item => item.productId === productId);
            if (existing) {
                existing.quantity += quantity;
            } else {
                req.session.cart.push({ productId, quantity });
            }
        }
        if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
            return res.json({ success: true });
        }
    }
    res.redirect(req.headers.referer || '/cart');
});
// Cart page
app.get('/cart', addNestedCategories, async (req, res) => {
    let cartItems = [];
    if (req.user) {
        const populatedUser = await User.findById(req.user.id).populate('cart.productId');
        cartItems = populatedUser.cart.map(item => ({ ...item.productId.toObject(), quantity: item.quantity }));
    } else if (req.session.cart) {
        const productIds = req.session.cart.map(item => new mongoose.Types.ObjectId(item.productId));
        const products = await Product.find({ _id: { $in: productIds } });
        cartItems = req.session.cart.map(sessionItem => {
            const product = products.find(p => p._id.toString() === sessionItem.productId);
            return { ...product.toObject(), quantity: sessionItem.quantity };
        }).filter(item => item); // Filter out any missing products
    }
    res.render('cart', { cart: cartItems });
});
// Update cart quantity
app.post('/cart/update/:index', async (req, res) => {
    const index = parseInt(req.params.index);
    const quantity = parseFloat(req.body.quantity);
    if (isNaN(quantity) || quantity <= 0) {
        return res.redirect('/cart');
    }
    if (req.user) {
        const user = await User.findById(req.user.id);
        if (user.cart[index]) {
            user.cart[index].quantity = quantity;
            await user.save();
        }
    } else if (req.session.cart[index]) {
        req.session.cart[index].quantity = quantity;
    }
    res.redirect('/cart');
});
// Remove from cart
app.post('/cart/remove/:index', async (req, res) => {
    const index = parseInt(req.params.index);
    if (req.user) {
        const user = await User.findById(req.user.id);
        user.cart.splice(index, 1);
        await user.save();
    } else if (req.session.cart) {
        req.session.cart.splice(index, 1);
    }
    res.redirect('/cart');
});
// Clear cart
app.get('/cart/clear', async (req, res) => {
    if (req.user) {
        req.user.cart = [];
        await req.user.save();
    } else {
        req.session.cart = [];
    }
    res.redirect('/cart');
});
// Profile (remove cart/wishlist tabs, keep others)
app.get('/profile', ensureAuthenticated, addNestedCategories, async (req, res) => {
    const user = await User.findById(req.user.id);
    res.render('profile', { user });
});
// Route for the homepage
app.get('/', addNestedCategories, async (req, res) => {
    const bestSelling = await Product.find({}).sort({ salesCount: -1 }).limit(15);
    const featured = await Product.find({}).limit(15);
    const popular = await Product.find({}).sort({ ratings: -1 }).limit(15);
    const newArrivals = await Product.find({}).sort({ _id: -1 }).limit(15);
    const blogs = await Blog.find({}).sort({ date: -1 }).limit(6);
    const heroBanners = await Banner.find({ type: 'hero' });
    const sideBanners = await Banner.find({ type: 'side' });
    const computeFlags = (products) => {
        return products.map(p => ({
            ...p.toObject(),
            isInCart: (req.user ? req.user.cart.some(item => item.productId.toString() === p._id.toString()) : req.session.cart.some(item => item.productId === p._id.toString())) || false,
            isWishlisted: (req.user ? req.user.wishlist.some(id => id.toString() === p._id.toString()) : req.session.wishlist.includes(p._id.toString())) || false
        }));
    };
    res.render('index', {
        bestSelling: computeFlags(bestSelling),
        featured: computeFlags(featured),
        popular: computeFlags(popular),
        newArrivals: computeFlags(newArrivals),
        blogs,
        heroBanners,
        sideBanners
    });
});
app.get('/products', addNestedCategories, async (req, res) => {
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

    // Compute flags for products
    const computeFlags = (products) => {
        return products.map(p => ({
            ...p.toObject(),
            isInCart: (req.user ? req.user.cart.some(item => item.productId.toString() === p._id.toString()) : req.session.cart.some(item => item.productId === p._id.toString())) || false,
            isWishlisted: (req.user ? req.user.wishlist.some(id => id.toString() === p._id.toString()) : req.session.wishlist.includes(p._id.toString())) || false
        }));
    };
    products = computeFlags(products);

    res.render('products', { currentCategory, subcategories, products, isSubcategoryView, allCategories, maxPrice });
});
app.get('/product/:id', addNestedCategories, async (req, res) => {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) return res.status(404).send('Product not found');
    let relatedProducts = await Product.find({ category: product.category, _id: { $ne: product._id } }).limit(6);

    const computeFlags = (products) => {
        return products.map(p => ({
            ...p.toObject(),
            isInCart: (req.user ? req.user.cart.some(item => item.productId.toString() === p._id.toString()) : req.session.cart.some(item => item.productId === p._id.toString())) || false,
            isWishlisted: (req.user ? req.user.wishlist.some(id => id.toString() === p._id.toString()) : req.session.wishlist.includes(p._id.toString())) || false
        }));
    };

    const isInCart = (req.user ? req.user.cart.some(item => item.productId.toString() === product._id.toString()) : req.session.cart.some(item => item.productId === product._id.toString())) || false;
    const isWishlisted = (req.user ? req.user.wishlist.some(id => id.toString() === product._id.toString()) : req.session.wishlist.includes(product._id.toString())) || false;
    relatedProducts = computeFlags(relatedProducts);

    const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    res.render('product-detail', { product, relatedProducts, user: req.user, isWishlisted, isInCart, currentUrl });
});
// Review post
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
app.get('/about', addNestedCategories, async (req, res) => {
    res.render('about', { user: req.user });
});
app.get('/contact', addNestedCategories, (req, res) => {
    res.render('contact', { user: req.user });
});
// Full admin route
app.get('/admin', [isAdminAuthenticated, addNestedCategories], async (req, res) => {
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

        res.render('admin', { products, blogs, banners, categories, leafCategories });
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
// Route to add a blog
app.post('/admin/add-blog', isAdminAuthenticated, async (req, res) => {
    const { title, content, image } = req.body;
    const newBlog = new Blog({ title, content, image, date: new Date() });
    await newBlog.save();
    res.redirect('/admin');  // Redirect back to admin page
});
// Add banner
app.post('/admin/add-banner', isAdminAuthenticated, async (req, res) => {
    const { type, image, title, text, link } = req.body;
    const newBanner = new Banner({ type, image, title, text, link });
    await newBanner.save();
    res.redirect('/admin');
});
// Route to delete a product (by index for simplicity)
app.get('/admin/delete/:id', isAdminAuthenticated, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
});
// Route to delete a blog
app.get('/admin/delete-blog/:id', isAdminAuthenticated, async (req, res) => {
    await Blog.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
});
// Delete banner
app.get('/admin/delete-banner/:id', isAdminAuthenticated, async (req, res) => {
    await Banner.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
});
app.get('/admin/edit/:id', isAdminAuthenticated, async (req, res) => {
    const product = await Product.findById(req.params.id);
    res.render('admin-edit-product', { product });  // New view, but for simplicity, integrate in admin or create
});
app.post('/admin/update/:id', isAdminAuthenticated, async (req, res) => {
    const { name, price, images, category, description, features, unit } = req.body;
    const imageArray = images ? images.split(',').map(i => i.trim()) : [];
    const featureArray = features ? features.split(',').map(f => f.trim()) : [];
    await Product.findByIdAndUpdate(req.params.id, { name, price: parseFloat(price), images: imageArray, category, description, features: featureArray, unit });
    res.redirect('/admin');
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
// Route for blogs page
app.get('/blogs', addNestedCategories, async (req, res) => {
    const blogs = await Blog.find({}).sort({ date: -1 });
    res.render('blogs', { blogs });
});
app.get('/categories', addNestedCategories, async (req, res) => {
    res.render('categories', { nestedCategories: res.locals.nestedCategories, user: req.user });
});
app.get('/search', addNestedCategories, async (req, res) => {
    const query = req.query.q ? req.query.q.toLowerCase() : '';
    let products = await Product.find({ name: { $regex: query, $options: 'i' } });

    // Compute flags for products
    const computeFlags = (products) => {
        return products.map(p => ({
            ...p.toObject(),
            isInCart: (req.user ? req.user.cart.some(item => item.productId.toString() === p._id.toString()) : req.session.cart.some(item => item.productId === p._id.toString())) || false,
            isWishlisted: (req.user ? req.user.wishlist.some(id => id.toString() === p._id.toString()) : req.session.wishlist.includes(p._id.toString())) || false
        }));
    };
    products = computeFlags(products);

    const blogs = await Blog.find({
        $or: [{ title: { $regex: query, $options: 'i' } }, { content: { $regex: query, $options: 'i' } }]
    });
    res.render('search', { query, products, blogs });
});
// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});