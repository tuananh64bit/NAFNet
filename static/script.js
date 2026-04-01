document.addEventListener('DOMContentLoaded', () => {
    // === ELEMENTS ===
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const processBtn = document.getElementById('process-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const resetBtn = document.getElementById('reset-btn');
    const taskBtns = document.querySelectorAll('.task-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    // States
    const stateUpload = document.getElementById('state-upload');
    const statePreview = document.getElementById('state-preview');
    const stateResult = document.getElementById('state-result');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Display elements
    const previewImg = document.getElementById('preview-img');
    const noPreviewBox = document.getElementById('no-preview-box');
    const filenameDisplay = document.getElementById('filename-display');
    const selectedModeDisplay = document.getElementById('selected-mode-display');

    // Result elements
    const afterImg = document.getElementById('after-img');
    const beforeImg = document.getElementById('before-img');
    const beforeWrapper = document.getElementById('before-wrapper');
    const handle = document.getElementById('handle');
    const container = document.getElementById('compare-container');
    const downloadBtn = document.getElementById('download-btn');

    // Variables
    let currentFile = null;
    let currentTask = 'deblur';
    const supportedExts = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'heic'];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    // === THEME TOGGLE ===
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeIcon.className = 'fas fa-sun';
    } else {
        document.documentElement.classList.remove('dark');
        themeIcon.className = 'fas fa-moon';
    }

    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.theme = isDark ? 'dark' : 'light';
        themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    });

    // === TOAST NOTIFICATION ===
    function showToast(message) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i> ${message}`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    }

    // === TASK SELECTION ===
    taskBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            taskBtns.forEach(b => {
                b.classList.remove('active-task');
                b.classList.add('text-gray-500', 'dark:text-gray-400');
                b.classList.remove('text-gray-900', 'dark:text-white');
            });
            btn.classList.add('active-task');
            btn.classList.remove('text-gray-500', 'dark:text-gray-400');
            btn.classList.add('text-gray-900', 'dark:text-white');
            
            currentTask = btn.getAttribute('data-task');
            selectedModeDisplay.textContent = currentTask.toUpperCase();
        });
    });

    // === DRAG & DROP & FILE INPUT ===
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
        if(e.dataTransfer.files.length > 0) {
            processFileSelection(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) {
            processFileSelection(e.target.files[0]);
            fileInput.value = ''; // reset
        }
    });

    function processFileSelection(file) {
        if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.heic')) {
            showToast("Please upload a valid image file.");
            return;
        }
        if (file.size > MAX_SIZE) {
            showToast(`File too large (${(file.size/1024/1024).toFixed(1)}MB). Max allowed is 10MB.`);
            return;
        }

        currentFile = file;
        showPreview(file);
    }

    function showPreview(file) {
        stateUpload.classList.add('hidden');
        statePreview.classList.remove('hidden', 'flex'); 
        statePreview.classList.add('flex');

        filenameDisplay.textContent = file.name;
        selectedModeDisplay.textContent = currentTask.toUpperCase();

        const ext = file.name.split('.').pop().toLowerCase();
        
        if (supportedExts.includes(ext) && ext !== 'heic') {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewImg.classList.remove('hidden');
                noPreviewBox.classList.add('hidden');
                beforeImg.src = e.target.result; // prep for result
            };
            reader.readAsDataURL(file);
        } else {
            previewImg.classList.add('hidden');
            noPreviewBox.classList.remove('hidden');
            // If format not previewable, clear before
            beforeImg.src = '';
        }
    }

    cancelBtn.addEventListener('click', () => {
        statePreview.classList.add('hidden');
        statePreview.classList.remove('flex');
        stateUpload.classList.remove('hidden');
        currentFile = null;
    });

    resetBtn.addEventListener('click', () => {
        stateResult.classList.add('hidden');
        stateResult.classList.remove('flex');
        stateUpload.classList.remove('hidden');
        currentFile = null;
    });

    // === PROCESS REQUEST ===
    processBtn.addEventListener('click', async () => {
        if(!currentFile) return;

        // Disabling UI
        processBtn.disabled = true;
        cancelBtn.disabled = true;
        loadingOverlay.classList.remove('hidden');
        // allow browser to render block
        setTimeout(() => loadingOverlay.classList.remove('opacity-0'), 10);

        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('task', currentTask);

        try {
            const res = await fetch('/api/process', { method: 'POST', body: formData });
            
            if(!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error((data && data.detail) ? data.detail : "Server communication error");
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            afterImg.src = url;
            downloadBtn.href = url;
            downloadBtn.download = `nafnet_${currentTask}_${currentFile.name.split('.')[0]}.png`;

            if(!beforeImg.src || beforeImg.src === window.location.href) {
                 beforeImg.src = url; 
            }

            afterImg.onload = () => {
                loadingOverlay.classList.add('opacity-0', 'hidden');
                statePreview.classList.add('hidden');
                statePreview.classList.remove('flex');
                stateResult.classList.remove('hidden');
                stateResult.classList.add('flex');
                
                processBtn.disabled = false;
                cancelBtn.disabled = false;
                initSlider();
            };

        } catch (e) {
            showToast(e.message);
            loadingOverlay.classList.add('opacity-0', 'hidden');
            processBtn.disabled = false;
            cancelBtn.disabled = false;
        }
    });

    // === SLIDER LOGIC ===
    let sliderInitialized = false;
    function initSlider() {
        setTimeout(() => {
            beforeImg.style.width = container.offsetWidth + 'px';
            beforeImg.style.height = container.offsetHeight + 'px';
        }, 100);

        if(sliderInitialized) return;
        sliderInitialized = true;

        let isDown = false;
        
        function move(e) {
            if (!isDown && e.type !== 'mousemove') return;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const rect = container.getBoundingClientRect();
            
            let x = clientX - rect.left;
            x = Math.max(0, Math.min(x, rect.width));
            const percent = (x / rect.width) * 100;
            
            beforeWrapper.style.width = percent + '%';
            handle.style.left = percent + '%';
        }

        container.addEventListener('mousedown', () => isDown = true);
        window.addEventListener('mouseup', () => isDown = false);
        container.addEventListener('mousemove', (e) => isDown && move(e));
        
        container.addEventListener('touchstart', (e) => { isDown = true; move(e); }, {passive:false});
        container.addEventListener('touchend', () => isDown = false);
        container.addEventListener('touchmove', (e) => { 
            if(isDown && e.cancelable) { e.preventDefault(); move(e); } 
        }, {passive:false});

        window.addEventListener('resize', () => {
            if(!stateResult.classList.contains('hidden')) {
                beforeImg.style.width = container.offsetWidth + 'px';
                beforeImg.style.height = container.offsetHeight + 'px';
            }
        });
    }
});
