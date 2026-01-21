/**
 * RAILSPK OFFICIAL LOGIC SYSTEM
 * Version: 4.5.1 (Full Overwrite - Everything Included)
 * Project: therails.pk
 */

// --- 1. CONFIGURATION & STATE ---
const appId = "railspk-official-1de54"; 
const GA_ID = "G-QL2CKH2MBL"; 

const firebaseConfig = { 
    apiKey: "AIzaSyCfoXeQk-6ubcJZz3ES7c6yE2IWSFp2z9A", 
    authDomain: "railspk-official-1de54.firebaseapp.com", 
    projectId: "railspk-official-1de54", 
    storageBucket: "railspk-official-1de54.firebasestorage.app", 
    messagingSenderId: "282037027182", 
    appId: "1:282037027182:web:6b4f8bb420eb410374c17f" 
};

let db, auth, user, adminAuthorised = false;
let YT_KEY = null, YT_CHANNEL = null; 
let yt_token = null, yt_duration = 'long', allReviews = [];
let expandedPosts = {}; 
let currentSliderImages = [], currentSliderIndex = 0, sliderTimer = null;

// --- 2. PREMIUM TRAIN DATA ---
const trainsData = [
    { 
        id: 'greenline', 
        name: 'Green Line Express', 
        route: 'Karachi ⟷ Islamabad Margalla', 
        cities: ['Karachi', 'Hyderabad', 'Rohri', 'Bahawalpur','Khanewal','Lahore', 'Rawalpindi', 'Islamabad'], 
        slides: ['greenline_7.webp','greenline_2.webp','greenline_1.webp'], 
        fares: [{class:"AC Parlor",price:"Rs. 13,500"},{class:"Economy",price:"Rs. 4,500"},{class:"Standard",price:"Rs. 7,500"},{class:"Business",price:"Rs. 10,500"}],
        stats: { punctuality: '95%', cleanliness: 5, food: 4, behavior: 5 },
        amenities: ['wifi', 'charging', 'bedding', 'dining', 'ac'],
        composition: { parlor: '01 Coach', business: '06 Coaches', standard: '06 Coach', economy: '05 Coaches' }
    },
    { 
        id: 'khybermail', 
        name: 'Khyber Mail Express', 
        route: 'Karachi ⟷ Peshawar', 
        cities: ['Karachi', 'Multan', 'Lahore', 'Peshawar'], 
        slides: ['coming_soon.avif'], 
        fares: [{class:"AC Sleeper",price:"Rs. 13,000"},{class:"Economy",price:"Rs. 4,000"},{class:"Standard",price:"Rs. 7,000"},{class:"Business",price:"Rs. 10,000"}],
        stats: { punctuality: '82%', cleanliness: 3, food: 3, behavior: 4 },
        amenities: ['charging', 'bedding', 'dining', 'ac'],
        composition: { parlor: 'None', business: '03 Coaches', standard: '02 Coaches', economy: '08 Coaches' }
    },
    { 
        id: 'karakoram', 
        name: 'Karakoram Express', 
        route: 'Karachi ⟷ Lahore', 
        cities: ['Karachi', 'Hyderabad', 'Rohri', 'Lahore'], 
        slides: ['karakoram_express_train_rake.webp'], 
        fares: [{class:"AC Business",price:"Rs. 9,500"},{class:"Economy",price:"Rs. 4,000"},{class:"Standard",price:"Rs. 7,000"}],
        stats: { punctuality: '90%', cleanliness: 4, food: 4, behavior: 5 },
        amenities: ['wifi', 'charging', 'bedding', 'dining', 'ac'],
        composition: { parlor: 'None', business: '02 Coaches', standard: '02 Coaches', economy: '13 Coaches' }
    },
    { 
        id: 'shalimar', 
        name: 'Shalimar Express', 
        route: 'Karachi ⟷ Lahore', 
        cities: ['Karachi', 'Drigh Road Jn', 'Landhi Jn', 'Hyderabad', 'Rohri', 'Rahim Yar Khan', 'Khanpur', 'Multan', 'Faisalabad', 'Lahore'], 
        slides: ['shalimar_1.webp','shalimar_2.webp','shalimar_3.webp'], 
        fares: [{class:"AC Parlor",price:"Rs. 10,100"},{class:"Economy",price:"Rs. 4,100"},{class:"Standard",price:"Rs. 7,500"},{class:"Business",price:"Rs. 10,600"}],
        stats: { punctuality: '95%', cleanliness: 5, food: 5, behavior: 5 },
        amenities: ['wifi', 'charging', 'bedding', 'dining', 'ac'],
        composition: { parlor: 'None', business: '02 Coaches', standard: '02 Coaches', economy: '13 Coaches' }
    }
];

