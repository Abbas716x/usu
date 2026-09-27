/* ==========================================================
   716QX NEXUS OS 4.0 — Core Engine (COMPLETE)
   ========================================================== */
(function () {
    'use strict';

    const STATE_KEY = 'qx716_nexus_v4';
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const fmtNum = n => new Intl.NumberFormat('en-US').format(Math.round(n || 0));

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

    // ============ Utils ============
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
        const d = $('#stat-daily'); if (d) d.textContent = fmtNum(state.revenue.daily);
        const y = $('#stat-yesterday'); if (y) y.textContent = fmtNum(state.revenue.yesterday);
        const m = $('#stat-monthly'); if (m) m.textContent = fmtNum(state.revenue.monthly);
        const a = $('#stat-active'); if (a) a.textContent = state.tables.filter(t => t.status === 'open').length;
    }
    function resetDailyRevenue() {
        if (state.revenue.daily <= 0) { toast('لا توجد مبيعات للترحيل', 'warn'); return; }
        state.revenue.monthly += state.revenue.daily;
        state.revenue.yesterday = state.revenue.daily;
        state.revenue.daily = 0;
        saveState(); renderDashboard();
        toast(`تم الترحيل: ${fmtNum(state.revenue.yesterday)} IQD`, 'success');
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
                    <p class="text-gray-400 text-sm mb-6">ابدأ بفتح طاولة جديدة</p>
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
                            <h3 class="text-lg font-black text-white tracking-wider">${t.name}</h3>
                            <p class="text-[10px] text-gray-400 font-mono mt-1">${t.customer || 'GUEST'}</p>
                        </div>
                        <span class="pulse-dot ${runningCount > 0 ? 'pulse-green' : ''}"></span>
                    </div>
                    <div class="space-y-2 mb-4">
                        <div class="flex justify-between text-xs"><span class="text-gray-500">ITEMS</span><span class="text-white font-mono font-bold">${t.items.length}</span></div>
                        <div class="flex justify-between text-xs"><span class="text-gray-500">SUBTOTAL</span><span class="text-neonCyan font-mono font-bold">${fmtNum(tot.subtotal)}</span></div>
                        ${tot.earlyPaid > 0 ? `<div class="flex justify-between text-xs"><span class="text-gray-500">PAID</span><span class="text-neonEmerald font-mono font-bold">${fmtNum(tot.earlyPaid)}</span></div>` : ''}
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
                    <p class="text-gray-500 text-sm">لا توجد أصناف بعد</p>
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
                                    <h4 class="font-bold text-white text-sm">${it.name}</h4>
                                    <div class="flex items-center gap-2 mt-1">
                                        ${badge}
                                        ${it.qty > 1 ? `<span class="text-[10px] text-gray-400 font-mono">×${it.qty}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="text-left">
                                <div class="font-mono font-black text-neonCyan text-lg">${fmtNum(total)}</div>
                                <div class="text-[10px] text-gray-500">IQD</div>
                            </div>
                        </div>
                        ${it.type !== 'direct' ? `
                        <div class="grid grid-cols-2 gap-2 text-xs mb-3">
                            <div class="bg-black/40 p-2 rounded-lg">
                                <span class="text-gray-500 block text-[10px]">ELAPSED</span>
                                <span class="font-mono font-bold text-white">${formatTime(elapsed)}</span>
                            </div>
                            ${it.type === 'countdown' ? `
                            <div class="bg-black/40 p-2 rounded-lg">
                                <span class="text-gray-500 block text-[10px]">REMAIN</span>
                                <span class="font-mono font-bold ${exp ? 'text-neonRose' : 'text-neonEmerald'}">${formatTime(rem)}</span>
                            </div>` : `
                            <div class="bg-black/40 p-2 rounded-lg">
                                <span class="text-gray-500 block text-[10px]">TYPE</span>
                                <span class="font-bold text-neonViolet">OPEN/HOUR</span>
                            </div>`}
                        </div>` : ''}
                        <div class="flex gap-2 flex-wrap">
                            ${it.type !== 'direct' && it.status === 'running' ? `<button onclick="event.stopPropagation();window.pauseItem('${it.id}')" class="btn-ghost-small">⏸ PAUSE</button>` : ''}
                            ${it.type !== 'direct' && it.status === 'paused' ? `<button onclick="event.stopPropagation();window.resumeItem('${it.id}')" class="btn-ghost-small">▶ RESUME</button>` : ''}
                            ${it.type === 'direct' ? `
                                <button onclick="event.stopPropagation();window.changeQty('${it.id}',1)" class="btn-ghost-small">+ QTY</button>
                                ${it.qty > 1 ? `<button onclick="event.stopPropagation();window.changeQty('${it.id}',-1)" class="btn-ghost-small">− QTY</button>` : ''}
                            ` : ''}
                            <button onclick="event.stopPropagation();window.openEarlyPayModal('${it.id}')" class="btn-ghost-small" style="color:#00FF9D;border-color:rgba(0,255,157,.3)">⚡ PAY</button>
                            <button onclick="event.stopPropagation();window.removeItem('${it.id}')" class="btn-ghost-small" style="color:#FF2E63;border-color:rgba(255,46,99,.3)">🗑 DEL</button>
                        </div>
                        ${(it.earlyPaid || 0) > 0 ? `
                        <div class="mt-3 pt-3 border-t border-white/5 flex justify-between text-xs">
                            <span class="text-neonEmerald">مدفوع مسبقاً:</span>
                            <span class="font-mono font-bold text-neonEmerald">${fmtNum(it.earlyPaid)} IQD</span>
                        </div>` : ''}
                    </div>
                `;
            }).join('');
        }

        const tot = calcTableTotals(t);
        $('#sum-subtotal').textContent = fmtNum(tot.subtotal) + ' IQD';
        $('#sum-early-paid').textContent = fmtNum(tot.earlyPaid) + ' IQD';
        $('#sum-discount-val').textContent = '-' + fmtNum(tot.discount) + ' IQD';
        $('#sum-final').textContent = fmtNum(tot.final);
    }

    function updateCustomerName(v) {
        const t = state.tables.find(x => x.id === state.activeTableId); if (!t) return;
        t.customer = v.trim(); saveState();
        $('#detail-customer-badge').textContent = (t.customer || 'GUEST').toUpperCase();
        renderTables();
    }
    function updateDiscountIQD(v) {
        const t = state.tables.find(x => x.id === state.activeTableId); if (!t) return;
        t.discount = Math.max(0, Number(v) || 0);
        saveState(); renderTableDetail();
    }
    function pauseItem(id) {
        const t = state.tables.find(x => x.id === state.activeTableId);
        const it = t?.items.find(i => i.id === id);
        if (!it || it.status !== 'running') return;
        it.sessionElapsed = calcItemElapsed(it);
        it.status = 'paused';
        saveState(); renderTableDetail(); renderTables();
    }
    function resumeItem(id) {
        const t = state.tables.find(x => x.id === state.activeTableId);
        const it = t?.items.find(i => i.id === id);
        if (!it || it.status !== 'paused') return;
        it.startedAt = Date.now();
        it.pausedTotal = 0;
        it.status = 'running';
        saveState(); renderTableDetail(); renderTables();
    }
    function changeQty(id, d) {
        const t = state.tables.find(x => x.id === state.activeTableId);
        const it = t?.items.find(i => i.id === id);
        if (!it) return;
        it.qty = Math.max(1, (it.qty || 1) + d);
        saveState(); renderTableDetail();
    }
    function removeItem(id) {
        const t = state.tables.find(x => x.id === state.activeTableId); if (!t) return;
        if (!confirm('حذف هذا الصنف؟')) return;
        t.items = t.items.filter(i => i.id !== id);
        saveState(); renderTableDetail(); renderTables();
        toast('تم حذف الصنف', 'warn');
    }

    // ============ Product Picker ============
    function openProductPicker() {
        state.pickerCatId = null;
        renderPicker();
        openModal('modal-product-picker');
    }
    function pickerShowCategories() {
        state.pickerCatId = null;
        renderPicker();
    }
    function renderPicker() {
        const body = $('#picker-body'); if (!body) return;
        const title = $('#picker-title');
        const sub = $('#picker-subtitle');
        const back = $('#picker-back-btn');

        if (!state.pickerCatId) {
            title.textContent = 'اختر القسم';
            sub.textContent = 'اضغط على القسم لعرض الأصناف';
            back.classList.add('hidden');
            body.innerHTML = state.categories.map(c => `
                <div class="picker-item" onclick="window.pickerSelectCat('${c.id}')">
                    <div class="text-4xl mb-2">${c.icon}</div>
                    <div class="font-bold text-white text-sm">${c.name}</div>
                    <div class="text-[10px] text-gray-500 mt-1">${state.products.filter(p => p.catId === c.id).length} صنف</div>
                </div>
            `).join('');
        } else {
            const cat = state.categories.find(c => c.id === state.pickerCatId);
            title.textContent = cat?.name || 'الأصناف';
            sub.textContent = 'اضغط على الصنف لإضافته';
            back.classList.remove('hidden');
            const prods = state.products.filter(p => p.catId === state.pickerCatId);
            if (prods.length === 0) {
                body.innerHTML = `<div class="col-span-full text-center py-8 text-gray-500 text-sm">لا توجد أصناف</div>`;
            } else {
                body.innerHTML = prods.map(p => `
                    <div class="picker-item" onclick="window.pickerAddProduct('${p.id}')">
                        <div class="text-3xl mb-2">${p.icon}</div>
                        <div class="font-bold text-white text-xs">${p.name}</div>
                        <div class="text-neonCyan font-mono font-black text-sm mt-2">${fmtNum(p.price)}</div>
                        <div class="text-[10px] text-gray-500">${p.type === 'direct' ? 'مباشر' : p.type === 'countdown' ? `عداد ${p.duration}د` : 'مفتوح/ساعة'}</div>
                    </div>
                `).join('');
            }
        }
    }
    function pickerSelectCat(id) { state.pickerCatId = id; renderPicker(); }
    function pickerAddProduct(pid) {
        const p = state.products.find(x => x.id === pid);
        const t = state.tables.find(x => x.id === state.activeTableId);
        if (!p || !t) return;
        t.items.push({
            id: uid(), productId: p.id, name: p.name, icon: p.icon,
            type: p.type, price: p.price, duration: p.duration || 0,
            qty: 1, startedAt: Date.now(), pausedAt: null, pausedTotal: 0,
            sessionElapsed: 0, earlyPaid: 0,
            status: p.type === 'direct' ? 'done' : 'running'
        });
        saveState();
        renderTableDetail(); renderTables();
        toast(`تمت إضافة "${p.name}"`, 'success');
        closeModal('modal-product-picker');
    }

    // ============ Early Payment ============
    function openEarlyPayModal(id) {
        const t = state.tables.find(x => x.id === state.activeTableId);
        const it = t?.items.find(i => i.id === id);
        if (!it) return;
        earlyPayItemId = id;
        const total = calcItemTotal(it);
        const paid = it.earlyPaid || 0;
        const rem = Math.max(0, total - paid);
        $('#early-item-name').textContent = it.name;
        $('#early-item-total').textContent = fmtNum(total) + ' IQD';
        $('#early-item-already-paid').textContent = fmtNum(paid) + ' IQD';
        $('#early-item-remaining').textContent = fmtNum(rem) + ' IQD';
        $('#input-early-pay-amount').value = rem;
        openModal('modal-early-pay');
    }
    function quickPaySingleQty() {
        const t = state.tables.find(x => x.id === state.activeTableId);
        const it = t?.items.find(i => i.id === earlyPayItemId); if (!it) return;
        const total = calcItemTotal(it);
        const paid = it.earlyPaid || 0;
        const rem = Math.max(0, total - paid);
        $('#input-early-pay-amount').value = Math.min(it.price, rem);
    }
    function quickPayAllRemaining() {
        const t = state.tables.find(x => x.id === state.activeTableId);
        const it = t?.items.find(i => i.id === earlyPayItemId); if (!it) return;
        const total = calcItemTotal(it);
        const paid = it.earlyPaid || 0;
        $('#input-early-pay-amount').value = Math.max(0, total - paid);
    }
    function confirmEarlyPayment() {
        const t = state.tables.find(x => x.id === state.activeTableId);
        const it = t?.items.find(i => i.id === earlyPayItemId); if (!it) return;
        const amount = Math.max(0, Number($('#input-early-pay-amount').value) || 0);
        const total = calcItemTotal(it);
        const paid = it.earlyPaid || 0;
        const rem = Math.max(0, total - paid);
        if (amount <= 0) { toast('أدخل مبلغاً صحيحاً', 'error'); return; }
        if (amount > rem) { toast('المبلغ أكبر من المتبقي', 'error'); return; }
        it.earlyPaid = paid + amount;
        state.revenue.daily += amount;
        saveState();
        closeModal('modal-early-pay');
        renderTableDetail(); renderTables(); renderDashboard();
        toast(`تم استلام ${fmtNum(amount)}`, 'success');
    }

    // ============ Checkout ============
    function openCheckoutModal() {
        const t = state.tables.find(x => x.id === state.activeTableId); if (!t) return;
        const tot = calcTableTotals(t);
        $('#checkout-total-val').textContent = fmtNum(tot.final) + ' IQD';
        $('#checkout-paid-amount').value = tot.final;
        $('#checkout-debt-amount').value = 0;
        openModal('modal-checkout');
    }
    function calculateDebtSplit() {
        const t = state.tables.find(x => x.id === state.activeTableId); if (!t) return;
        const tot = calcTableTotals(t);
        const paid = Math.max(0, Number($('#checkout-paid-amount').value) || 0);
        const debt = Math.max(0, tot.final - paid);
        $('#checkout-debt-amount').value = fmtNum(debt);
    }
    function confirmCheckout() {
        const t = state.tables.find(x => x.id === state.activeTableId); if (!t) return;
        const tot = calcTableTotals(t);
        const paid = Math.max(0, Math.min(tot.final, Number($('#checkout-paid-amount').value) || 0));
        const debt = Math.max(0, tot.final - paid);

        const inv = {
            id: 'INV-' + Date.now().toString().slice(-8),
            tableName: t.name,
            customer: t.customer || 'زبون عام',
            total: tot.final, paid, debt,
            date: new Date().toISOString(),
            items: t.items.map(i => ({ name: i.name, qty: i.qty, price: i.price, total: calcItemTotal(i) }))
        };
        state.invoices.unshift(inv);
        state.revenue.daily += paid;

        if (debt > 0) {
            state.debts.unshift({
                id: uid(), customer: t.customer || 'زبون عام',
                amount: debt, paid: 0, tableName: t.name,
                date: new Date().toISOString(), status: 'unpaid', invoiceId: inv.id
            });
        }
        state.tables = state.tables.filter(x => x.id !== t.id);
        state.activeTableId = null;
        saveState();
        closeModal('modal-checkout');
        switchView('invoices');
        renderTables(); renderDashboard();
        toast(debt > 0 ? `دفع ${fmtNum(paid)} + دين ${fmtNum(debt)}` : 'تم إغلاق الحساب ✅', 'success');
    }

    // ============ Transfer ============
    function openTransferModal() {
        const t = state.tables.find(x => x.id === state.activeTableId); if (!t) return;
        const others = state.tables.filter(x => x.id !== t.id && x.status === 'open');
        const sel = $('#transfer-target-select');
        if (others.length === 0) {
            sel.innerHTML = '<option value="">لا توجد طاولات أخرى</option>';
        } else {
            sel.innerHTML = others.map(o => `<option value="${o.id}">${o.name} ${o.customer ? '— ' + o.customer : ''}</option>`).join('');
        }
        openModal('modal-transfer');
    }
    function confirmTransfer() {
        const t = state.tables.find(x => x.id === state.activeTableId);
        const targetId = $('#transfer-target-select').value;
        const target = state.tables.find(x => x.id === targetId);
        if (!t || !target) { toast('اختر طاولة صحيحة', 'error'); return; }
        target.items = target.items.concat(t.items);
        target.discount = (target.discount || 0) + (t.discount || 0);
        if (t.customer && !target.customer) target.customer = t.customer;
        state.tables = state.tables.filter(x => x.id !== t.id);
        state.activeTableId = target.id;
        saveState();
        closeModal('modal-transfer');
        renderTableDetail(); renderTables();
        toast(`تم الدمج مع "${target.name}"`, 'success');
    }
    function deleteTable() {
        state.tables = state.tables.filter(x => x.id !== state.activeTableId);
        state.activeTableId = null;
        saveState();
        switchView('tables');
        renderTables(); renderDashboard();
        toast('تم حذف الطاولة', 'warn');
    }

    // ============ Debts ============
    function renderDebtsList() {
        const grid = $('#debts-grid'); if (!grid) return;
        const q = ($('#search-debts')?.value || '').toLowerCase().trim();
        let list = state.debts.slice();
        if (q) list = list.filter(d => (d.customer || '').toLowerCase().includes(q));

        if (list.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full cyber-panel p-12 text-center">
                    <div class="text-5xl mb-4">📒</div>
                    <h3 class="text-xl font-black text-white mb-2">لا توجد ديون</h3>
                    <p class="text-gray-400 text-sm">كل الحسابات مسددة ✅</p>
                </div>`;
            return;
        }
        grid.innerHTML = list.map(d => {
            const rem = Math.max(0, d.amount - (d.paid || 0));
            const paidFull = rem <= 0;
            return `
                <div class="debt-card ${paidFull ? 'paid' : ''}">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="font-black text-white text-base">${d.customer}</h3>
                            <p class="text-[11px] text-gray-400 mt-0.5 font-mono">${d.tableName} • ${formatDateTime(d.date)}</p>
                        </div>
                        <span class="text-xs font-bold px-2 py-1 rounded-lg ${paidFull ? 'bg-neonEmerald/15 text-neonEmerald' : 'bg-neonRose/15 text-neonRose'}">
                            ${paidFull ? 'PAID' : 'UNPAID'}
                        </span>
                    </div>
                    <div class="space-y-2 mb-4 text-xs">
                        <div class="flex justify-between"><span class="text-gray-400">الأصلي:</span><span class="font-mono font-bold text-white">${fmtNum(d.amount)}</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">المدفوع:</span><span class="font-mono font-bold text-neonEmerald">${fmtNum(d.paid || 0)}</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">المتبقي:</span><span class="font-mono font-bold text-neonRose text-base">${fmtNum(rem)}</span></div>
                    </div>
                    ${!paidFull ? `
                        <div class="flex gap-2">
                            <button onclick="window.openPayDebtModal('${d.id}')" class="btn-neon-full-success" style="padding:8px;font-size:12px">💵 تسديد جزئي</button>
                            <button onclick="window.payFullDebt('${d.id}')" class="btn-ghost-small">✓ كامل</button>
                        </div>
                    ` : `<div class="text-center text-xs text-neonEmerald font-bold py-2">✓ تم التسديد</div>`}
                </div>`;
        }).join('');
    }
    function openPayDebtModal(id) {
        const d = state.debts.find(x => x.id === id); if (!d) return;
        const rem = d.amount - (d.paid || 0);
        const amt = prompt(`المتبقي: ${fmtNum(rem)} IQD\nأدخل المبلغ:`, rem);
        if (amt === null) return;
        const n = Math.max(0, Math.min(rem, Number(amt) || 0));
        if (n <= 0) { toast('مبلغ غير صحيح', 'error'); return; }
        d.paid = (d.paid || 0) + n;
        if (d.paid >= d.amount) d.status = 'paid';
        state.revenue.daily += n;
        saveState(); renderDebtsList(); renderDashboard();
        toast(`تم استلام ${fmtNum(n)}`, 'success');
    }
    function payFullDebt(id) {
        const d = state.debts.find(x => x.id === id); if (!d) return;
        const rem = d.amount - (d.paid || 0);
        if (!confirm(`تسديد كلي: ${fmtNum(rem)} IQD؟`)) return;
        d.paid = d.amount; d.status = 'paid';
        state.revenue.daily += rem;
        saveState(); renderDebtsList(); renderDashboard();
        toast('تم التسديد ✅', 'success');
    }

    // ============ Invoices ============
    function renderInvoices() {
        const list = $('#invoice-list'); if (!list) return;
        if (state.invoices.length === 0) {
            list.innerHTML = `<tr><td colspan="6" class="p-12 text-center text-gray-500 text-sm">لا توجد فواتير</td></tr>`;
            return;
        }
        list.innerHTML = state.invoices.map(inv => `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="p-5 font-mono font-bold text-neonCyan text-xs">${inv.id}</td>
                <td class="p-5">
                    <div class="font-bold text-white text-sm">${inv.tableName}</div>
                    <div class="text-[11px] text-gray-400">${inv.customer}</div>
                </td>
                <td class="p-5 font-mono font-black text-white">${fmtNum(inv.total)}</td>
                <td class="p-5">
                    ${inv.debt > 0
                        ? `<span class="text-xs font-bold px-3 py-1 rounded-lg bg-neonRose/15 text-neonRose">دين ${fmtNum(inv.debt)}</span>`
                        : `<span class="text-xs font-bold px-3 py-1 rounded-lg bg-neonEmerald/15 text-neonEmerald">مسدد</span>`}
                </td>
                <td class="p-5 text-xs text-gray-400 font-mono">${formatDateTime(inv.date)}</td>
                <td class="p-5">
                    <button onclick="window.printInvoice('${inv.id}')" class="text-neonCyan hover:underline text-xs font-bold">🖨 طباعة</button>
                </td>
            </tr>
        `).join('');
    }
    function printInvoice(id) {
        const inv = state.invoices.find(x => x.id === id); if (!inv) return;
        const w = window.open('', '_blank');
        w.document.write(`<html dir="rtl"><head><title>${inv.id}</title>
        <style>body{font-family:Tahoma;padding:30px;color:#000}h1{text-align:center;color:#8B5CF6}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ccc;padding:10px;text-align:right}th{background:#f0f0f0}</style>
        </head><body>
        <h1>716QX NEXUS</h1>
        <p><b>رقم الفاتورة:</b> ${inv.id}</p>
        <p><b>الطاولة:</b> ${inv.tableName}</p>
        <p><b>الزبون:</b> ${inv.customer}</p>
        <p><b>التاريخ:</b> ${formatDateTime(inv.date)}</p>
        <table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
        <tbody>${inv.items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${fmtNum(i.price)}</td><td>${fmtNum(i.total)}</td></tr>`).join('')}</tbody>
        </table>
        <h3>الإجمالي: ${fmtNum(inv.total)} IQD</h3>
        <h3>المدفوع: ${fmtNum(inv.paid)} IQD</h3>
        <h3>الدين: ${fmtNum(inv.debt)} IQD</h3>
        </body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 500);
    }
    function exportInvoicesCSV() {
        if (state.invoices.length === 0) { toast('لا توجد فواتير', 'warn'); return; }
        const rows = [['ID', 'Table', 'Customer', 'Total', 'Paid', 'Debt', 'Date']];
        state.invoices.forEach(inv => rows.push([inv.id, inv.tableName, inv.customer, inv.total, inv.paid, inv.debt, formatDateTime(inv.date)]));
        const csv = '\uFEFF' + rows.map(r => r.map(x => `"${x}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `invoices_${Date.now()}.csv`;
        a.click();
        toast('تم التصدير ✅', 'success');
    }
    function clearAllInvoices() {
        state.invoices = []; saveState(); renderInvoices();
        toast('تم مسح الأرشيف', 'warn');
    }

    // ============ Menu ============
    function renderMenu() {
        const nav = $('#menu-category-nav');
        if (nav) {
            nav.innerHTML = state.categories.map(c => `
                <button onclick="window.scrollToCategory('${c.id}')" class="btn-ghost-small whitespace-nowrap">${c.icon} ${c.name}</button>
            `).join('');
        }
        const container = $('#menu-categories-container');
        if (!container) return;
        if (state.categories.length === 0) {
            container.innerHTML = `<div class="cyber-panel p-12 text-center"><div class="text-5xl mb-4">📋</div><p class="text-gray-400">لا توجد أقسام</p></div>`;
            return;
        }
        container.innerHTML = state.categories.map(c => {
            const prods = state.products.filter(p => p.catId === c.id);
            return `
                <section id="cat-${c.id}" class="cyber-panel p-6">
                    <div class="flex justify-between items-center mb-5">
                        <div class="flex items-center gap-3">
                            <div class="text-3xl">${c.icon}</div>
                            <div>
                                <h3 class="text-xl font-black text-white">${c.name}</h3>
                                <p class="text-xs text-gray-400 font-mono">${prods.length} ITEMS</p>
                            </div>
                        </div>
                        <button onclick="window.deleteCategory('${c.id}')" class="btn-ghost-small" style="color:#FF2E63;border-color:rgba(255,46,99,.3)">🗑 حذف</button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        ${prods.length === 0
                            ? `<div class="col-span-full text-center py-6 text-gray-500 text-sm border border-dashed border-white/10 rounded-xl">لا توجد أصناف</div>`
                            : prods.map(p => `
                                <div class="p-4 rounded-2xl bg-black/40 border border-white/5 flex justify-between items-center">
                                    <div class="flex items-center gap-3">
                                        <div class="text-2xl">${p.icon}</div>
                                        <div>
                                            <div class="font-bold text-white text-sm">${p.name}</div>
                                            <div class="text-[11px] text-gray-400 font-mono">${p.type === 'direct' ? 'DIRECT' : p.type === 'countdown' ? `${p.duration}MIN` : 'PER.HOUR'}</div>
                                        </div>
                                    </div>
                                    <div class="text-left">
                                        <div class="font-mono font-black text-neonCyan">${fmtNum(p.price)}</div>
                                        <button onclick="window.deleteProduct('${p.id}')" class="text-[10px] text-neonRose hover:underline mt-1">حذف</button>
                                    </div>
                                </div>
                            `).join('')}
                    </div>
                </section>`;
        }).join('');
    }
    function scrollToCategory(id) {
        const el = document.getElementById('cat-' + id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function openAddProductModal() {
        const sel = $('#new-prod-cat-select');
        sel.innerHTML = state.categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
        $('#new-prod-name').value = '';
        $('#new-prod-price').value = '';
        $('#new-prod-duration').value = '';
        $('#new-prod-icon').value = '🎮';
        $('#new-prod-type').value = 'direct';
        handleProductTypeChange('direct');
        openModal('modal-add-product');
    }
    function handleProductTypeChange(type) {
        const durRow = $('#row-prod-duration');
        const lbl = $('#lbl-prod-price');
        if (type === 'countdown') {
            durRow.classList.remove('hidden');
            lbl.textContent = 'السعر الإجمالي للوقت (IQD)';
        } else if (type === 'open') {
            durRow.classList.add('hidden');
            lbl.textContent = 'سعر الساعة (IQD)';
        } else {
            durRow.classList.add('hidden');
            lbl.textContent = 'السعر (IQD)';
        }
    }
    function confirmAddProduct() {
        const catId = $('#new-prod-cat-select').value;
        const name = $('#new-prod-name').value.trim();
        const type = $('#new-prod-type').value;
        const price = Number($('#new-prod-price').value) || 0;
        const duration = Number($('#new-prod-duration').value) || 0;
        const icon = $('#new-prod-icon').value.trim() || '📦';
        if (!name) { toast('أدخل اسم الصنف', 'error'); return; }
        if (price <= 0) { toast('أدخل سعراً صحيحاً', 'error'); return; }
        if (type === 'countdown' && duration <= 0) { toast('أدخل مدة', 'error'); return; }
        state.products.push({
            id: uid(), catId, name, icon, type,
            duration: type === 'countdown' ? duration : 0,
            price
        });
        saveState();
        closeModal('modal-add-product');
        renderMenu();
        toast(`تمت إضافة "${name}"`, 'success');
    }
    function deleteProduct(id) {
        if (!confirm('حذف هذا الصنف؟')) return;
        state.products = state.products.filter(p => p.id !== id);
        saveState(); renderMenu();
        toast('تم الحذف', 'warn');
    }
    function confirmAddCategory() {
        const name = $('#new-cat-name').value.trim();
        const icon = $('#new-cat-icon').value.trim() || '📁';
        if (!name) { toast('أدخل اسم القسم', 'error'); return; }
        state.categories.push({ id: uid(), name, icon });
        saveState();
        closeModal('modal-add-category');
        $('#new-cat-name').value = '';
        renderMenu();
        toast(`تمت إضافة "${name}"`, 'success');
    }
    function deleteCategory(id) {
        const prods = state.products.filter(p => p.catId === id);
        if (prods.length > 0) {
            if (!confirm(`يوجد ${prods.length} صنف. سيتم حذفهم. متأكد؟`)) return;
        } else {
            if (!confirm('حذف القسم؟')) return;
        }
        state.categories = state.categories.filter(c => c.id !== id);
        state.products = state.products.filter(p => p.catId !== id);
        saveState(); renderMenu();
        toast('تم الحذف', 'warn');
    }

    // ============ Ticker ============
    setInterval(() => {
        if (state.activeView === 'table-detail' && state.activeTableId) renderTableDetail();
        if (state.activeView === 'tables') renderTables();
    }, 1000);

    // ============ Render All ============
    function renderAll() {
        renderDashboard();
        renderTables();
        renderDebtsList();
        renderInvoices();
        renderMenu();
    }

    // ============ Keyboard ============
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('[id^="modal-"]:not(.hidden)').forEach(m => m.classList.add('hidden'));
            closeDrawer();
        }
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            switchView('tables');
            setTimeout(() => $('#search-tables')?.focus(), 200);
        }
    });

    // ============ Init ============
    function init() {
        renderAll();
        switchView('dashboard');
        console.log('%c716QX NEXUS OS 4.0 ✅', 'color:#00F0FF;font-size:20px;font-weight:bold;');
        console.log('%cAll systems operational', 'color:#B14EFF;font-size:14px;');
    }

    // ============ Expose ============
    Object.assign(window, {
        switchView, toggleDrawer, openModal, closeModal,
        resetDailyRevenue, resetMonthlyRevenue, resetSystemFull,
        openAddTableModal, suggestTableName, confirmAddTable, searchTables,
        openTableDetail, renderTableDetail, updateCustomerName, updateDiscountIQD,
        pauseItem, resumeItem, changeQty, removeItem,
        openProductPicker, pickerShowCategories, pickerSelectCat, pickerAddProduct,
        openEarlyPayModal, quickPaySingleQty, quickPayAllRemaining, confirmEarlyPayment,
        openCheckoutModal, calculateDebtSplit, confirmCheckout,
        openTransferModal, confirmTransfer, deleteTable,
        renderDebtsList, openPayDebtModal, payFullDebt,
        renderInvoices, printInvoice, exportInvoicesCSV, clearAllInvoices,
        renderMenu, scrollToCategory, openAddProductModal, handleProductTypeChange,
        confirmAddProduct, deleteProduct, confirmAddCategory, deleteCategory,
        _state: () => state,
        _reset: () => { localStorage.removeItem(STATE_KEY); location.reload(); }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
