// --- 1. GLOBAL STATE & HELPERS ---
let db, auth, user, adminAuthorised = false;
let YT_KEY = null, YT_CHANNEL = null; 
let yt_token = null, allReviews = [];
let expandedPosts = {}; 
let currentSliderImages = [], currentSliderIndex = 0, sliderTimer = null;
let editingPostId = null;
let postComments = [];

function startCommentsListener() {
    if(!user) return;
    db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('communityComments')
      .onSnapshot(snap => {
          postComments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          fetchUpdates(); 
      });
}

function formatTimestamp(ts) {
    if(!ts) return "Abhi";
    const d = new Date(ts);
    return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(s) { if(!s) return ""; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function parseHashtags(text) { 
    if(!text) return ""; 
    return escapeHTML(text).replace(/#(\w+)/g, '<span class="text-rail-accent font-bold cursor-pointer hover:underline">#$1</span>'); 
}

// --- 2. CONFIGURATION & FIREBASE INIT ---
const appId = "railspk-official-1de54"; 
const firebaseConfig = { 
    apiKey: "AIzaSyCfoXeQk-6ubcJZz3ES7c6yE2IWSFp2z9A", 
    authDomain: "railspk-official-1de54.firebaseapp.com", 
    projectId: "railspk-official-1de54", 
    storageBucket: "railspk-official-1de54.firebasestorage.app", 
    messagingSenderId: "282037027182", 
    appId: "1:282037027182:web:6b4f8bb420eb410374c17f" 
};

let messaging;

async function initFirebase() {
    try {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore(); auth = firebase.auth();
        messaging = firebase.messaging();

        await auth.signInAnonymously();
        
        auth.onAuthStateChanged(async u => {
            user = u; 
            if (u) {
                console.log("Neural Link: Online.");
                const config = await db.collection('artifacts').doc('youtube').get();
                if (config.exists) { 
                    const data = config.data();
                    YT_KEY = Object.keys(data)[0]; 
                    YT_CHANNEL = data[YT_KEY]; 
                }
                startGlobalListeners(); 
                handleRouting(); 
                fetchUpdates(); 
                startPollsListener();
            }
        });
    } catch (e) { console.error("Firebase Connection Failed:", e); }
}

async function enableNotifications() {
    if (!messaging) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await messaging.getToken({ 
                vapidKey: 'BM8ed0cwNdM-Q7NIKmxnvbr251_BEOz4DkMRfBpIKqC2AlNNuQRP7HbQIKZs6-wYYefBCLUW5ragtjDDx2ctOwE'
            });
            if (token) {
                await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('subscribers').doc(token).set({
                    subscribedAt: Date.now()
                });
                showNotification("Success", "Ab aapko Railway Updates milti raheingi!");
            }
        }
    } catch (error) { console.error('Notification error:', error); }
}

// --- TRAINS DATA ---
const trainsData = [
    { id: 'greenline', name: 'Green Line Express', route: 'Karachi ⟷ Islamabad', cities: ['Karachi', 'Hyderabad', 'Rohri', 'Bahawalpur', 'Khanewal', 'Lahore', 'Rawalpindi', 'Islamabad'], slides: ['greenline_7.webp','greenline_2.webp','greenline_1.webp','greenline_4.webp','greenline_5.webp','greenline_6.webp','greenline_8.webp','greenline_9.webp'], fares: [{class:"AC Parlor",price:"Rs. 12,250"},{class:"Economy",price:"Rs. 6,150"},{class:"AC Business",price:"Rs. 13,950"},{class:"AC Standard",price:"Rs. 11,150"}], stats: { punctuality: '95%', cleanliness: 5, food: 4, behavior: 5 }, amenities: ['wifi', 'charging', 'bedding', 'dining', 'ac'], composition: { parlor: '01', business: '06', standard: '06', economy: '05', diningcar: '01' } },
    { id: 'shalimar', name: 'Shalimar Express', route: 'Karachi ⟷ Lahore', cities: ['Karachi', 'Hyderabad', 'Faisalabad', 'Lahore'], slides: ['shalimar_8.webp','shalimar_2.webp','shalimar_3.webp','shalimar_4.webp','shalimar_5.webp','shalimar_6.webp','shalimar_7.webp','shalimar_8.webp','shalimar_1.webp'], fares: [{class:"AC Parlor",price:"Rs. 10,700"},{class:"Economy",price:"Rs.4,010"},{class:"AC Business",price:"Rs. 11,400"},{class:"AC Standard",price:"Rs. 8,700"}], stats: { punctuality: '95%', cleanliness: 5, food: 5, behavior: 5 }, amenities: ['wifi', 'charging', 'bedding', 'dining', 'ac'], composition: { parlor: '01', business: '01', standard: '02', economy: '11', diningcar: '01' } },
    { id: 'karakoram', name: 'Karakoram Express', route: 'Karachi ⟷ Lahore', cities: ['Karachi', 'Hyderabad', 'Rohri', 'Bahawalpur', 'Khanewal', 'Toba Tek Singh', 'Faisalabad', 'Lahore'], slides: ['karakoram_express_train_rake.webp','millat_express_vs_karakoram_express.webp'], fares: [{class:"AC Business",price:"Rs. 10,500"},{class:"Economy",price:"Rs. 4,750"},{class:"AC Standard",price:"Rs. 8,300"}], stats: { punctuality: '90%', cleanliness: 4, food: 3, behavior: 3 }, amenities: ['ac'], composition: { business: '02', economy: '11', standard: '02' } },
    { id: 'pakbusiness', name: 'Pak Business Express', route: 'Karachi ⟷ Lahore', cities: ['Karachi', 'Hyderabad', 'Nawabshah', 'Rohri', 'Rahim Yar Khan', 'Bahawalpur', 'Khanewal', 'Chicha Watni', 'Sahiwal', 'Raiwind', 'Kot lakhpat', 'Lahore'], slides: ['business_1.webp','business_2.webp','business_3.webp','business_4.webp','business_5.webp','business_6.webp','business_7.webp'], fares: [{class:"AC Standard",price:"Rs. 8,700"},{class:"Economy",price:"Rs. 5,350"}], stats: { punctuality: '90%', cleanliness: 5, food: 5, behavior: 5 }, amenities: ['wifi', 'charging', 'bedding', 'dining', 'ac'], composition: { standard: '04', economy: '11', diningcar: '01' } },
    { id: 'allamaiqbal', name: 'Allama Iqbal Express', route: 'Karachi ⟷ Sialkot', cities: ['Karachi', 'Hyderabad', 'Rohri', 'Khanewal', 'Sahiwal', 'Lahore', 'Sialkot'], slides: ['allama_1.webp','allama_2.webp','allama_3.webp','allama_4.webp'], fares: [{class:"AC Standard",price:"Rs. 6,800"},{class:"Economy",price:"Rs. 3,500"}], stats: { punctuality: '75%', cleanliness: 3, food: 3, behavior: 4 }, amenities: ['charging', 'dining', 'ac'], composition: { business: '04', economy: '10' } },
    { id: 'mehran', name: 'Mehran Express', route: 'Karachi ⟷ Mirpur Khas', cities: ['Karachi', 'Hyderabad', 'Mirpur Khas'], slides: ['mehran_4.webp','mehran_2.webp','mehran_3.webp','mehran_1.webp'], fares: [{class:"Economy",price:"Rs. 800"}], stats: { punctuality: '70%', cleanliness: 2, food: 2, behavior: 3 }, amenities: ['dining'], composition: { economy: '10' } },
    { id: 'khybermail', name: 'Khyber Mail Express', route: 'Karachi ⟷ Peshawar', cities: ['Karachi', 'Multan', 'Lahore', 'Peshawar'], slides: ['coming_soon.avif'], fares: [{class:"AC Sleeper",price:"Rs. 13,000"},{class:"Economy",price:"Rs. 4,000"}], stats: { punctuality: '82%', cleanliness: 3, food: 3, behavior: 4 }, amenities: ['charging', 'bedding', 'dining', 'ac'], composition: { business: '03', standard: '02', economy: '08' } },
    { id: 'sukkur', name: 'Sukkur Express', route: 'Karachi ⟷ Jacobabad', cities: ['Karachi', 'Hyderabad', 'Rohri', 'Sukkur', 'Shikarpur', 'Jacobabad'], slides: ['coming_soon.avif'], fares: [{class:"AC Sleeper",price:"Rs. 6,500"},{class:"Economy",price:"Rs. 1,700"},{class:"AC Standard",price:"Rs. 3,200"},{class:"AC Business",price:"Rs. 4,150"}], stats: { punctuality: '65%', cleanliness: 4, food: 3, behavior: 3 }, amenities: ['charging', 'dining', 'ac'], composition: {sleeper: '01', business: '01', standard: '02', economy: '12' } },
    { id: 'karachi', name: 'Karachi Express', route: 'Karachi ⟷ Lahore', cities: ['Karachi', 'Hyderabad', 'Nawabshah', 'Rohri', 'Bahawalpur', 'Multan', 'Khanewal', 'Sahiwal', 'Okara', 'Raiwind', 'Kot lakhpat', 'Lahore'], slides: ['coming_soon.avif'], fares: [{class:"AC Sleeper",price:"Rs. 14,850"},{class:"Economy",price:"Rs. 5,000"},{class:"AC Standard",price:"Rs. 8,700"},{class:"AC Business",price:"Rs. 11,550"}], stats: { punctuality: '85%', cleanliness: 4, food: 4, behavior: 4 }, amenities: ['charging', 'dining', 'ac'], composition: {sleeper: '02', business: '01', standard: '02', economy: '12' } },

];

const galleryData = [
    { title: "Green Line Dawn", src: "images/train_background.webp" },
    { title: "Track Symmetry", src: "images/train_background2.webp" },
    { title: "Locomotive ZCU-30", src: "images/zcu30_locomotive.webp" },
    { title: "Karachi Sunset", src: "images/sunset_karachi_cantt_station_view.webp" },
    { title: "GEU-40 Fleet", src: "images/geu40_locomotive.webp" },
    { title: "Railcar Heritage", src: "images/railcar_new_train.webp" }
];

// --- 3. NAVIGATION & SPA ROUTING ---
function routeTo(e, p){ 
    if(e) e.preventDefault(); 
    window.history.pushState({}, "", p); 
    handleRouting(); 
}
function handleRouting(){ 
    let p = window.location.pathname.split('/').pop() || 'home'; 
    if(p.endsWith('.html')) p = p.replace('.html', ''); 
    if(p === '' || p === 'index') p = 'home'; 

    const baseUrl = "https://therails.pk";
    const canonicalLink = document.getElementById('dynamic-canonical');
    if (canonicalLink) {
        const newCanonical = p === 'home' ? baseUrl + '/' : baseUrl + '/' + p;
        canonicalLink.setAttribute('href', newCanonical);
    }

    const pageName = p.charAt(0).toUpperCase() + p.slice(1);
    document.title = p === 'home' 
        ? "The RAILSPK - Pakistan Railways Hub | Reviews & Vlogs" 
        : `${pageName} - The RAILSPK`;

    document.querySelectorAll('.page-view').forEach(v => v.classList.toggle('active', v.id === p + '-view'));
    window.scrollTo(0, 0); 
    
    if (p === 'home') { if(YT_KEY) fetchVideos(); }
    if (p === 'gallery') renderGallery();
    if (p === 'reviews') renderTrainCards();
}

// --- 4. SEARCH & FILTER LOGIC (NEW FIXED FUNCTION) ---
function handleSearch() {
    const searchInput = document.getElementById('train-search-input');
    const filterSelect = document.getElementById('terminal-filter');
    
    if (!searchInput || !filterSelect) return;

    const query = searchInput.value.toLowerCase().trim();
    const terminal = filterSelect.value;

    const filtered = trainsData.filter(train => {
        const nameMatches = train.name.toLowerCase().includes(query);
        const routeMatches = train.route.toLowerCase().includes(query);
        const terminalMatches = (terminal === 'all') || train.cities.includes(terminal);
        
        return (nameMatches || routeMatches) && terminalMatches;
    });

    renderTrainCards(filtered);
}

// --- 5. YOUTUBE API ---
async function fetchVideos(isLoadMore = false) {
    const container = document.getElementById('video-cards-container'); 
    if (!YT_KEY || !YT_CHANNEL || !container) return;
    try {
        const loadBtn = document.getElementById('load-more-btn');
        let pageTokenParam = isLoadMore && yt_token ? `&pageToken=${yt_token}` : '';
        const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_KEY}&channelId=${YT_CHANNEL}&part=snippet,id&maxResults=6&type=video&videoDuration=long&order=date${pageTokenParam}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
            if (!isLoadMore) container.innerHTML = ''; 
            const itemsWithBadges = data.items.map((v, index) => ({
                ...v,
                badge: (!isLoadMore && index < 2) ? 'NEW UPLOAD' : 'HERITAGE',
                color: (!isLoadMore && index < 2) ? 'bg-green-600' : 'bg-rail-accent'
            }));
            renderVideoCards(itemsWithBadges, isLoadMore);
            yt_token = data.nextPageToken || null;
        }
        if(loadBtn) loadBtn.classList.toggle('hidden', !yt_token);
    } catch (e) { console.error("Vlog System Error:", e); }
}

