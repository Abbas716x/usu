/* ==========================================================
   716QX NEXUS OS 4.0 — Core Engine
   ========================================================== */
(function () {
    'use strict';

    const STATE_KEY = 'qx716_nexus_v4';
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const fmtNum = n => new Intl.NumberFormat('en-US').format(Math.round(n || 0));
    const fmt = n => fmtNum(n) + ' IQD';

    const defaultState = () => ({
        tables: [],
        debts: [],
        invoices: [],
        categories: [
            { id: 'cat_ps', name: 'ألعاب بليستيشن', icon: '🎮' },
            { id: 'cat_drinks', name: 'المشروبات', icon: '🥤' },
            { id: 'cat_snacks', name: 'المأكولات', icon: '🍕' },
            { id: 'cat_shisha', name: 'النراكيل', icon: '💨' }
        ],
        products: [
            { id: 'p1', catId: 'cat_ps', name: 'نصف ساعة بلي', icon: '⏱', type: 'countdown', duration: 30, price: 2000 },
            { id: 'p2', catId: 'cat_ps', name: 'ساعة بلي', icon: '🕐', type: 'countdown', duration: 60, price: 4000 },
            { id: 'p3', catId: 'cat_ps', name: 'وقت مفتوح', icon: '♾', type: 'open', price: 4000 },
            { id: 'p4', catId: 'cat_drinks', name: 'بيبسي', icon: '🥤', type: 'direct', price: 1000 },
            { id: 'p5', catId: 'cat_drinks', name: 'عصير برتقال', icon: '🍊', type: 'direct', price: 2000 },
            { id: 'p6', catId: 'cat_drinks', name: 'ماء', icon: '💧', type: 'direct', price: 500 },
            { id: 'p7', catId: 'cat_snacks', name: 'بيتزا صغيرة', icon: '🍕', type: 'direct', price: 5000 },
            { id: 'p8', catId: 'cat_shisha', name: 'نركيلة تفاح', icon: '💨', type: 'direct', price: 5000 }
        ],
        revenue: { daily: 0, yesterday: 0, monthly: 0 },
        activeView: 'dashboard',
        activeTableId: null,
        pickerCatId: null
    });

    let state = loadState();
    let earlyPayItemId = null;

    function loadState() {
        try {
            const s = localStorage.getItem(STATE_KEY);
            if (s) return Object.assign(defaultState(), JSON.parse(s));
        } catch (e) { console.warn(e); }
        return defaultState();
    }
    function saveState() {
        try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) {}
    }

    // ============ Toast ============
    function toast(msg, type = 'info', dur = 2800) {
        const c = $('#toast-container');
        if (!c) return;
        const el = document.createElement('div');
        el.className = `toast-item toast-${type}`;
        el.textContent = msg;
        c.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(-15px)';
            el.style.transition = 'all .3s ease';
            setTimeout(() => el.remove(), 300);
        }, dur);
    }

    // ============ Time utils ============
    function formatTime(sec) {
        sec = Math.max(0, Math.floor(sec));
        const h = String(Math.floor(sec / 3600)).padStart(2, '0');
        const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }
    function formatDateTime(iso) {
        return new Date(iso).toLocaleString('ar-IQ', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function tickClock() {
        const el = $('#live-clock');
        if (el) el.textContent = new Date().toLocaleTimeString('en-GB');
    }
    setInterval(tickClock, 1000);
    tickClock();

    // ============ Calculations ============
    function calcItemElapsed(it) {
        if (it.type === 'direct') return 0;
        let el = it.sessionElapsed || 0;
        if (it.status === 'running') {
            el += (Date.now() - it.startedAt) / 1000 - (it.pausedTotal || 0);
        }
        return Math.max(0, el);
    }
    function calcItemTotal(it) {
        if (it.type === 'direct') return it.price * it.qty;
        if (it.type === 'countdown') return it.price * it.qty;
        if (it.type === 'open') {
            const el = calcItemElapsed(it);
            return Math.round((el * it.price / 3600) * it.qty);
        }
        return 0;
    }
    function isItemExpired(it) {
        if (it.type !== 'countdown') return false;
        return calcItemElapsed(it) >= it.duration * 60 * it.qty;
    }
    function calcTableTotals(t) {
        let sub = 0, early = 0;
        t.items.forEach(it => {
            sub += calcItemTotal(it);
            early += (it.earlyPaid || 0);
        });
        const disc = Number(t.discount) || 0;
        return { subtotal: sub, earlyPaid: early, discount: disc, final: Math.max(0, sub - early - disc) };
    }

    // ============ Views ============
    function switchView(v) {
        state.activeView = v; saveState();
        $$('.view').forEach(x => x.classList.add('hidden'));
        const target = $('#view-' + v);
        if (target) {
            target.classList.remove('hidden');
            target.classList.remove('animate__fadeIn');
            void target.offsetWidth;
            target.classList.add('animate__fadeIn');
        }
        $$('.nav-link').forEach(b => b.classList.remove('active'));
        const nb = $('#nav-' + v); if (nb) nb.classList.add('active');
        $$('.top-tab').forEach(b => b.classList.remove('active'));
        closeDrawer();

        if (v === 'dashboard') renderDashboard();
        if (v === 'tables') renderTables();
        if (v === 'debts') renderDebtsList();
        if (v === 'invoices') renderInvoices();
        if (v === 'menu') renderMenu();
    }
    function toggleDrawer() {
        const d = $('#drawer');
        if (d) d.classList.toggle('translate-x-full');
    }
    function closeDrawer() {
        const d = $('#drawer');
        if (d) d.classList.add('translate-x-full');
    }
    function openModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('hidden'); }
    function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.add('hidden'); }

    // ============ Dashboard ============
    function renderDashboard() {
        $('#stat-daily').textContent = fmtNum(state.revenue.daily);
        $('#stat-yesterday').textContent = fmtNum(state.revenue.yesterday);
        $('#stat-monthly').textContent = fmtNum(state.revenue.monthly);
        $('#stat-active').textContent = state.tables.filter(t => t.status === 'open').length;
    }
    function resetDailyRevenue() {
        if (state.revenue.daily <= 0) { toast('لا توجد مبيعات للترحيل', 'warn'); return; }
        state.revenue.monthly += state.revenue.daily;
        state.revenue.yesterday = state.revenue.daily;
        state.revenue.daily = 0;
        saveState(); renderDashboard();
        toast(`تم الترحيل: ${fmt(state.revenue.yesterday)}`, 'success');
    }
    function resetMonthlyRevenue() {
        state.revenue.monthly = 0; saveState(); renderDashboard();
        toast('تم تصفير الإيراد الشهري', 'warn');
    }
    function resetSystemFull() {
        state = defaultState(); saveState(); renderAll(); switchView('dashboard');
        toast('SYSTEM RESET COMPLETE', 'error', 3000);
    }

    // ============ Tables ============
    function openAddTableModal() {
        $('#input-new-table-name').value = '';
        openModal('modal-add-table');
        setTimeout(() => $('#input-new-table-name').focus(), 200);
    }
    function suggestTableName(p) {
        const i = $('#input-new-table-name');
        i.value = p + (state.tables.length + 1);
        i.focus();
    }
    function confirmAddTable() {
        const name = $('#input-new-table-name').value.trim();
        if (!name) { toast('أدخل اسماً للطاولة', 'error'); return; }
        if (state.tables.some(t => t.name === name)) { toast('يوجد طاولة بنفس الاسم', 'error'); return; }
        state.tables.push({
            id: uid(), name, customer: '', items: [], discount: 0,
            createdAt: new Date().toISOString(), status: 'open'
        });
        saveState();
        closeModal('modal-add-table');
        renderTables(); renderDashboard();
        toast(`تم فتح "${name}"`, 'success');
    }
    function searchTables() { renderTables(); }

    function renderTables() {
        const grid = $('#tables-grid'); if (!grid) return;
        const q = ($('#search-tables')?.value || '').toLowerCase().trim();
        let list = state.tables.filter(t => t.status === 'open');
        if (q) list = list.filter(t => t.name.toLowerCase().includes(q) || (t.customer || '').toLowerCase().includes(q));

        if (list.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full cyber-panel p-12 text-center">
                    <div class="text-6xl mb-4">🎮</div>
                    <h3 class="text-xl font-black text-white mb-2">لا توجد طاولات مفتوحة</h3>
                    <p class="text-gray-400 text-sm mb-6 font-tech">ابدأ بفتح طاولة جديدة</p>
                    <button onclick="window.openAddTableModal()" class="btn-neon">+ فتح طاولة</button>
                </div>`;
            return;
        }
        grid.innerHTML = list.map(t => {
            const tot = calcTableTotals(t);
            const runningCount = t.items.filter(i => i.type !== 'direct' && i.status === 'running').length;
            return `
                <div class="table-card ${runningCount > 0 ? 'busy' : 'idle'}" onclick="window.openTableDetail('${t.id}')">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-lg font-black text-white font-display tracking-wider">${t.name}</h3>
                            <p class="text-[10px] text-gray-400 font-mono mt-1">${t.customer || 'GUEST'}</p>
                        </div>
                        <span class="pulse-dot ${runningCount > 0 ? 'pulse-green' : ''}" style="${runningCount === 0 ? 'background:#4B5563;color:#4B5563' : ''}"></span>
                    </div>
                    <div class="space-y-2 mb-4">
                        <div class="flex justify-between text-xs"><span class="text-gray-500 font-tech">ITEMS</span><span class="text-white font-mono font-bold">${t.items.length}</span></div>
                        <div class="flex justify-between text-xs"><span class="text-gray-500 font-tech">SUBTOTAL</span><span class="text-neonCyan font-mono font-bold">${fmtNum(tot.subtotal)}</span></div>
                        ${tot.earlyPaid > 0 ? `<div class="flex justify-between text-xs"><span class="text-gray-500 font-tech">PAID</span><span class="text-neonEmerald font-mono font-bold">${fmtNum(tot.earlyPaid)}</span></div>` : ''}
                    </div>
                    <div class="pt-4 border-t border-white/5 flex justify-between items-center">
                        <span class="text-[10px] text-gray-500 font-mono">${formatDateTime(t.createdAt)}</span>
                        <span class="text-neonViolet font-black font-mono text-lg">${fmtNum(tot.final)} <span class="text-[10px]">IQD</span></span>
                    </div>
                </div>`;
        }).join('');
    }

    // ============ Table Detail ============
    function openTableDetail(id) {
        const t = state.tables.find(x => x.id === id); if (!t) return;
        state.activeTableId = id; saveState();
        switchView('table-detail');
        renderTableDetail();
    }

    function renderTableDetail() {
        const t = state.tables.find(x => x.id === state.activeTableId);
        if (!t) { switchView('tables'); return; }

        $('#detail-table-name').textContent = t.name;
        $('#detail-customer-badge').textContent = (t.customer || 'GUEST').toUpperCase();
        $('#input-table-customer').value = t.customer || '';
        $('#input-table-discount').value = t.discount || '';

        const list = $('#detail-items-list');
        if (t.items.length === 0) {
            list.innerHTML = `
                <div class="text-center py-16 border-2 border-dashed border-white/10 rounded-2xl">
                    <div class="text-4xl mb-3 opacity-40">📦</div>
                    <p class="text-gray-500 text-sm font-tech">NO ITEMS YET</p>
                    <p class="text-gray-600 text-xs mt-1">اضغط "إضافة طلب" للبدء</p>
                </div>`;
        } else {
            list.innerHTML = t.items.map(it => {
                const total = calcItemTotal(it);
                const elapsed = calcItemElapsed(it);
                const rem = it.type === 'countdown' ? Math.max(0, it.duration * 60 * it.qty - elapsed) : 0;
                const exp = isItemExpired(it);
                const badge = it.type === 'direct'
                    ? `<span class="time-badge paused">DIRECT</span>`
                    : (it.status === 'paused'
                        ? `<span class="time-badge paused">⏸ PAUSED</span>`
                        : (exp ? `<span class="time-badge expired">⏰ EXPIRED</span>` : `<span class="time-badge live">● LIVE</span>`));

                return `
                    <div class="cyber-panel p-4">
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex items-center gap-3">
                                <div class="w-11 h-11 rounded-xl bg-neonViolet/10 border border-neonViolet/20 flex items-center justify-center text-xl">${it.icon}</div>
                                <div>
                                    <h
