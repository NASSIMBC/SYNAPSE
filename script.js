import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// CONFIGURATION SUPABASE
const supabaseUrl = 'https://qldsrpgfutqdjyxdelud.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZHNycGdmdXRxZGp5eGRlbHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzg3NjIsImV4cCI6MjA4MzY1NDc2Mn0.ZhEV3ujRQmTThC_EpicV54-GJ5r7iaO1R-wmTtJVBCs'
const supabase = createClient(supabaseUrl, supabaseKey)

// --- GESTION PANIER ---
window.myCart = [];

window.addToCart = function(title, price, image, id) {
    window.myCart.push({ title, price, image, id });
    updateCartUI();
    showToast("Ajouté au panier !");
}

window.removeFromCart = function(index) {
    window.myCart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById('cart-items-container');
    const badge = document.getElementById('cart-count');
    const totalDrawer = document.getElementById('cart-drawer-total');
    const totalCheckout = document.getElementById('cart-total-price');

    badge.innerText = window.myCart.length;
    container.innerHTML = '';
    let total = 0;

    if (window.myCart.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 mt-10">Votre panier est vide</div>';
    } else {
        window.myCart.forEach((item, index) => {
            let cleanPrice = parseInt(item.price.replace(/\D/g, '')) || 0;
            total += cleanPrice;
            const html = `
            <div class="flex gap-3 bg-gray-50 dark:bg-dark-800 p-3 rounded-lg relative group">
                <img src="${item.image}" class="w-16 h-16 object-contain bg-white rounded-md">
                <div class="flex-1">
                    <h4 class="text-sm font-bold text-black dark:text-white line-clamp-1">${item.title}</h4>
                    <div class="flex justify-between items-center mt-2">
                        <span class="font-bold text-synapse-dark dark:text-synapse">${item.price}</span>
                    </div>
                </div>
                <button onclick="removeFromCart(${index})" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-2"><i class="fa-solid fa-xmark"></i></button>
            </div>`;
            container.innerHTML += html;
        });
    }
    const formattedTotal = total.toLocaleString() + ' DA';
    totalDrawer.innerText = formattedTotal;
    if(totalCheckout) totalCheckout.innerText = formattedTotal;
}

window.showToast = (msg) => {
    const toast = document.getElementById('toast');
    toast.querySelector('span').innerText = msg;
    toast.classList.remove('translate-y-40', 'opacity-0');
    setTimeout(() => { toast.classList.add('translate-y-40', 'opacity-0'); }, 3000);
}

// --- GESTION PROFIL & MESSAGES ---
window.loadProfile = async function() {
    const { data: { user } } = await supabase.auth.getUser();
    if(user) {
        let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if(profile) {
            if(profile.full_name) {
                document.getElementById('header-username').innerText = profile.full_name;
                document.getElementById('profile-name').value = profile.full_name;
            }
            if(profile.phone) document.getElementById('profile-phone').value = profile.phone;
            if(profile.wilaya) document.getElementById('profile-wilaya').value = profile.wilaya;
        }
        loadMyMessages(user.id);
    }
}

window.saveProfile = async function() {
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const wilaya = document.getElementById('profile-wilaya').value;
    const { data: { user } } = await supabase.auth.getUser();
    if(user) {
        const { error } = await supabase.from('profiles').upsert({ id: user.id, full_name: name, phone, wilaya });
        if(error) alert("Erreur sauvegarde: " + error.message); else { showToast("Profil mis à jour !"); loadProfile(); }
    } else alert("Connectez-vous d'abord !");
}

// --- NOTATION (MATHÉMATIQUE CORRECTE) ---
window.rateSeller = async function(stars) {
    const sellerId = document.getElementById('detail-store-id').value;
    const { data: { user } } = await supabase.auth.getUser();
    if(!user) return alert("Connectez-vous !");

    const { error } = await supabase.from('reviews').insert([{ seller_id: sellerId, buyer_id: user.id, rating: stars }]);
    if(error) alert("Vous avez déjà noté ce vendeur ou erreur."); else showToast("Note enregistrée : " + stars + " étoiles !");
}

async function getSellerRating(sellerId) {
    const { data: reviews } = await supabase.from('reviews').select('rating').eq('seller_id', sellerId);
    if (!reviews || reviews.length === 0) return { avg: 0, count: 0 };
    const totalStars = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = (totalStars / reviews.length).toFixed(1);
    return { avg: avg, count: reviews.length };
}