function renderVideoCards(items, isLoadMore) {
    const container = document.getElementById('video-cards-container');
    if (!isLoadMore) container.innerHTML = ''; 
    items.forEach(v => {
        const title = escapeHTML(v.snippet.title);
        const publishDate = new Date(v.snippet.publishedAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' });
        container.innerHTML += `
        <div class="bg-white dark:bg-gray-800 rounded-[2.5rem] overflow-hidden shadow-xl group cursor-pointer transition-all hover:translate-y-[-5px] relative animate-fade-in" onclick="openVideo('${v.id.videoId}')">
            <div class="absolute top-4 left-4 z-10 ${v.color} text-white text-[8px] font-black px-3 py-1 rounded-full tracking-widest uppercase shadow-lg">${v.badge} • ${publishDate}</div>
            <div class="aspect-video relative overflow-hidden bg-gray-200 dark:bg-gray-700">
                <img src="https://img.youtube.com/vi/${v.id.videoId}/maxresdefault.jpg" onerror="this.src='https://img.youtube.com/vi/${v.id.videoId}/hqdefault.jpg'" class="w-full h-full object-cover transition duration-700 group-hover:scale-105" loading="lazy">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500"><i class="fas fa-play text-white text-3xl"></i></div>
            </div>
            <div class="p-6 text-left"><h3 class="text-[11px] md:text-xs font-black uppercase line-clamp-2 text-gray-900 dark:text-white leading-tight">${title}</h3></div>
        </div>`;
    });
}

// --- 6. UI RENDERING (MODIFIED TO ACCEPT DATA) ---
function renderTrainCards(dataToRender = trainsData) {
    const grid = document.getElementById('scorecards-grid'); 
    if (!grid) return;

    if (dataToRender.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center text-gray-400 font-black uppercase italic tracking-widest">No trains matched your search.</div>`;
        return;
    }

    grid.innerHTML = dataToRender.map(t => {
        const filtered = (allReviews || []).filter(r => r.trainId == t.id).sort((a,b) => b.timestamp - a.timestamp);
        const avg = filtered.length ? filtered.reduce((a, b) => a + b.rating, 0) / filtered.length : 0;
        const slides = t.slides.map(s => 'images/' + s);

        return `
        <div class="bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden transition-all duration-500 mb-8">
            <div class="p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center text-left">
                <div class="w-full md:w-[45%] space-y-5">
                    <div><h3 class="text-2xl font-black uppercase italic text-gray-900 dark:text-white">${t.name}</h3><p class="text-rail-accent font-black text-[9px] uppercase tracking-widest mt-1">${t.route}</p></div>
                    <div class="bg-gray-50 dark:bg-rail-dark p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 space-y-2">
                        <div class="flex justify-between items-center"><span class="text-xs font-bold uppercase tracking-widest text-gray-400">Hub Rating</span><span class="stars text-lg">${'★'.repeat(Math.round(avg)) || '☆☆☆☆☆'}</span></div>
                        <hr class="border-gray-200 dark:border-gray-600 my-2">
                        ${t.fares.map(f=>`<div class="flex justify-between items-center pb-2 last:border-0"><span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">${f.class}</span><span class="text-rail-accent font-black text-xs italic">${f.price}</span></div>`).join('')}
                    </div>
                    <button onclick="openExploreModal('${t.id}')" class="w-full bg-rail-dark dark:bg-rail-accent text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg italic">Explore More</button>
                </div>
                <div class="w-full md:w-[55%] h-64 rounded-3xl overflow-hidden relative bg-gray-100 dark:bg-gray-700 cursor-pointer" onclick="openSliderModal(${JSON.stringify(slides).replace(/"/g, '&quot;')}, 0)">
                    <img src="images/${t.slides[0]}" class="w-full h-full object-cover">
                </div>
            </div>

            <div class="px-10 pb-10 pt-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-rail-dark/20">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-rail-accent mb-4">Neural Discussion Feed</h4>
                <div class="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    ${filtered.map(r => `
                        <div class="bg-white dark:bg-rail-dark p-4 rounded-2xl border border-gray-50 dark:border-gray-800 shadow-sm">
                            <div class="flex justify-between items-start mb-1">
                                <span class="text-[9px] font-black text-rail-accent uppercase italic">Observer</span>
                                <span class="stars text-[8px]">${'★'.repeat(r.rating)}</span>
                            </div>
                            <p class="text-xs text-gray-500 dark:text-gray-300 italic">"${escapeHTML(r.comment)}"</p>
                            ${r.adminReply ? `<div class="mt-2 pl-3 border-l-2 border-rail-accent"><p class="text-[8px] font-black text-rail-accent uppercase">ADMIN REPLY:</p><p class="text-[10px] italic text-gray-500">${escapeHTML(r.adminReply)}</p></div>` : adminAuthorised ? `
                                <div class="mt-2 flex gap-2"><input type="text" id="review-reply-${r.id}" placeholder="Reply..." class="flex-1 bg-gray-50 dark:bg-rail-dark p-2 rounded-lg text-[9px] border outline-none"><button onclick="submitAdminReply('${r.id}', 'reviews', 'review-reply-${r.id}')" class="bg-rail-dark text-white px-3 rounded-lg text-[8px] font-bold">SEND</button></div>` : ''}
                        </div>`).join('') || '<p class="text-[9px] text-gray-400 italic text-center py-4 uppercase">No neural opinions yet.</p>'}
                </div>
                <form onsubmit="handleReviewSubmit(event, '${t.id}')" class="flex gap-3">
                    <select class="bg-white dark:bg-rail-dark p-3 rounded-xl text-[10px] font-black outline-none border border-gray-100 dark:border-gray-700 w-24"><option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option><option value="2">2 ★</option><option value="1">1 ★</option></select>
                    <input type="text" placeholder="Share your experience..." required class="flex-1 bg-white dark:bg-rail-dark p-3 rounded-xl text-xs outline-none border border-gray-100 dark:border-gray-700">
                    <button type="submit" class="bg-rail-accent text-white px-6 rounded-xl font-black text-[10px] uppercase tracking-widest">Post</button>
                </form>
            </div>
        </div>`;
    }).join('');
}

