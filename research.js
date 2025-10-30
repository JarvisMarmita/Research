// ===========================
// CUSTOM SCROLLBAR LOGIC
// ===========================
(function(){
    const scrollEl = document.getElementById('bookScroll');
    const thumb = document.getElementById('scrollThumb');
    const track = document.getElementById('scrollTrack');
    
    if (!scrollEl || !thumb || !track) {
        console.error('Scrollbar elements not found');
        return;
    }

    // Get current thumb translateY value
    function getThumbTranslateY() {
        const cs = window.getComputedStyle(thumb).transform;
        if (!cs || cs === 'none') return 0;
        
        try {
            const m = new DOMMatrix(cs);
            return m.m42;
        } catch (err) {
            const nums = cs.match(/matrix.*\((.+)\)/);
            if (!nums) return 0;
            const parts = nums[1].split(',').map(s => parseFloat(s));
            return parts.length === 6 ? parts[5] : (parts.length === 16 ? parts[13] : 0);
        }
    }

    // Update scrollbar thumb position and size
    function updateThumb(){
        const viewH = scrollEl.clientHeight;
        const contentH = scrollEl.scrollHeight;
        const trackH = track.clientHeight;
        
        // Hide scrollbar if content fits in view
        if (contentH <= viewH) {
            thumb.style.display = 'none';
            return;
        } else {
            thumb.style.display = '';
        }
        
        // Calculate thumb size
        const minThumb = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--thumb-min')) || 48;
        const thumbH = Math.max(minThumb, Math.round(viewH / contentH * trackH));
        const maxTop = Math.max(0, trackH - thumbH);
        
        // Calculate thumb position based on scroll
        const ratio = scrollEl.scrollTop / (contentH - viewH || 1);
        const top = Math.round(ratio * maxTop);
        
        // Apply styles
        thumb.style.height = thumbH + 'px';
        thumb.style.transform = `translateY(${top}px)`;
        
        // Update ARIA attributes for accessibility
        const percent = Math.round((scrollEl.scrollTop / (contentH - viewH || 1)) * 100);
        thumb.setAttribute('aria-valuenow', percent);
    }

    // Initialize scrollbar with multiple attempts
    function initScrollbar() {
        updateThumb();
        // Force reflow to ensure measurements are accurate
        void scrollEl.offsetHeight;
        updateThumb();
    }

    // Event listeners for scroll synchronization
    scrollEl.addEventListener('scroll', updateThumb, { passive: true });
    window.addEventListener('resize', updateThumb);
    
    // Initialize on different loading stages
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollbar);
    } else {
        initScrollbar();
    }
    window.addEventListener('load', initScrollbar);
    
    // Backup initialization with delays to catch late-rendering content
    setTimeout(initScrollbar, 50);
    setTimeout(initScrollbar, 150);
    setTimeout(initScrollbar, 300);

    // Observe size changes
    const resizeObserver = new ResizeObserver(updateThumb);
    resizeObserver.observe(scrollEl);
    resizeObserver.observe(track);

    // Observe content changes
    const mutationObserver = new MutationObserver(updateThumb);
    mutationObserver.observe(scrollEl, { 
        childList: true, 
        subtree: true, 
        characterData: true 
    });

    // ===========================
    // DRAGGING LOGIC
    // ===========================
    let dragging = false;
    let startY = 0;
    let startTop = 0;
    let activeId = null;

    thumb.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        dragging = true;
        activeId = e.pointerId;
        thumb.setPointerCapture(activeId);
        startY = e.clientY;
        startTop = getThumbTranslateY();
        thumb.classList.add('dragging');
    });

    function onPointerMove(e){
        if (!dragging || e.pointerId !== activeId) return;
        
        const dy = e.clientY - startY;
        const trackH = track.clientHeight;
        const thumbH = thumb.clientHeight;
        const maxTop = Math.max(0, trackH - thumbH);
        
        // Calculate new thumb position
        let newTop = Math.max(0, Math.min(maxTop, startTop + dy));
        thumb.style.transform = `translateY(${newTop}px)`;
        
        // Sync scroll position
        const ratio = newTop / (maxTop || 1);
        scrollEl.scrollTop = ratio * (scrollEl.scrollHeight - scrollEl.clientHeight);
    }

    function endDrag(e){
        if (!dragging || e.pointerId !== activeId) return;
        dragging = false;
        thumb.classList.remove('dragging');
        try { 
            thumb.releasePointerCapture(activeId); 
        } catch(_) {}
        activeId = null;
    }

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);

    // ===========================
    // CLICK ON TRACK TO JUMP
    // ===========================
    track.addEventListener('click', (e) => {
        if (e.target === thumb) return;
        
        const rect = track.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const thumbH = thumb.clientHeight;
        const trackH = rect.height;
        const maxTop = Math.max(0, trackH - thumbH);
        
        // Center thumb on click position
        let newTop = Math.max(0, Math.min(maxTop, clickY - thumbH / 2));
        const ratio = newTop / (maxTop || 1);
        scrollEl.scrollTop = ratio * (scrollEl.scrollHeight - scrollEl.clientHeight);
        updateThumb();
    }, { passive: true });

    // ===========================
    // KEYBOARD SUPPORT
    // ===========================
    thumb.setAttribute('tabindex','0');
    thumb.addEventListener('keydown', (e) => {
        const step = Math.max(24, thumb.clientHeight * 0.25);
        
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            scrollEl.scrollTop += step;
            e.preventDefault();
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            scrollEl.scrollTop -= step;
            e.preventDefault();
        } else if (e.key === 'Home') {
            scrollEl.scrollTop = 0;
            e.preventDefault();
        } else if (e.key === 'End') {
            scrollEl.scrollTop = scrollEl.scrollHeight;
            e.preventDefault();
        }
    });

})();

// ===========================
// PAGE TOGGLE FUNCTIONALITY
// ===========================
(function(){
    const pageoneleft = document.getElementById("p1left");
    const pageoneright = document.getElementById("p1right");
    const pagetwoleft = document.getElementById("p2left");
    const pagetworight = document.getElementById("p2right");  
    const pagebtn = document.getElementById("btnpage");
    
    if (!pageoneleft || !pageoneright || !pagetwoleft || !pagetworight || !pagebtn) {
        console.error('Page elements not found');
        return;
    }

    // Initialize: Show page one, hide page two
    pageoneleft.style.display = "block";
    pagetwoleft.style.display = "none";
    pageoneright.style.display = "block";
    pagetworight.style.display = "none";
    
    // Make toggleDiv available globally
    window.toggleDiv = function() {
        const scrollEl = document.getElementById('bookScroll');
        
        // Toggle left pages
        if (pageoneleft.style.display === "none") {
            pageoneleft.style.display = "block";
            pagetwoleft.style.display = "none";
            pagebtn.textContent = "Page One";
        } else {
            pageoneleft.style.display = "none";
            pagetwoleft.style.display = "block";
            pagebtn.textContent = "Page Two";
        }

        // Toggle right pages
        if (pageoneright.style.display === "none") {
            pageoneright.style.display = "block";
            pagetworight.style.display = "none";
        } else {
            pageoneright.style.display = "none";
            pagetworight.style.display = "block";
        }
        
        // Update scrollbar after page content changes
        if (scrollEl) {
            setTimeout(() => {
                scrollEl.dispatchEvent(new Event('scroll'));
                // Force update by triggering a small scroll
                const currentScroll = scrollEl.scrollTop;
                scrollEl.scrollTop = currentScroll + 1;
                scrollEl.scrollTop = currentScroll;
            }, 50);
        }
    };
})();