// --- MESSAGERIE ---
window.openMessageModal = () => document.getElementById('message-modal').classList.remove('hidden');
window.sendMessage = async function() {
    const content = document.getElementById('msg-content').value;
    const sellerId = document.getElementById('detail-store-id').value;
    if(!content) return alert("Message vide !");
    const { data: { user } } = await supabase.auth.getUser();
    if(!user) return alert("Connectez-vous !");
    const { error } = await supabase.from('messages').insert([{ sender_id: user.id, receiver_id: sellerId, content: content }]);
    if(error) alert("Erreur envoi"); else { showToast("Message envoyé !"); document.getElementById('message-modal').classList.add('hidden'); }
}
async function loadMyMessages(userId) {
    const list = document.getElementById('my-messages-list');
    const { data: msgs } = await supabase.from('messages').select('*').eq('receiver_id', userId).order('created_at', { ascending: false });
    list.innerHTML = (msgs && msgs.length > 0) ? msgs.map(m => `<div class="p-2 bg-gray-50 dark:bg-black rounded border border-gray-200 dark:border-gray-800"><div class="font-bold text-synapse text-[10px]">Nouveau message</div><div>${m.content}</div></div>`).join('') : '<div class="text-gray-400">Aucun message.</div>';
}

// --- CYCLE DE VIE COMMANDE (VENDEUR) ---
async function loadSellerOrders() {
    const list = document.getElementById('seller-orders-list');
    list.innerHTML = '<div class="text-center py-10"><span class="loader"></span></div>';
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;
        const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).single();
        if(!store) { list.innerHTML = '<div class="text-gray-500 text-center">Pas de boutique.</div>'; return; }

        const { data: items } = await supabase.from('order_items').select('*, product:products(*), order:orders(*)').eq('product.store_id', store.id).order('created_at', { ascending: false });
        const myItems = items ? items.filter(i => i.product && i.product.store_id === store.id) : [];

        if(!myItems.length) { list.innerHTML = '<div class="text-gray-500 p-10 text-center border border-dashed border-gray-800 rounded-xl">Aucune commande.</div>'; return; }

        list.innerHTML = '';
        myItems.forEach(item => {
            const status = item.order.status; 
            let buttonsHtml = '';
            if (status === 'en_attente') {
                buttonsHtml = `<button onclick="updateOrderStatus(${item.order_id}, 'en_livraison')" class="w-full bg-synapse text-black font-bold py-3 rounded-lg hover:bg-white transition"><i class="fa-solid fa-truck"></i> Expédier</button>`;
            } else if (status === 'en_livraison') {
                buttonsHtml = `<div class="flex gap-2"><button onclick="updateOrderStatus(${item.order_id}, 'livre', ${item.price}, ${store.id})" class="flex-1 bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition"><i class="fa-solid fa-check"></i> Livré (Encaisser)</button><button onclick="updateOrderStatus(${item.order_id}, 'annule')" class="flex-1 bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 transition"><i class="fa-solid fa-xmark"></i> Annuler</button></div>`;
            } else if(status === 'livre') { buttonsHtml = `<div class="text-green-500 font-bold text-center"><i class="fa-solid fa-circle-check"></i> Commande Terminée</div>`; }

            if (status !== 'annule') {
                const html = `<div class="bg-dark-900 border border-gray-800 rounded-xl p-5 mb-4 hover:border-synapse/50 transition"><div class="flex justify-between items-start border-b border-gray-800 pb-4 mb-4"><div><span class="text-xs text-gray-500 uppercase font-bold">Commande #${item.order_id}</span><div class="text-sm text-gray-300 mt-1">${new Date(item.created_at).toLocaleDateString()}</div></div><div class="text-right"><div class="text-xl font-black text-white">${item.price} DA</div><span class="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">${status}</span></div></div><div class="flex gap-4 items-center mb-4"><img src="${item.product.image_url}" class="w-16 h-16 bg-white rounded-lg object-contain p-1"><div><h4 class="font-bold text-white">${item.product.title}</h4><div class="text-xs text-gray-400">Qté: ${item.quantity}</div></div></div><div class="bg-black/50 p-3 rounded-lg text-sm text-gray-300 mb-4 border border-gray-800"><div class="font-bold text-synapse mb-1"><i class="fa-solid fa-location-dot"></i> Livraison :</div><p>${item.order.shipping_address || 'Non spécifiée'}</p></div>${buttonsHtml}</div>`;
                list.innerHTML += html;
            }
        });
    } catch(e) { console.error(e); }
}