const sessionStartTime = Date.now();

function showNotification(title, message) {
    const oldToast = document.querySelector('.toast-notification');
    if(oldToast) oldToast.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `<div class="flex flex-col text-left"><span class="text-[10px] font-black uppercase tracking-widest text-rail-accent mb-1">${title}</span><p class="text-xs italic">"${message}"</p></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('active'), 100);
    setTimeout(() => { toast.classList.remove('active'); setTimeout(() => toast.remove(), 500); }, 5000);
}

function renderGallery() {
    const grid = document.getElementById('gallery-grid'); if (!grid) return;
    grid.innerHTML = galleryData.map(img => `<div class="group relative overflow-hidden rounded-[2.5rem] bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl" onclick="openSliderModal(['${img.src}'], 0)"><img src="${img.src}" loading="lazy" class="w-full h-80 object-cover transition duration-700 group-hover:scale-110 cursor-zoom-in"><div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition duration-500 flex flex-col justify-end p-8"><h4 class="text-white text-xl font-black italic uppercase tracking-tighter">${img.title}</h4></div></div>`).join('');
}

// --- 7. COMMUNITY HUB ---
function togglePost(postId) { expandedPosts[postId] = !expandedPosts[postId]; fetchUpdates(); }

function startPollsListener() { 
    if(!user) return; 
    db.collection('artifacts').doc(appId).collection('public').doc('data').collection('polls').onSnapshot(snap => { 
        const c = document.getElementById('polls-container'); if (!c) return; 
        const polls = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        c.innerHTML = polls.map(p => { 
            const total = (p.options || []).reduce((a, b) => a + (b.votes || 0), 0); 
            return `<div class="bg-white dark:bg-rail-dark p-10 rounded-[3rem] border-2 border-rail-accent shadow-2xl text-left"><h3 class="text-2xl font-black italic uppercase mb-8 text-gray-900 dark:text-white">${escapeHTML(p.question)}</h3><div class="space-y-6">${p.options.map((o, i) => { const per = total > 0 ? Math.round((o.votes / total) * 100) : 0; return `<div class="cursor-pointer group" onclick="castVote('${p.id}', ${i})"><div class="flex justify-between font-black text-[11px] uppercase mb-2 text-gray-500 dark:text-gray-400"><span>${escapeHTML(o.text)}</span><span class="text-rail-accent">${per}%</span></div><div class="h-10 bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700"><div class="h-full bg-rail-accent transition-all duration-1000 ease-out" style="width: ${per}%"></div></div></div>`; }).join('')}</div></div>`; 
        }).join(''); 
    }); 
}

