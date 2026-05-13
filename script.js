// KONFIGURASI API

const API_URL = 'https://api.spacexdata.com/v4/launches';

// Cache untuk data roket (kita akan ambil juga untuk mapping nama roket)
let rocketsCache = {};


// FUNGSI AMBIL DATA (DENGAN ERROR HANDLING)

// Ambil data roket untuk mapping ID ke nama
async function fetchRockets() {
    try {
        const response = await fetch('https://api.spacexdata.com/v4/rockets');
        if (!response.ok) throw new Error('Gagal mengambil data roket');
        const rockets = await response.json();
        rocketsCache = rockets.reduce((acc, rocket) => {
            acc[rocket.id] = rocket.name;
            return acc;
        }, {});
    } catch (error) {
        console.error('Error fetching rockets:', error);
    }
}

// Ambil data peluncuran dari API
async function fetchLaunchesFromAPI() {
    try {
        showLoading(true);
        hideError();
        
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('Format data tidak sesuai (bukan array)');
        }
        
        showLoading(false);
        return data;
        
    } catch (error) {
        console.error('Error detail:', error);
        showLoading(false);
        
        let userMessage = 'Gagal mengambil data peluncuran SpaceX. ';
        if (error.message.includes('fetch') || error.message.includes('network')) {
            userMessage += 'Periksa koneksi internet Anda.';
        } else if (error.message.includes('HTTP')) {
            userMessage += 'API sedang sibuk, coba lagi nanti.';
        } else {
            userMessage += error.message;
        }
        
        showError(userMessage);
        return [];
    }
}


// FUNGSI RENDER DATA (CLEAN CODE - TERPISAH)


// Dapatkan nama roket dari ID
function getRocketName(rocketId) {
    return rocketsCache[rocketId] || rocketId || 'Unknown Rocket';
}

// Dapatkan class status untuk styling
function getStatusClass(success, upcoming) {
    if (upcoming) return 'status-upcoming';
    if (success === true) return 'status-success';
    if (success === false) return 'status-failed';
    return '';
}

// Dapatkan teks status
function getStatusText(success, upcoming) {
    if (upcoming) return '⏳ Akan Datang';
    if (success === true) return '✅ Berhasil';
    if (success === false) return '❌ Gagal';
    return '❓ Tidak Diketahui';
}