window.updateOrderStatus = async function(orderId, newStatus, amount = 0, storeId = 0) {
    if(newStatus === 'annule') {
        const { error } = await supabase.from('orders').delete().eq('id', orderId);
        if(!error) { showToast("Commande annulée."); loadSellerOrders(); }
    } else {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        if(!error) {
            if(newStatus === 'livre' && amount > 0 && storeId > 0) { await supabase.rpc('add_revenue', { store_id_param: storeId, amount: amount }); showToast("Livré ! + " + amount + " DA"); } 
            else { showToast("Statut mis à jour."); }
            loadSellerOrders(); loadSellerStats();
        }
    }
}

// --- UI & NAVIGATION ---
window.toggleTheme = () => document.documentElement.classList.toggle('dark');
window.hideAllViews = () => ['home-view', 'product-view', 'auth-view', 'dashboard-view', 'checkout-view', 'seller-dashboard-view'].forEach(id => document.getElementById(id).classList.add('hidden'));
window.goHome = () => { hideAllViews(); document.getElementById('home-view').classList.remove('hidden'); fetchAllData(); window.scrollTo(0,0); }
window.showAuth = () => { hideAllViews(); document.getElementById('auth-view').classList.remove('hidden'); }
window.handleAccountClick = async () => { const { data: { user } } = await supabase.auth.getUser(); user ? window.showDashboard() : window.showAuth(); }
window.showDashboard = () => { hideAllViews(); document.getElementById('dashboard-view').classList.remove('hidden'); loadProfile(); }
window.showSellerDashboard = () => { hideAllViews(); document.getElementById('seller-dashboard-view').classList.remove('hidden'); loadSellerStats(); loadSellerOrders(); loadSellerProducts(); }
window.showCheckout = () => { hideAllViews(); document.getElementById('checkout-view').classList.remove('hidden'); }
window.toggleCart = () => document.getElementById('cart-drawer').classList.toggle('hidden');
window.toggleMobileMenu = () => document.getElementById('mobile-menu').classList.toggle('hidden');
window.toggleAuthMode = (m) => { document.getElementById('form-login').classList.toggle('hidden', m!=='login'); document.getElementById('form-signup').classList.toggle('hidden', m==='login'); }
window.switchSellerTab = (t) => { document.querySelectorAll('.seller-tab-content').forEach(e=>e.classList.add('hidden')); document.getElementById('seller-tab-'+t).classList.remove('hidden'); }

// --- SEARCH & FILTER ---
window.handleSearch = async () => { 
    const term = document.getElementById('search-input').value;
    if(term) {
        localStorage.setItem('synapse_last_search', term);
        hideAllViews();
        document.getElementById('home-view').classList.remove('hidden');
        window.scrollTo(0, 0);
        document.getElementById('products-grid').innerHTML = '<div class="col-span-full text-center py-10"><span class="loader"></span> Recherche...</div>';
        const { data } = await supabase.from('products').select('*').ilike('title', `%${term}%`);
        renderGrid('products-grid', data);
    }
}
window.handleSearchMobile = async () => {
    const term = document.getElementById('mobile-search-input').value;
    if(term) {
        localStorage.setItem('synapse_last_search', term);
        toggleMobileMenu();
        hideAllViews();
        document.getElementById('home-view').classList.remove('hidden');
        window.scrollTo(0, 0);
        document.getElementById('products-grid').innerHTML = '<div class="col-span-full text-center py-10"><span class="loader"></span> Recherche...</div>';
        const { data } = await supabase.from('products').select('*').ilike('title', `%${term}%`);
        renderGrid('products-grid', data);
    }
}