function fetchUpdates() {
    if (!user) return;
    db.collection('artifacts').doc(appId).collection('public').doc('data').collection('updates').onSnapshot(snap => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b)=>b.timestamp-a.timestamp);
        const container = document.getElementById('updates-container'); if (!container) return;
        container.innerHTML = data.map(u => {
            const isExpanded = expandedPosts[u.id] || false;
            const threshold = 180;
            const displayC = (u.content.length > threshold && !isExpanded) ? u.content.substring(0, threshold) : u.content;
            const thisPostComments = postComments.filter(c => c.postId === u.id).sort((a,b) => a.timestamp - b.timestamp);
            return `
            <div class="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-xl text-left flex flex-col mb-8 h-full">
                <div class="flex justify-between mb-4 text-[9px] font-black uppercase text-gray-400">
                    <span>Official Broadcast</span>
                    <div class="flex gap-3">${adminAuthorised ? `<button onclick="openEditModal('${u.id}')" class="text-rail-accent hover:underline uppercase">Edit</button><button onclick="deletePost('${u.id}')" class="text-red-500 hover:underline uppercase">Delete</button>` : ''}<span>${formatTimestamp(u.timestamp)}</span></div>
                </div>
                <div class="mb-6 h-56 bg-gray-50 dark:bg-rail-dark rounded-3xl overflow-hidden cursor-pointer" onclick="openSliderModal(${JSON.stringify(u.imageUrls || []).replace(/"/g, '&quot;')}, 0)">
                    ${u.imageUrls && u.imageUrls.length > 0 ? `<img src="${u.imageUrls[0]}" class="w-full h-full object-cover">` : `<div class="flex items-center justify-center h-full opacity-20"><i class="fas fa-bullhorn text-4xl"></i></div>`}
                </div>
                <h3 class="text-xl font-black uppercase italic mb-3 text-gray-900 dark:text-white leading-tight">${u.title}</h3>
                <div class="text-gray-500 dark:text-gray-400 text-sm mb-6 flex-grow leading-relaxed italic">${parsePostContent(displayC)} ${u.content.length > threshold ? `<button onclick="togglePost('${u.id}')" class="text-rail-accent font-black uppercase text-[10px] ml-1 hover:underline">${isExpanded ? 'Show Less' : 'READ MORE...'}</button>` : ""}</div>
                <div class="flex items-center gap-6 mb-5 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                    <button onclick="handleReaction('${u.id}', 'heart')" class="flex items-center gap-2 group"><span class="text-lg group-hover:scale-125 transition-transform">❤️</span><span class="text-[10px] font-black text-gray-400">${u.reactions?.heart || 0}</span></button>
                    <button onclick="handleReaction('${u.id}', 'surprised')" class="flex items-center gap-2 group"><span class="text-lg group-hover:scale-125 transition-transform">😮</span><span class="text-[10px] font-black text-gray-400">${u.reactions?.surprised || 0}</span></button>
                    <button onclick="handleReaction('${u.id}', 'sad')" class="flex items-center gap-2 group"><span class="text-lg group-hover:scale-125 transition-transform">😢</span><span class="text-[10px] font-black text-gray-400">${u.reactions?.sad || 0}</span></button>
                    <button onclick="handleReaction('${u.id}', 'angry')" class="flex items-center gap-2 group"><span class="text-lg group-hover:scale-125 transition-transform">😡</span><span class="text-[10px] font-black text-gray-400">${u.reactions?.angry || 0}</span></button>
                </div>
                <div class="mt-4 pt-6 border-t border-gray-50 dark:border-gray-700/50">
                    <h4 class="text-[10px] font-black uppercase tracking-widest text-rail-accent mb-4">Community Discussion</h4>
                    <div class="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        ${thisPostComments.map(c => `
                            <div class="bg-gray-50 dark:bg-rail-dark/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800"><div class="flex justify-between items-start mb-1"><span class="text-[9px] font-black text-rail-accent uppercase">Observer</span><span class="text-[7px] text-gray-400">${formatTimestamp(c.timestamp)}</span></div><p class="text-xs text-gray-600 dark:text-gray-300 italic">"${escapeHTML(c.text)}"</p>${c.adminReply ? `<div class="mt-2 pl-3 border-l-2 border-rail-accent"><p class="text-[8px] font-black text-rail-accent uppercase">RAILSPK Reply:</p><p class="text-[11px] text-gray-500 italic">${escapeHTML(c.adminReply)}</p></div>` : adminAuthorised ? `<div class="mt-2 flex gap-2"><input type="text" id="reply-to-${c.id}" placeholder="Reply..." class="flex-1 bg-white dark:bg-rail-dark p-2 rounded-lg text-[10px] border outline-none"><button onclick="submitAdminReply('${c.id}', 'communityComments', 'reply-to-${c.id}')" class="bg-rail-dark text-white px-3 rounded-lg text-[8px] font-bold uppercase">SEND</button></div>` : ''}</div>`).join('') || '<p class="text-[9px] text-gray-400 italic text-center py-2 uppercase">No opinions yet.</p>'}
                    </div>
                    <form onsubmit="handlePostCommentSubmit(event, '${u.id}')" class="flex gap-2">
                        <input type="text" placeholder="Write your opinion..." required class="flex-1 bg-gray-50 dark:bg-rail-dark p-3 rounded-xl text-xs outline-none border border-gray-100 dark:border-gray-700"><button type="submit" class="bg-rail-accent text-white px-5 rounded-xl font-black text-[10px] uppercase">Send</button>
                    </form>
                </div>
            </div>`;
        }).join('');
    });
}