const galleryData = [
    { title: "Green Line Dawn", src: "images/train_background.webp" },
    { title: "Track Symmetry", src: "images/train_background2.webp" },
    { title: "ZCU-30 Locomotive", src: "images/zcu30_locomotive.webp" },
    { title: "ZCU-20 Power", src: "images/zcu20_locomotive.webp" },
    { title: "Subak Kharam Railcar", src: "images/railcar_new_train.webp" },
    { title: "GEU-40 Fleet", src: "images/geu40_locomotive.webp" },
    { title: "HGMU-30 Class", src: "images/hgmu30_locomotive.webp" },
];

// --- 3. DAILY VIEW TRACKER ---
async function trackDailyView() {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const viewRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('analytics').doc(today);

    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(viewRef);
            if (!doc.exists) {
                transaction.set(viewRef, { views: 1 });
            } else {
                const newCount = (doc.data().views || 0) + 1;
                transaction.update(viewRef, { views: newCount });
            }
        });
        
        viewRef.onSnapshot(doc => {
            if (doc.exists) {
                const count = doc.data().views;
                const headerElem = document.getElementById('daily-views-header');
                const aboutElem = document.getElementById('stat-views');
                if (headerElem) headerElem.innerText = count.toLocaleString();
                if (aboutElem) aboutElem.innerText = count.toLocaleString();
            }
        });
    } catch (e) { console.error("Analytics Error", e); }
}

// --- 4. NAVIGATION & SPA ROUTING ---
function routeTo(e, p){ 
    if(e) e.preventDefault(); 
    window.history.pushState({}, "", p); 
    handleRouting(); 
}

function handleRouting(){ 
    let p = window.location.pathname.split('/').pop() || 'home'; 
    if(p.endsWith('.html')) p = p.replace('.html', ''); 
    if(p === '' || p === 'index') p = 'home'; 
    
    document.querySelectorAll('.page-view').forEach(v => v.classList.toggle('active', v.id === p + '-view'));
    window.scrollTo(0, 0); 
    
    if (window.gtag) {
        gtag('event', 'page_view', { page_path: p, page_title: p.charAt(0).toUpperCase() + p.slice(1) });
    }

    if (p === 'home') {
        trackDailyView();
        if(YT_KEY) fetchVideos('long');
    }
    if(p === 'gallery') renderGallery();
    if(p === 'reviews') renderTrainCards();
}

// --- 5. FIREBASE & CONFIG SYNC ---
async function initFirebase() {
    try {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore(); 
        auth = firebase.auth();

        await auth.signInAnonymously();

        auth.onAuthStateChanged(async (u) => {
            user = u; 
            if (user) { 
                await fetchSecureConfigs(); 
                startReviewsListener(); 
                startPollsListener(); 
                fetchUpdates(); 
                handleRouting(); 
            }
        });
    } catch (e) { console.error("Firebase Error", e); }
}

async function fetchSecureConfigs() {
    try {
        const doc = await db.collection('artifacts').doc('youtube').get();
        if (doc.exists) {
            const data = doc.data();
            const keys = Object.keys(data);
            if (keys.length > 0) {
                YT_KEY = keys[0]; 
                YT_CHANNEL = data[YT_KEY]; 
                if(window.location.pathname.includes('home') || window.location.pathname === '/') fetchVideos('long');
            }
        }
    } catch (e) { console.error("Config fetch failed", e); }
}