window.filterByCategory = async (category) => { 
    hideAllViews();
    document.getElementById('home-view').classList.remove('hidden');
    document.getElementById('boosted-section').classList.add('hidden');
    document.getElementById('recommended-section').classList.add('hidden');
    document.getElementById('hot-section-container').classList.add('hidden');
    document.getElementById('hero-banner').classList.add('hidden');
    document.getElementById('main-grid-title').innerHTML = `<i class="fa-solid fa-filter text-synapse"></i> Catégorie : ${category}`;
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '<div class="col-span-full text-center py-10"><span class="loader"></span></div>';
    const { data } = await supabase.from('products').select('*').eq('category', category);
    renderGrid('products-grid', data);
    window.scrollTo(0, 0);
}

window.applyPriceFilter = async (val) => { 
    const max = parseInt(val);
    const { data } = await supabase.from('products').select('*').lte('price', max).order('created_at', { ascending: false });
    renderGrid('products-grid', data);
    document.getElementById('hot-section-container').classList.add('hidden');
}

window.updatePriceLabel = (v) => document.getElementById('price-value').innerText = parseInt(v).toLocaleString() + ' DA';

// --- FETCH DATA (Updated with Rating Calculation) ---
async function fetchAllData() {
    const { data: hot } = await supabase.from('products').select('*').order('view_count', { ascending: false }).limit(4);
    const { data: boosted } = await supabase.from('products').select('*').eq('is_boosted', true).limit(2);
    
    const lastSearch = localStorage.getItem('synapse_last_search');
    let recommended = [];
    if(lastSearch) {
        const { data: recos } = await supabase.from('products').select('*').ilike('title', `%${lastSearch}%`).limit(4);
        recommended = recos;
    }
    
    const { data: all } = await supabase.from('products').select('*').order('created_at', { ascending: false });

    renderGrid('products-grid', all);
    if(hot && hot.length > 0) renderGrid('hot-grid', hot);
    
    if(boosted && boosted.length > 0) {
        document.getElementById('boosted-section').classList.remove('hidden');
        renderGrid('boosted-grid', boosted, true);
    }
    if(recommended && recommended.length > 0) {
        document.getElementById('recommended-section').classList.remove('hidden');
        renderGrid('recommended-grid', recommended);
    }
}

function renderGrid(containerId, products, isBoostedLayout = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if(!products || products.length === 0) {
        if(containerId === 'products-grid') container.innerHTML = '<div class="col-span-full text-center text-gray-500">Aucun produit trouvé.</div>';
        return;
    }
    products.forEach(p => {
        let card;
        if(isBoostedLayout) {
             card = `<div onclick="openDetail('${p.title}', '${p.price}', '${p.description}', '${p.image_url}', '${p.id}', '${p.store_id}')" class="bg-gradient-to-r from-synapse to-black p-1 rounded-xl cursor-pointer hover:scale-105 transition"><div class="bg-white dark:bg-dark-900 rounded-lg p-4 flex gap-4 h-full items-center"><img src="${p.image_url}" class="w-24 h-24 object-contain bg-white rounded"><div><span class="bg-red-500 text-white text-[10px] px-2 rounded font-bold">BOOSTÉ</span><h3 class="font-bold mt-1 text-black dark:text-white">${p.title}</h3><div class="text-xl font-black text-synapse-dark dark:text-synapse">${p.price} DA</div></div></div></div>`;
        } else {
             const isHot = p.view_count >= 100;
             card = `<div onclick="openDetail('${p.title}', '${p.price}', '${p.description}', '${p.image_url}', '${p.id}', '${p.store_id}')" class="bg-white dark:bg-dark-900 rounded-xl overflow-hidden hover:shadow-xl dark:hover:shadow-synapse/20 transition cursor-pointer group border border-gray-100 dark:border-dark-800 hover:border-synapse dark:hover:border-synapse relative">
                ${isHot ? '<span class="absolute top-2 left-2 z-10 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded">HOT</span>' : ''}
                <div class="h-48 bg-gray-100 dark:bg-dark-800 p-4 flex items-center justify-center">
                    <img src="${p.image_url || 'https://pngimg.com/d/box_PNG120.png'}" class="h-full object-contain group-hover:scale-110 transition">
                </div>
                <div class="p-4">
                    <h3 class="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 mb-2 font-semibold">${p.title}</h3>
                    <div class="flex items-center gap-2 mb-2"><span class="text-lg font-bold text-black dark:text-white">${p.price} DA</span></div>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center text-[10px] text-gray-500 gap-1"><i class="fa-solid fa-star text-synapse"></i> 5.0</div>
                        <button onclick="addToCart('${p.title}', '${p.price}', '${p.image_url}', '${p.id}'); event.stopPropagation()" class="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-700 hover:bg-synapse hover:text-black transition flex items-center justify-center"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            </div>`;
        }
        container.innerHTML += card;
    });
}