async function handleReviewSubmit(e, trainId) {
    e.preventDefault(); if(!user) return;
    const form = e.target; const rating = parseInt(form.querySelector('select').value); const comment = form.querySelector('input').value.trim();
    if(!comment) return;
    try {
        await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('reviews').add({
            trainId: trainId, rating: rating, comment: comment, timestamp: Date.now()
        });
        form.reset();
    } catch(err) { console.error("Review failed", err); }
}

async function handlePostCommentSubmit(e, postId) {
    e.preventDefault(); const input = e.target.querySelector('input'); const text = input.value.trim();
    if(!text || !user) return;
    try {
        await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('communityComments').add({
            postId: postId, text: text, timestamp: Date.now()
        });
        input.value = "";
    } catch(err) { console.error("Comment failed", err); }
}

async function submitAdminReply(id, collection, textId) {
    if(!adminAuthorised) return;
    const input = document.getElementById(textId); const replyText = input.value.trim();
    if(!replyText) return;
    try {
        await db.collection('artifacts').doc(appId).collection('public').doc('data').collection(collection).doc(id).update({ adminReply: replyText });
        input.value = ""; alert("Response Synced!");
    } catch(e) { alert("Sync failed."); }
}

// --- 8. ADMIN ACTIONS ---
async function openEditModal(postId) {
    if (!adminAuthorised) return;
    editingPostId = postId;
    const doc = await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('updates').doc(postId).get();
    if (doc.exists) {
        const data = doc.data();
        document.getElementById('update-title').value = data.title;
        document.getElementById('update-content').value = data.content;
        document.getElementById('update-btn').innerText = "Update Broadcast";
        document.getElementById('admin-panel')?.scrollIntoView({ behavior: 'smooth' });
    }
}