// Format tanggal
function formatDate(dateUtc) {
    if (!dateUtc) return 'Tanggal tidak diketahui';
    const date = new Date(dateUtc);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Render data ke cards
function renderLaunchesToCards(launches) {
    const container = document.getElementById('dataContainer');
    
    if (!launches || launches.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; background: rgba(255,255,255,0.03); border-radius: 20px;">
                <div style="font-size: 48px;">🛸</div>
                <p style="color: #8b949e; margin-top: 20px;">Tidak ada peluncuran yang sesuai dengan filter Anda.</p>
            </div>
        `;
        document.getElementById('statsBar').classList.add('hidden');
        return;
    }
    
    // Update statistik
    const launchCountEl = document.getElementById('launchCount');
    if (launchCountEl) {
        launchCountEl.textContent = launches.length;
        document.getElementById('statsBar').classList.remove('hidden');
    }
    
    // Looping untuk membuat card per launch
    const cardsHTML = launches.map(launch => {
        const missionPatch = launch.links?.patch?.small || '';
        const missionName = launch.name || 'Misi Tidak Diketahui';
        const launchDate = formatDate(launch.date_utc);
        const rocketName = getRocketName(launch.rocket);
        const statusClass = getStatusClass(launch.success, launch.upcoming);
        const statusText = getStatusText(launch.success, launch.upcoming);
        const details = launch.details || 'Tidak ada deskripsi tersedia untuk misi ini.';
        
        return `
            <div class="launch-card" data-launch-id="${launch.id}">
                <div class="card-content">
                    <div class="mission-patch">
                        ${missionPatch ? `<img src="${missionPatch}" alt="${missionName} patch" onerror="this.style.display='none'">` : '<div style="font-size: 48px;">🚀</div>'}
                    </div>
                    <div class="mission-name">${escapeHtml(missionName)}</div>
                    <div class="launch-date">📅 ${launchDate}</div>
                    <div style="text-align: center;">
                        <span class="status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="rocket-name">🚀 Roket: ${escapeHtml(rocketName)}</div>
                    <div class="details-preview">${escapeHtml(details.substring(0, 100))}${details.length > 100 ? '...' : ''}</div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = cardsHTML;
    
    // event listener untuk setiap card (modal detail)
    document.querySelectorAll('.launch-card').forEach(card => {
        card.addEventListener('click', () => {
            const launchId = card.dataset.launchId;
            const launch = launches.find(l => l.id === launchId);
            if (launch) {
                showModal(launch);
            }
        });
    });
}


// MODAL DETAIL (Show More Info)


function showModal(launch) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    const missionPatch = launch.links?.patch?.large || launch.links?.patch?.small || '';
    const flickrImages = launch.links?.flickr?.original || [];
    
    modalBody.innerHTML = `
        <div style="text-align: center;">
            ${missionPatch ? `<img src="${missionPatch}" alt="${launch.name}" style="width: 150px; margin-bottom: 15px;">` : '<div style="font-size: 64px;">🚀</div>'}
        </div>
        <h2>${escapeHtml(launch.name || 'Misi Tidak Diketahui')}</h2>
        <p><strong>📅 Tanggal:</strong> ${formatDate(launch.date_utc)}</p>
        <p><strong>🚀 Roket:</strong> ${escapeHtml(getRocketName(launch.rocket))}</p>
        <p><strong>📊 Status:</strong> ${getStatusText(launch.success, launch.upcoming)}</p>
        <p><strong>📝 Deskripsi Lengkap:</strong></p>
        <p style="text-align: justify; line-height: 1.6;">${escapeHtml(launch.details || 'Tidak ada deskripsi tersedia untuk misi ini.')}</p>
        ${launch.flight_number ? `<p><strong>🔢 Nomor Penerbangan:</strong> ${launch.flight_number}</p>` : ''}
        ${launch.links?.webcast ? `<p><strong>🎥 Webcast:</strong> <a href="${launch.links.webcast}" target="_blank" style="color: #00d4ff;">Tonton di YouTube</a></p>` : ''}
        ${flickrImages.length > 0 ? `
            <p><strong>🖼️ Galeri Foto:</strong></p>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                ${flickrImages.slice(0, 3).map(img => `<img src="${img}" style="width: calc(33% - 7px); border-radius: 10px;" onerror="this.style.display='none'">`).join('')}
            </div>
        ` : ''}
    `;
    
    modal.classList.add('active');
}


// FUNGSI FILTER & SEARCH


let allLaunches = [];

function filterLaunches(launches, searchTerm, statusFilter) {
    let filtered = [...launches];
    
    // Filter berdasarkan pencarian (nama misi, roket, detail)
    if (searchTerm && searchTerm.trim() !== '') {
        const lowerSearch = searchTerm.toLowerCase();
        filtered = filtered.filter(launch => 
            (launch.name && launch.name.toLowerCase().includes(lowerSearch)) ||
            (getRocketName(launch.rocket).toLowerCase().includes(lowerSearch)) ||
            (launch.details && launch.details.toLowerCase().includes(lowerSearch))
        );
    }
    
    // Filter berdasarkan status
    if (statusFilter !== 'all') {
        filtered = filtered.filter(launch => {
            if (statusFilter === 'success') return launch.success === true && !launch.upcoming;
            if (statusFilter === 'failed') return launch.success === false;
            if (statusFilter === 'upcoming') return launch.upcoming === true;
            return true;
        });
    }
    
    return filtered;
}

function updateUI() {
    const searchTerm = document.getElementById('searchInput').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    const filteredLaunches = filterLaunches(allLaunches, searchTerm, statusFilter);
    renderLaunchesToCards(filteredLaunches);
}


// FUNGSI UTILITY


function showLoading(isLoading) {
    const loadingEl = document.getElementById('loadingMessage');
    if (isLoading) {
        loadingEl.classList.remove('hidden');
    } else {
        loadingEl.classList.add('hidden');
    }
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function hideError() {
    const errorEl = document.getElementById('errorMessage');
    errorEl.classList.add('hidden');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// INISIALISASI
// ============================================

async function loadAndDisplayData() {
    // Ambil data roket dulu untuk mapping
    await fetchRockets();
    
    // Ambil data peluncuran
    allLaunches = await fetchLaunchesFromAPI();
    
    if (allLaunches.length > 0) {
        // Urutkan dari yang terbaru
        allLaunches.sort((a, b) => new Date(b.date_utc) - new Date(a.date_utc));
        
        // Reset filter
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = 'all';
        
        renderLaunchesToCards(allLaunches);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayData();
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadAndDisplayData();
        });
    }
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            updateUI();
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            updateUI();
        });
    }
    
    // Modal close
    const modal = document.getElementById('modal');
    const modalClose = document.getElementById('modalCloseBtn');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});