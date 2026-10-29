// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = 'megamarket_secret_key_2026';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/megamarket';

// الاتصال بقاعدة البيانات مع إعدادات المهلة
mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000
})
  .then(() => console.log('✅ Connected to MongoDB successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- Schemas & Models --- //

// 1. نموذج المنتج (Product Schema)
const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true }, // electronics, clothing, furniture, games, books, grocery
    price: { type: Number, required: true },
    image: { type: String, required: true }
});
const Product = mongoose.model('Product', productSchema);

// 2. نموذج المستخدم (User Schema)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// 3. نموذج الطلب (Order Schema)
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: Array,
    totalPrice: Number,
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// --- Auth Middleware --- //
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'يرجى تسجيل الدخول أولاً' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'جلسة غير صالحة' });
        req.user = user;
        next();
    });
};

// --- Routes / APIs --- //

// تسجيل حساب جديد
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: 'المستخدم موجود بالفعل' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'تم إنشاء الحساب بنجاح' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: 'بيانات الدخول غير صحيحة' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'بيانات الدخول غير صحيحة' });

        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// جلب المنتجات (إما الكل أو قسم معتمد)
app.get('/api/products', async (req, res) => {
    try {
        const { category } = req.query;
        const filter = category ? { category } : {};
        const products = await Product.find(filter);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// إتمام الشراء وتسجيل الطلب
app.post('/api/checkout', authenticateToken, async (req, res) => {
    try {
        const { items, totalPrice } = req.body;
        if (!items || items.length === 0) return res.status(400).json({ message: 'السلة فارغة' });

        const order = new Order({
            userId: req.user.id,
            items,
            totalPrice
        });
        await order.save();
        res.json({ message: '✅ تم إتمام الشراء بنجاح وتسجيل الطلب!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// إضافة البيانات الأولية لقاعدة البيانات عبر طلب GET
app.get('/api/seed', async (req, res) => {
    try {
        await Product.deleteMany({});
        const initialProducts = [
            // إلكترونيات
            { title: '📱 iphone 16 pro max', category: 'electronics', price: 54000, image: 'https://tse4.mm.bing.net/th?id=OIP.W-rdX5gnL49Zkql8uMwhrwHaHa&pid=Api&P=0&h=220' },
            { title: '📱 laptop gaming', category: 'electronics', price: 100000, image: 'https://tse4.mm.bing.net/th?id=OIP.3g6E0D1CFKh_k-FEZHesCAHaE5&pid=Api&P=0&h=220' },
            { title: '📱 Apple Watch Ultra', category: 'electronics', price: 5000, image: 'https://tse4.mm.bing.net/th?id=OIP.4lfH40ylpKIm6phEodklOwAAAA&pid=Api&P=0&h=220' },
            { title: '📱 apple headphones', category: 'electronics', price: 2000, image: 'https://tse1.mm.bing.net/th?id=OIP.lD1mCzjs0QZfd8NmGLxjRgHaHa&pid=Api&P=0&h=220' },
            { title: '📱 Samsung Galaxy S24 Ultra', category: 'electronics', price: 25000, image: 'https://tse1.mm.bing.net/th?id=OIP.KybY0QiPP1Hs1WXV6y9EPQHaHd&pid=Api&P=0&h=220' },
            // ملابس
            { title: '👕 تيشرت', category: 'clothing', price: 200, image: 'https://tse2.mm.bing.net/th?id=OIP.SbSqCYwWqWGX24Y_QVY4tQHaHe&pid=Api&P=0&h=220' },
            { title: '👕 قميص', category: 'clothing', price: 400, image: 'https://tse1.mm.bing.net/th?id=OIP.XTXdEE1NSKyxbNyG9OpYJAHaHa&pid=Api&P=0&h=220' },
            { title: '👟 Nike Shoe', category: 'clothing', price: 2000, image: 'https://tse1.mm.bing.net/th?id=OIP.-pMikY679vZq8xtjfg0qZAHaJ4&pid=Api&P=0&h=220' },
            // أثاث
            { title: '🏠 طقم صالون مدرن', category: 'furniture', price: 35000, image: 'https://tse1.mm.bing.net/th?id=OIP.sH-iroMl16WqzUbHoapB_gHaEo&pid=Api&P=0&h=220' },
            { title: '🏠 غرفة نوم كامة', category: 'furniture', price: 40000, image: 'https://tse2.mm.bing.net/th?id=OIP.oInR1xH5vFDOgB8sWOsneAHaE3&pid=Api&P=0&h=220' },
            { title: '🏠 انتريه ركنة مودرن', category: 'furniture', price: 45000, image: 'https://tse4.mm.bing.net/th?id=OIP.qQgWS5P_JW3_GhOpZYVDvwHaHP&pid=Api&P=0&h=220' },
            { title: '🏠 طاولة طعام زجاجية', category: 'furniture', price: 50000, image: 'https://tse4.mm.bing.net/th?id=OIP.nSq8ROpSMiB5GAhym1dH9wHaDn&pid=Api&P=0&h=220' },
            { title: '🏠 مكتب دراسة خشب', category: 'furniture', price: 55000, image: 'https://tse4.mm.bing.net/th?id=OIP.GXre5yMjPCiLkTWNACH0xQHaFj&pid=Api&P=0&h=220' },
            // ألعاب
            { title: '🎮 pes 2025', category: 'games', price: 5000, image: 'https://tse4.mm.bing.net/th?id=OIP.2b4zZF3ca5OhI8aP3ivCaQHaEK&pid=Api&P=0&h=220' },
            { title: '🎮 Repo', category: 'games', price: 500, image: 'https://tse2.mm.bing.net/th?id=OIP.e4JaF9d9xCbV9XmRMCmoHgHaEK&pid=Api&P=0&h=220' },
            { title: '🧩 مكعبات أطفال', category: 'games', price: 100, image: 'https://tse4.mm.bing.net/th?id=OIP.mhw86nE4CC-_B_ZwvvhhHQHaEK&pid=Api&P=0&h=220' },
            { title: '🎮 Call of Duty PS4', category: 'games', price: 1000, image: 'https://tse3.mm.bing.net/th?id=OIP.KsTlLmNBPRooZFX52LpdXwHaJR&pid=Api&P=0&h=220' },
            // كتب
            { title: '📚 كتاب هيبتا', category: 'books', price: 150, image: 'https://tse1.mm.bing.net/th?id=OIP.5R45uzWmrok3njAw17pEFQAAAA&pid=Api&P=0&h=220' },
            { title: '📚 كتاب الدحيح', category: 'books', price: 200, image: 'https://tse2.mm.bing.net/th?id=OIP.48ZRrwL2CjO6452Bl4cXoAHaHa&pid=Api&P=0&h=220' },
            { title: '📚 كتاب السماح بالرحيل', category: 'books', price: 200, image: 'https://tse2.mm.bing.net/th?id=OIP.XRBXcwNBy4EDUrITE1-IaAHaK9&pid=Api&P=0&h=220' },
            { title: '📚 كتاب أرض زيكولا', category: 'books', price: 200, image: 'https://tse3.mm.bing.net/th?id=OIP.r3tmaDi5nvBBScPbo-iIsQHaFj&pid=Api&P=0&h=220' },
            { title: '📚 كتاب أرض زيكولا 2', category: 'books', price: 250, image: 'https://tse4.mm.bing.net/th?id=OIP.q0Jl1CnSx-uyTegiROjJOAHaDa&pid=Api&P=0&h=220' },
            // بقالة
            { title: '🧴 زيت سندباد', category: 'grocery', price: 60, image: 'https://tse3.mm.bing.net/th?id=OIP.uN48-1tDOd8svOWnMm3WrAHaE8&pid=Api&P=0&h=220' },
            { title: '🍚 سكر أبيض', category: 'grocery', price: 40, image: 'https://tse1.mm.bing.net/th?id=OIP.hRjo8fkiGGfZs82UVwH1lQHaHa&pid=Api&P=0&h=220' },
            { title: '🥫 ريد بول', category: 'grocery', price: 450, image: 'https://tse2.mm.bing.net/th?id=OIP.sCG___psUNqxl-OlrVAA9QHaHa&pid=Api&P=0&h=220' },
            { title: '🧴 خل أبيض', category: 'grocery', price: 20, image: 'https://tse1.mm.bing.net/th?id=OIP.CtwWaGbbeDIiQTwOW4ErnAAAAA&pid=Api&P=0&h=220' },
            { title: '🥚 بيض', category: 'grocery', price: 250, image: 'https://tse1.mm.bing.net/th?id=OIP.ibrSDz9KTiztn3pDcGomQgHaE8&pid=Api&P=0&h=220' }
        ];

        await Product.insertMany(initialProducts);
        res.json({ message: '✅ Database Seeded Successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));