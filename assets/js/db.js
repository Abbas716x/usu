/* ==================================================================
   716QX NEXUS 7.1 — DB Client (Proxy via Netlify Function)
   ✅ ماكو توكن هنا — كله سري في Netlify
   ================================================================== */
(function () {
    'use strict';

    const API = '/api/turso';

    async function call(statements) {
        const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statements })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'DB error ' + res.status);
        }
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'DB failed');
        return data.results;
    }

    async function turso(sql, args = []) {
        const results = await call([{ sql, args }]);
        return results[0] || { rows: [], cols: [] };
    }

    async function tursoBatch(statements) {
        return await call(statements);
    }

    async function q(sql, args) {
        return (await turso(sql, args)).rows;
    }

    async function q1(sql, args) {
        const rows = await q(sql, args);
        return rows[0] || null;
    }

    async function exec(sql, args) {
        return await turso(sql, args);
    }

    window.DB = { call, turso, tursoBatch, q, q1, exec };
})();