// --- OPEN DETAIL (Updated with Rating Display) ---
window.openDetail = async function(t, p, d, i, id, storeId) {
    document.getElementById('detail-title').innerText = t;
    document.getElementById('detail-price').innerText = p + " DA";
    document.getElementById('detail-desc').innerText = d || "Pas de description.";
    document.getElementById('detail-img').src = i;
    document.getElementById('detail-id').value = id;
    
    if(storeId) {
         const { data: store } = await supabase.from('stores').select('owner_id').eq('id', storeId).single();
         if(store) {
             document.getElementById('detail-store-id').value = store.owner_id; 
             const ratingData = await getSellerRating(store.owner_id);
             let starsHtml = '';
             for(let k=1; k<=5; k++) { if(k <= Math.round(ratingData.avg)) starsHtml += '<i class="fa-solid fa-star"></i>'; else starsHtml += '<i class="fa-regular fa-star"></i>'; }
             document.getElementById('detail-stars').innerHTML = starsHtml;
             document.getElementById('detail-rating-text').innerText = `(${ratingData.avg}/5) • ${ratingData.count} avis`;
         }
    }

    hideAllViews();
    document.getElementById('product-view').classList.remove('hidden');
    window.scrollTo(0,0);
    if(id) await supabase.rpc('increment_views', { row_id: id });
}

// --- PRODUCTS CRUD ---
window.publishProduct = async function() {
    const btn = document.getElementById('btn-publish');
    btn.innerText = "Publication..."; btn.disabled = true;

    const title = document.getElementById('prod-title').value;
    const price = document.getElementById('prod-price').value;
    const stock = document.getElementById('prod-stock').value;
    const desc = document.getElementById('prod-desc').value;
    const category = document.getElementById('prod-category').value;
    const file = document.getElementById('prod-image').files[0];

    if (!title || !price) {
        alert("Veuillez mettre un titre et un prix !");
        btn.innerText = "Publier l'annonce"; btn.disabled = false;
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return alert("Veuillez vous connecter d'abord !");

        let imageUrl = "https://pngimg.com/d/box_PNG120.png";
        if(file) {
            const fileName = `${Date.now()}_${file.name.replace(/\s/g, '')}`;
            const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file);
            if(uploadError) console.log("Upload fail", uploadError);
            else {
                const { data: publicUrl } = supabase.storage.from('products').getPublicUrl(fileName);
                imageUrl = publicUrl.publicUrl;
            }
        }

        let { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).single();
        if (!store) {
            const { data: newStore } = await supabase.from('stores').insert([{ 
                owner_id: user.id, name: "Boutique de " + user.user_metadata.full_name
            }]).select().single();
            store = newStore;
        }

        const { error: productError } = await supabase.from('products').insert([{
            store_id: store.id, title, description: desc, price, stock, category, image_url: imageUrl,
            is_hot: false, is_boosted: false
        }]);

        if (productError) throw productError;

        alert("Produit publié !");
        goHome(); 
        await fetchAllData(); 
        
    } catch (err) {
        console.error(err);
        alert("Erreur : " + err.message);
        btn.innerText = "Publier l'annonce"; btn.disabled = false;
    }
}

window.loadSellerProducts = async function() {
    const list = document.getElementById('seller-products-list');
    list.innerHTML = '<div class="text-center py-10"><span class="loader"></span></div>';

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;

        const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).single();
        if(!store) return list.innerHTML = '<div class="text-gray-500 text-center">Pas de boutique.</div>';

        const { data: products } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', store.id)
            .order('created_at', { ascending: false });

        if(!products || products.length === 0) {
            return list.innerHTML = '<div class="text-gray-500 p-10 text-center border border-dashed border-gray-800 rounded-xl">Aucun produit en vente.</div>';
        }

        list.innerHTML = '';
        products.forEach(p => {
            const safeTitle = p.title.replace(/'/g, "\\'");
            const safeDesc = (p.description || '').replace(/'/g, "\\'");
            
            list.innerHTML += `
            <div class="flex items-center gap-4 bg-dark-900 p-4 rounded-xl border border-gray-800">
                <img src="${p.image_url}" class="w-16 h-16 object-contain bg-white rounded-lg">
                <div class="flex-1">
                    <h4 class="font-bold text-white">${p.title}</h4>
                    <div class="text-sm text-gray-400">${p.price} DA • Stock: ${p.stock || 0}</div>
                </div>
                <button onclick="openEditProduct('${p.id}', '${safeTitle}', '${p.price}', '${p.stock}', '${safeDesc}')" class="bg-gray-700 hover:bg-synapse hover:text-black text-white px-4 py-2 rounded-lg text-sm font-bold transition">Modifier</button>
            </div>`;
        });

    } catch(e) { console.error(e); }
}