// --- 6. COMMUNITY CLOUD (Standardized Posts) ---
function fetchUpdates() {
    if (!user) return;
    db.collection('artifacts').doc(appId).collection('public').doc('data').collection('updates').onSnapshot(snap => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b)=>b.timestamp-a.timestamp);
        const container = document.getElementById('updates-container'); 
        if (!container) return;
        
        container.innerHTML = data.map(u => {
            const urls = u.imageUrls || (u.imageUrl ? [u.imageUrl] : []);
            const isExpanded = expandedPosts[u.id] || false;
            const threshold = 180;
            const needsTruncation = (u.content || "").length > threshold;
            const displayContent = (needsTruncation && !isExpanded) ? u.content.substring(0, threshold) + "..." : u.content;

            return `
            <div class="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-xl text-left flex flex-col h-full min-h-[480px] transition-all">
                <div class="flex justify-between mb-4 text-[9px] font-black uppercase text-gray-400">
                    <span>Neural Broadcast</span><span>${formatTimestamp(u.timestamp)}</span>
                </div>
                <div class="mb-5 min-h-[220px]">
                    ${urls.length > 0 ? renderUpdateGrid(urls) : `<div class="w-full h-44 bg-gray-50 dark:bg-rail-dark rounded-2xl flex items-center justify-center opacity-40 border-2 border-dashed border-gray-100 dark:border-gray-700"><i class="fas fa-bullhorn text-4xl"></i></div>`}
                </div>
                <h3 class="text-xl md:text-2xl font-black uppercase mb-3 italic tracking-tighter text-gray-900 dark:text-white leading-tight">${escapeHTML(u.title)}</h3>
                <div class="text-gray-500 dark:text-gray-400 text-xs md:text-sm mb-6 leading-relaxed flex-grow">
                    ${parseHashtags(displayContent)}
                    ${needsTruncation ? `<button onclick="togglePost('${u.id}')" class="text-rail-accent font-black uppercase text-[10px] ml-1 hover:underline tracking-widest">${isExpanded ? "Show Less" : "Read More..."}</button>` : ""}
                </div>
                <div class="mt-auto pt-5 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div class="flex space-x-6 text-xs font-black">
                        <button onclick="handleReaction('${u.id}', 'like')" class="hover:scale-110 transition">👍 ${u.reactions?.like || 0}</button>
                        <button onclick="handleReaction('${u.id}', 'heart')" class="hover:scale-110 transition">❤️ ${u.reactions?.heart || 0}</button>
                    </div>
                </div>
                ${(isExpanded || !needsTruncation) ? `
                <div class="mt-6 pt-6 border-t-2 border-dashed border-gray-100 dark:border-gray-700 animate-fadeIn">
                    <div id="comments-list-${u.id}" class="max-h-52 overflow-y-auto custom-scrollbar mb-4 pr-1"></div>
                    <form onsubmit="handleCommentSubmit(event, '${u.id}')" class="flex gap-2">
                        <input type="text" placeholder="Type reply..." required class="flex-1 bg-gray-50 dark:bg-rail-dark p-4 rounded-2xl text-[10px] outline-none border border-transparent focus:border-rail-accent transition-all">
                        <button type="submit" class="bg-rail-accent text-white px-6 rounded-xl hover:bg-indigo-700 transition"><i class="fas fa-paper-plane text-xs"></i></button>
                    </form>
                </div>` : ""}
            </div>`;
        }).join('') || '<p class="col-span-full text-center py-20 text-gray-400 font-black italic">No updates synchronized.</p>';

        data.forEach(u => { if (expandedPosts[u.id] || (u.content || "").length <= 180) renderComments(u.id, `comments-list-${u.id}`); });
    });
}

function togglePost(postId) { expandedPosts[postId] = !expandedPosts[postId]; fetchUpdates(); }