async function postUpdate(e) {
    e.preventDefault(); if (!adminAuthorised) return;
    const btn = document.getElementById('update-btn'); const title = document.getElementById('update-title').value; const content = document.getElementById('update-content').value; const files = document.getElementById('update-image-file').files;
    try {
        btn.disabled = true; btn.innerText = "Processing...";
        let updateData = { title, content, timestamp: Date.now() };
        if (files.length > 0) {
            let imageUrls = [];
            for (let file of files) {
                const url = await new Promise(r => { const reader = new FileReader(); reader.onloadend = () => r(reader.result); reader.readAsDataURL(file); });
                imageUrls.push(url);
            }
            updateData.imageUrls = imageUrls;
        }
        const ref = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('updates');
        if (editingPostId) {
            await ref.doc(editingPostId).update(updateData);
            alert("Broadcast Updated!"); editingPostId = null; btn.innerText = "Publish to Cloud";
        } else {
            updateData.reactions = { heart: 0, surprised: 0, sad: 0, angry: 0 };
            await ref.add(updateData); alert("Broadcast Published!");
        }
        document.getElementById('update-form').reset();
    } catch (err) { alert("Failed."); } finally { btn.disabled = false; }
}

async function deletePost(postId) {
    if (!adminAuthorised || !confirm("Delete broadcast?")) return;
    await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('updates').doc(postId).delete();
}

