/* ==================================================================
   716QX NEXUS 7.0 — Guard (Protection)
   ================================================================== */
(function () {
    'use strict';

    // تعطيل Right Click
    document.addEventListener('contextmenu', e => e.preventDefault());

    // تعطيل اختصارات DevTools
    document.addEventListener('keydown', e => {
        const k = e.key;
        const ctrlShift = e.ctrlKey && e.shiftKey;
        const ctrl = e.ctrlKey;
        
        if (
            k === 'F12' ||
            (ctrlShift && ['I','i','J','j','C','c','K','k'].includes(k)) ||
            (ctrl && ['U','u','S','s','P','p'].includes(k)) ||
            (ctrl && e.metaKey)
        ) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });

    // كشف DevTools مفتوح (اختياري)
    let devtoolsOpen = false;
    setInterval(() => {
        const threshold = 160;
        if (
            window.outerWidth - window.innerWidth > threshold ||
            window.outerHeight - window.innerHeight > threshold
        ) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                console.clear();
                console.log('%c⚠️ STOP', 'color:#FF0080;font-size:48px;font-weight:900;');
                console.log('%cهذا الموقع محمي. الرجاء عدم محاولة التعديل.', 'color:#00FFFF;font-size:16px;');
            }
        } else {
            devtoolsOpen = false;
        }
    }, 1000);

    // مسح الكونسول باستمرار
    if (!localStorage.getItem('_dbg_off')) {
        setInterval(() => { try { console.clear(); } catch (e) {} }, 2000);
    }
})();