// --- 7. TRAIN SCORECARDS & EXPLORE MODE ---
function renderTrainCards(filter = 'all') {
    const grid = document.getElementById('scorecards-grid'); if (!grid) return;
    let data = trainsData; if (filter !== 'all') data = trainsData.filter(t => t.cities.includes(filter));
    
    grid.innerHTML = data.map(t => {
        const fullSlidePaths = (t.slides || []).map(s => 'images/' + s);
        const escapedSlides = JSON.stringify(fullSlidePaths).replace(/"/g, '&quot;');
        return `
            <div class="bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden flex flex-col group transition-all duration-500 hover:translate-y-[-8px]">
                <div class="p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center">
                    <div class="w-full md:w-[40%] space-y-6">
                        <div>
                            <h3 class="text-2xl md:text-3xl font-black uppercase text-gray-900 dark:text-white mb-1 tracking-tighter italic">${t.name}</h3>
                            <p class="text-rail-accent font-black text-[10px] uppercase tracking-[0.3em]">${t.route}</p>
                        </div>
                        <div class="bg-gray-50 dark:bg-rail-dark p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 space-y-3">
                            ${t.fares.map(f=>`<div class="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0 last:pb-0"><span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">${f.class}</span><span class="text-rail-accent font-black text-xs italic">${f.price}</span></div>`).join('')}
                        </div>
                        <button onclick="openExploreModal('${t.id}')" class="w-full bg-rail-dark dark:bg-rail-accent text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-lg hover:scale-[1.02] transition-all">Explore Neural Mode <i class="fas fa-microchip ml-2"></i></button>
                    </div>
                    <div class="w-full md:w-[60%] md:h-[380px] rounded-[2.5rem] overflow-hidden cursor-pointer shadow-2xl relative bg-gray-100 dark:bg-gray-700" onclick="openSliderModal(${escapedSlides}, 0)">
                        <img src="images/${t.slides[0]}" alt="${t.name}" loading="lazy" class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110">
                        <div class="absolute bottom-6 right-6 bg-black/60 text-white text-[10px] px-6 py-2 rounded-full font-black backdrop-blur-md border border-white/10 uppercase tracking-widest italic">${t.slides.length} Viewpoints</div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function openExploreModal(trainId) {
    const t = trainsData.find(x => x.id === trainId); if(!t) return;
    const modal = document.getElementById('explore-modal');
    const content = document.getElementById('explore-modal-content');
    const getStars = (count) => '⭐'.repeat(count) + '☆'.repeat(5-count);
    const amenityMap = { 'wifi': { icon: 'fa-wifi', label: 'Wi-Fi' }, 'charging': { icon: 'fa-plug', label: 'Charging' }, 'bedding': { icon: 'fa-bed', label: 'Bedding' }, 'dining': { icon: 'fa-utensils', label: 'Dining Car' }, 'ac': { icon: 'fa-snowflake', label: 'AC System' } };

    content.innerHTML = `
        <div class="text-center mb-10"><h2 class="text-4xl md:text-6xl font-black uppercase italic text-gray-900 dark:text-white mb-2 tracking-tighter">${t.name}</h2><div class="inline-block bg-rail-accent/10 text-rail-accent px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-[0.3em]">Verified Neural Review</div></div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div class="space-y-6">
                <h4 class="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 border-b pb-2 italic">Analytics</h4>
                <div class="space-y-4">
                    <div class="flex justify-between items-center"><span class="text-xs font-bold uppercase italic">Punctuality</span><span class="bg-green-100 dark:bg-green-900/30 text-green-600 px-3 py-1 rounded-lg font-black text-[10px]">${t.stats.punctuality}</span></div>
                    <div class="flex justify-between items-center"><span class="text-xs font-bold text-gray-500 uppercase italic">Cleanliness</span><span class="stars">${getStars(t.stats.cleanliness)}</span></div>
                    <div class="flex justify-between items-center"><span class="text-xs font-bold text-gray-500 uppercase italic">Food Quality</span><span class="stars">${getStars(t.stats.food)}</span></div>
                    <div class="flex justify-between items-center"><span class="text-xs font-bold text-gray-500 uppercase italic">Behavior</span><span class="stars">${getStars(t.stats.behavior)}</span></div>
                </div>
            </div>
            <div class="space-y-6">
                <h4 class="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 border-b pb-2 italic">Amenities</h4>
                <div class="grid grid-cols-2 gap-3">
                    ${t.amenities.map(key => `<div class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-800 transition hover:border-rail-accent group"><i class="fas ${amenityMap[key].icon} text-rail-accent group-hover:scale-110 transition"></i><span class="text-[9px] font-black uppercase tracking-widest">${amenityMap[key].label}</span></div>`).join('')}
                </div>
            </div>
        </div>
        <div class="mt-12 bg-rail-accent/5 p-8 rounded-4xl border border-rail-accent/10"><h4 class="text-[10px] font-black uppercase tracking-[0.4em] text-rail-accent mb-6 text-center italic">Composition</h4><div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">${Object.entries(t.composition).map(([key, val]) => `<div><span class="block text-[8px] font-black uppercase text-gray-400 tracking-widest">${key}</span><span class="font-black text-xs text-gray-900 dark:text-white uppercase italic">${val}</span></div>`).join('')}</div></div>
    `;
    modal.classList.remove('hidden'); modal.classList.add('flex'); document.body.style.overflow = 'hidden';
}

// --- 8. UTILS & MODALS ---
function renderUpdateGrid(urls) {
    const escapedUrls = JSON.stringify(urls).replace(/"/g, '&quot;');
    if(urls.length === 1) return `<img src="${urls[0]}" onclick="openSliderModal(['${urls[0]}'], 0)" class="w-full h-52 md:h-64 object-cover rounded-2xl shadow-lg cursor-zoom-in">`;
    const imagesHtml = urls.slice(0, 2).map((url, idx) => `<div class="relative overflow-hidden cursor-zoom-in aspect-square rounded-xl" onclick="openSliderModal(${escapedUrls}, ${idx})"><img src="${url}" class="w-full h-full object-cover hover:scale-105 transition duration-500"></div>`).join('');
    return `<div class="grid grid-cols-2 gap-3 h-48 md:h-56">${imagesHtml}</div>`;
}

function openSliderModal(images, index) {
    if(!images || images.length === 0) return;
    currentSliderImages = Array.isArray(images) ? images : [images];
    currentSliderIndex = index;
    if(sliderTimer) clearInterval(sliderTimer);
    updateSliderDisplay();
    document.getElementById('image-modal').classList.remove('hidden'); document.getElementById('image-modal').classList.add('flex'); document.body.style.overflow = 'hidden';
    const ctrl = document.getElementById('slider-controls');
    if(ctrl) { if(currentSliderImages.length > 1) { ctrl.classList.remove('hidden', 'opacity-0'); ctrl.classList.add('opacity-100'); sliderTimer = setInterval(nextSlide, 4000); } else ctrl.classList.add('hidden', 'opacity-0'); }
}

function updateSliderDisplay() {
    const img = document.getElementById('modal-image-content'); if(!img) return;
    img.style.opacity = '0'; setTimeout(() => { img.src = currentSliderImages[currentSliderIndex]; img.style.opacity = '1'; document.getElementById('slider-counter').innerText = `${currentSliderIndex + 1} / ${currentSliderImages.length}`; }, 150);
}

function nextSlide(e) { if(e) e.stopPropagation(); currentSliderIndex = (currentSliderIndex + 1) % currentSliderImages.length; updateSliderDisplay(); }
function prevSlide(e) { if(e) e.stopPropagation(); currentSliderIndex = (currentSliderIndex - 1 + currentSliderImages.length) % currentSliderImages.length; updateSliderDisplay(); }

function openVideo(id) { 
    document.getElementById('video-embed-container').innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${id}?autoplay=1" frameborder="0" allowfullscreen></iframe>`; 
    document.getElementById('video-modal').classList.remove('hidden'); document.getElementById('video-modal').classList.add('flex'); document.body.style.overflow = 'hidden';
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); document.body.style.overflow = 'auto'; if(id==='video-modal') document.getElementById('video-embed-container').innerHTML = ''; if(id === 'image-modal' && sliderTimer) clearInterval(sliderTimer); }

// --- 9. LISTENERS ---
function startReviewsListener() {
    if (!user) return;
    db.collection('artifacts').doc(appId).collection('public').doc('data').collection('reviews').onSnapshot(snap => {
        allReviews = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if(window.location.pathname.includes('reviews')) renderTrainCards(); 
    });
}

function startPollsListener() {
    if (!user) return;
    db.collection('artifacts').doc(appId).collection('public').doc('data').collection('polls').onSnapshot(snap => {
        const container = document.getElementById('polls-container'); if (!container) return;
        const polls = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        container.innerHTML = polls.map(p => {
            const total = (p.options || []).reduce((a, b) => a + (b.votes || 0), 0);
            return `<div class="bg-white dark:bg-rail-dark p-10 rounded-[3rem] border-2 border-rail-accent shadow-2xl text-left mb-8"><h3 class="text-2xl font-black italic uppercase mb-8 text-gray-900 dark:text-white tracking-tighter">${escapeHTML(p.question)}</h3><div class="space-y-6">
                    ${p.options.map((o, i) => {
                        const per = total > 0 ? Math.round((o.votes / total) * 100) : 0;
                        return `<div class="cursor-pointer group" onclick="castVote('${p.id}', ${i})"><div class="flex justify-between font-black text-[11px] uppercase mb-2 text-gray-500 dark:text-gray-400"><span>${escapeHTML(o.text)}</span><span class="text-rail-accent">${per}%</span></div><div class="h-10 bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700"><div class="h-full bg-rail-accent transition-all duration-1000 ease-out" style="width: ${per}%"></div></div></div>`;
                    }).join('')}</div></div>`;
        }).join('');
    });
}

async function castVote(id, idx) {
    if (!user) return;
    const ref = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('polls').doc(id);
    await db.runTransaction(async t => {
        const doc = await t.get(ref); if (!doc.exists) return;
        const opts = doc.data().options; opts[idx].votes = (opts[idx].votes || 0) + 1;
        t.update(ref, { options: opts });
    });
}

function renderGallery() {
    const grid = document.getElementById('gallery-grid'); if (!grid) return;
    grid.innerHTML = galleryData.map(img => `<div class="group relative overflow-hidden rounded-[2.5rem] bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl" onclick="openSliderModal(['${img.src}'], 0)"><img src="${img.src}" loading="lazy" class="w-full h-80 object-cover transition duration-700 group-hover:scale-110 cursor-zoom-in"><div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition duration-500 flex flex-col justify-end p-8"><h4 class="text-white text-xl font-black italic uppercase">${img.title}</h4></div></div>`).join('');
}

async function handleCommentSubmit(e, postId) { 
    e.preventDefault(); 
    const input = e.target.querySelector('input'); 
    if(!input.value.trim() || !user) return; 
    try {
        await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('updates').doc(postId).collection('comments').add({ 
            text: input.value.trim(), 
            userId: user.uid, 
            timestamp: Date.now() 
        }); 
        input.value = ""; 
    } catch(err) { console.error("Comment fail"); }
}

function renderComments(postId, cid) { 
    const cont = document.getElementById(cid); 
    if(!cont) return; 
    db.collection('artifacts').doc(appId).collection('public').doc('data').collection('updates').doc(postId).collection('comments').onSnapshot(snap => { 
        const coms = snap.docs.map(doc => doc.data()).sort((a,b)=>b.timestamp-a.timestamp); 
        cont.innerHTML = coms.map(c => `<div class="bg-gray-50 dark:bg-rail-dark p-3 rounded-xl mb-2 border border-gray-100 dark:border-gray-800"><p class="text-[10px] text-gray-600 dark:text-gray-300">${escapeHTML(c.text)}</p></div>`).join('') || '<p class="text-[9px] text-gray-400 italic text-center py-2">No interactions yet.</p>'; 
    }); 
}

async function handleReaction(id, type) {
    if (!user) return;
    const ref = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('updates').doc(id);
    await db.runTransaction(async t => {
        const doc = await t.get(ref); if (!doc.exists) return;
        const reactions = doc.data().reactions || {like:0,heart:0};
        reactions[type] = (reactions[type] || 0) + 1;
        t.update(ref, { reactions });
    });
}

// --- 10. YT API ---
async function fetchVideos(d) {
    const container = document.getElementById('video-cards-container'); if (!container || !YT_KEY) return;
    try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${YT_KEY}&channelId=${YT_CHANNEL}&part=snippet,id&order=date&maxResults=3&type=video`);
        const data = await res.json(); container.innerHTML = '';
        if (data.items) data.items.forEach(v => {
            container.innerHTML += `<div class="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl group cursor-pointer" onclick="openVideo('${v.id.videoId}')"><div class="aspect-video relative overflow-hidden"><img src="https://img.youtube.com/vi/${v.id.videoId}/maxresdefault.jpg" class="w-full h-full object-cover transition duration-700 group-hover:scale-105" loading="lazy"></div><div class="p-8 text-left"><h3 class="text-xs font-black uppercase line-clamp-2">${v.snippet.title}</h3></div></div>`;
        });
    } catch (e) { console.error("YT API Error"); }
}

// --- 11. INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => { 
    initFirebase(); 
    const isDark = localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
    
    document.getElementById('theme-toggle').onclick = () => { 
        const now = document.documentElement.classList.toggle('dark'); 
        localStorage.setItem('theme', now ? 'dark' : 'light'); 
    };
    
    document.getElementById('admin-trigger').onclick = () => { 
        if(prompt("Admin Key:") === "railspk786") { 
            adminAuthorised = true; 
            document.getElementById('admin-panel').classList.remove('hidden'); 
            routeTo(null, '/community'); 
        } 
    };
});

window.onpopstate = handleRouting;
function toggleMenu() { document.getElementById('mobile-menu')?.classList.toggle('hidden'); }