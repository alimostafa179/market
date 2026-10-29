// app.js
const API_URL = 'http://localhost:5000/api';

// جلب المنتجات ديناميكياً من السيرفر
async function loadCategoryProducts(categoryName) {
    const container = document.querySelector('.products-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/products?category=${categoryName}`);
        const products = await response.json();

        container.innerHTML = '';
        products.forEach(product => {
            const productHTML = `
                <div class="product">
                    <img src="${product.image}" alt="${product.title}">
                    <h3>${product.title}</h3>
                    <p>السعر: ${product.price} جنيه</p>
                    <button onclick="addToCart('${product.title}', ${product.price})">إضافة إلى العربة</button>
                </div>
            `;
            container.innerHTML += productHTML;
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        container.innerHTML = '<p style="text-align:center;">حدث خطأ في جلب المنتجات من السيرفر.</p>';
    }
}

// إضافة منتج للسلة
function addToCart(name, price) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.push({ name, price });
    localStorage.setItem('cart', JSON.stringify(cart));
    alert("✅ " + name + " تمت إضافته إلى العربة");
}

// عرض عناصر السلة في cart.html
function loadCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    if (!cartItemsContainer) return;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cartItemsContainer.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <span>${item.name} - ${item.price} جنيه</span>
            <button onclick="removeItem(${index})">إلغاء</button>
        `;
        cartItemsContainer.appendChild(itemElement);
        total += item.price;
    });

    totalPriceElement.textContent = `المجموع: ${total} جنيه`;
}

// حذف عنصر من السلة
function removeItem(index) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCartItems();
}

// إتمام الشراء عبر API الـ Backend
async function processCheckout() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const token = localStorage.getItem('token');

    if (cart.length === 0) {
        alert("العربة فارغة!");
        return;
    }

    if (!token) {
        alert("يرجى تسجيل الدخول أولاً لإتمام الشراء!");
        window.location.href = "login.html";
        return;
    }

    const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

    try {
        const response = await fetch(`${API_URL}/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ items: cart, totalPrice })
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            localStorage.removeItem('cart');
            loadCartItems();
        } else {
            alert(data.message || 'فشلت عملية الشراء');
        }
    } catch (err) {
        alert('حدث خطأ بالاتصال بالسيرفر');
    }
}

// تسجيل الدخول الحقيقي
async function handleLogin() {
    const usernameInput = document.getElementById("username").value;
    const passwordInput = document.getElementById("password").value;

    if (!usernameInput || !passwordInput) {
        alert("❌ من فضلك أدخل البيانات كاملة");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("username", data.username);
            alert("✅ تم تسجيل الدخول بنجاح!");
            window.location.href = "index.html";
        } else {
            alert("❌ " + (data.message || "بيانات غير صحيحة"));
        }
    } catch (err) {
        alert("تعذر الاتصال بالسيرفر");
    }
}