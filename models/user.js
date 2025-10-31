const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String },
    googleId: { type: String },  // For Google login
    role: { type: String, default: 'user' },  // 'user' or 'admin'
    cart: [{ 
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, 
        quantity: Number 
    }],  // Persistent cart with ref
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]  // Persistent wishlist
});

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);