window.openEditProduct = function(id, title, price, stock, desc) {
    document.getElementById('edit-prod-id').value = id;
    document.getElementById('edit-prod-title').value = title;
    document.getElementById('edit-prod-price').value = price;
    document.getElementById('edit-prod-stock').value = stock;
    document.getElementById('edit-prod-desc').value = desc;
    document.getElementById('edit-modal').classList.remove('hidden');
}

window.saveProductChanges = async function() {
    const id = document.getElementById('edit-prod-id').value;
    const title = document.getElementById('edit-prod-title').value;
    const price = document.getElementById('edit-prod-price').value;
    const stock = document.getElementById('edit-prod-stock').value;
    const desc = document.getElementById('edit-prod-desc').value;

    const { error } = await supabase.from('products').update({
        title, price, stock, description: desc
    }).eq('id', id);

    if(error) alert("Erreur: " + error.message);
    else {
        alert("Produit mis à jour !");
        document.getElementById('edit-modal').classList.add('hidden');
        loadSellerProducts();
    }
}

// --- LOGIN/SIGNUP ---
window.handleLogin = async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message); else goHome();
}
window.handleSignUp = async function() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const firstName = document.getElementById('signup-firstname').value;
    const lastName = document.getElementById('signup-lastname').value;

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: { data: { full_name: firstName + ' ' + lastName, role: 'buyer' } }
        });
        
        if (error) throw error;

        const { error: loginError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if(!loginError) {
            alert("Compte créé et connecté !");
            await supabase.from('profiles').insert([{ id: data.user.id, full_name: firstName + ' ' + lastName }]);
            window.showDashboard();
        } else {
            alert("Compte créé ! Veuillez confirmer votre email si nécessaire.");
        }

    } catch (error) {
        alert("Erreur: " + error.message);
    }
}

// --- STATS ---
async function loadSellerStats() {
     const { data: { user } } = await supabase.auth.getUser();
     if(!user) return;
     const { data: store } = await supabase.from('stores').select('id, revenue').eq('owner_id', user.id).single();
     if(store) {
         const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('store_id', store.id);
         document.getElementById('stat-products').innerText = count || 0;
         document.getElementById('stat-revenue').innerText = (store.revenue || 0) + ' DA'; // Affichage Revenu Réel
     }
}

// --- COMMANDE SUBMIT ---
window.submitOrder = async function() {
    if(window.myCart.length === 0) return alert("Votre panier est vide !");
    const name = document.getElementById('checkout-name').value;
    const phone = document.getElementById('checkout-phone').value;
    const wilaya = document.getElementById('checkout-wilaya').value;

    if(!name || !phone || !wilaya) return alert("Veuillez remplir l'adresse de livraison.");

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return alert("Connectez-vous pour commander !");

        let total = 0;
        window.myCart.forEach(i => total += parseInt(i.price.replace(/\D/g, '')) || 0);

        const { data: order, error: orderError } = await supabase.from('orders').insert([{
            user_id: user.id,
            total_amount: total,
            shipping_address: `${name}, ${wilaya}, ${phone}`,
            status: 'en_attente'
        }]).select().single();

        if(orderError) throw orderError;

        const orderItems = window.myCart.map(item => ({
            order_id: order.id,
            product_id: item.id,
            price: parseInt(item.price.replace(/\D/g, '')) || 0,
            quantity: 1
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if(itemsError) throw itemsError;

        alert("Commande envoyée avec succès !");
        window.myCart = [];
        updateCartUI();
        goHome();

    } catch(e) { alert("Erreur commande: " + e.message); }
}

// Init
fetchAllData();
</script>
</body>
</html>