async function postPoll(e) {
    e.preventDefault(); if (!adminAuthorised) return;
    const q = document.getElementById('poll-question').value;
    const oArr = document.getElementById('poll-options').value.split(',').map(opt => ({ text: opt.trim(), votes: 0 })).filter(o => o.text !== "");
    await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('polls').add({ question: q, options: oArr, timestamp: Date.now() });
    document.getElementById('poll-form').reset();
}

function promptAdmin() {
    const key = prompt("Admin Access Key:");
    if (key === "railspk786") {
        adminAuthorised = true;
        document.getElementById('admin-panel')?.classList.remove('hidden');
        if(window.location.pathname.includes('community')) fetchUpdates();
        alert("Access Granted. System Unlocked.");
    } else { alert("Access Denied."); }
}

// --- 9. INTERACTION HANDLERS ---
async function handleReaction(id, type) {
    const ref = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('updates').doc(id);
    await db.runTransaction(async t => {
        const doc = await t.get(ref); if (!doc.exists) return;
        const reactions = doc.data().reactions || {heart:0};
        reactions[type] = (reactions[type] || 0) + 1;
        t.update(ref, { reactions });
    });
}

async function castVote(id, idx) {
    const ref = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('polls').doc(id);
    await db.runTransaction(async t => {
        const doc = await t.get(ref); if (!doc.exists) return;
        const opts = doc.data().options; opts[idx].votes = (opts[idx].votes || 0) + 1;
        t.update(ref, { options: opts });
    });
}

// --- 10. UI MODALS & UTILS ---
function toggleMenu() {
    const menu = document.getElementById('mobile-menu'); const isActive = menu.classList.toggle('active');
    document.body.style.overflow = isActive ? 'hidden' : 'auto';
}

function parsePostContent(text) {
    if(!text) return "";
    let formatted = escapeHTML(text);
    formatted = formatted.replace(/^(?:\*|-)\s+(.+)$/gm, '<li class="ml-4 list-disc text-rail-accent/80">$1</li>');
    formatted = formatted.replace(/#(\w+)/g, '<span class="text-rail-accent font-bold cursor-pointer hover:underline">#$1</span>');
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    formatted = formatted.replace(ytRegex, (m, id) => `<a href="https://youtube.com/watch?v=${id}" target="_blank" class="block mt-4 p-3 bg-red-600/10 border border-red-600/20 text-red-600 text-center rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"><i class="fab fa-youtube mr-2"></i> Watch Video</a>`);
    return formatted.replace(/\n/g, '<br>');
}

function openExploreModal(trainId) {
    const train = trainsData.find(t => t.id === trainId); if (!train) return;
    const content = document.getElementById('explore-modal-content');
    content.innerHTML = `<div class="space-y-8 text-left"><div class="flex justify-between items-start"><div><h2 class="text-4xl font-black uppercase italic text-gray-900 dark:text-white">${train.name}</h2><p class="text-rail-accent font-bold tracking-widest text-xs uppercase mt-2">${train.route}</p></div><div class="bg-rail-accent/10 text-rail-accent px-6 py-2 rounded-full font-black text-[10px] uppercase">Verified Info</div></div><div class="grid grid-cols-2 md:grid-cols-4 gap-4">${Object.entries(train.stats).map(([k,v]) => `<div class="bg-gray-50 dark:bg-rail-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-700"><span class="block text-[8px] font-black uppercase text-gray-400 mb-1">${k}</span><span class="text-xl font-black italic text-rail-accent">${typeof v === 'number' ? '★'.repeat(v) : v}</span></div>`).join('')}</div><div><h4 class="text-xs font-black uppercase tracking-[0.3em] mb-4 text-gray-400">Amenities</h4><div class="flex flex-wrap gap-3">${train.amenities.map(a => `<span class="px-5 py-2.5 bg-gray-50 dark:bg-rail-dark border border-gray-100 dark:border-gray-700 rounded-full text-[10px] font-black uppercase tracking-widest"><i class="fas fa-check text-rail-accent mr-2"></i> ${a}</span>`).join('')}</div></div></div>`;
    document.getElementById('explore-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function openSliderModal(images, index) { 
    if(!images || images.length === 0) return; 
    currentSliderImages = Array.isArray(images) ? images : [images]; currentSliderIndex = index; 
    updateSliderDisplay(); 
    document.getElementById('image-modal').classList.remove('hidden'); document.getElementById('image-modal').classList.add('flex');
    if(currentSliderImages.length > 1) { 
        document.getElementById('slider-controls').classList.remove('hidden');
        if(sliderTimer) clearInterval(sliderTimer); sliderTimer = setInterval(() => nextSlide(), 4000); 
    }
}

function updateSliderDisplay() { 
    const img = document.getElementById('modal-image-content'); if(!img) return;
    img.style.opacity = '0'; setTimeout(() => { 
        img.src = currentSliderImages[currentSliderIndex]; img.style.opacity = '1';
        if(document.getElementById('slider-counter')) document.getElementById('slider-counter').innerText = `${currentSliderIndex + 1} / ${currentSliderImages.length}`;
    }, 150); 
}

function nextSlide(e) { if(e) e.stopPropagation(); currentSliderIndex = (currentSliderIndex + 1) % currentSliderImages.length; updateSliderDisplay(); }
function prevSlide(e) { if(e) e.stopPropagation(); currentSliderIndex = (currentSliderIndex - 1 + currentSliderImages.length) % currentSliderImages.length; updateSliderDisplay(); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); document.body.style.overflow = 'auto'; if(id==='video-modal') document.getElementById('video-embed-container').innerHTML = ''; if(sliderTimer) clearInterval(sliderTimer); }
function openVideo(id) { document.getElementById('video-embed-container').innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${id}?autoplay=1" frameborder="0" allowfullscreen></iframe>`; document.getElementById('video-modal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => { 
    initFirebase();
    document.getElementById('theme-toggle').onclick = () => { document.documentElement.classList.toggle('dark'); };
    document.getElementById('update-form')?.addEventListener('submit', postUpdate);
    document.getElementById('poll-form')?.addEventListener('submit', postPoll);
    document.getElementById('admin-trigger').onclick = promptAdmin;
});

window.onpopstate = handleRouting;

function startGlobalListeners() {
    if (!user) return;
    db.collection('artifacts').doc(appId).collection('public').doc('data').collection('communityComments')
        .onSnapshot(snap => {
            snap.docChanges().forEach(change => { if (change.type === "added" && change.doc.data().timestamp > sessionStartTime) showNotification("New Opinion", change.doc.data().text.substring(0, 30) + "..."); });
            postComments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); fetchUpdates(); 
        });

    db.collection('artifacts').doc(appId).collection('public').doc('data').collection('reviews')
        .onSnapshot(snap => {
            allReviews = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (window.location.pathname.includes('reviews')) renderTrainCards();
        });

    db.collection('artifacts').doc(appId).collection('public').doc('data').collection('updates')
        .onSnapshot(snap => {
            snap.docChanges().forEach(change => { if (change.type === "added" && change.doc.data().timestamp > sessionStartTime) showNotification("New Broadcast", change.doc.data().title); });
            fetchUpdates(); 
        });
}