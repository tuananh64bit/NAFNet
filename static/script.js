document.addEventListener('DOMContentLoaded', () => {
    // === ELEMENTS ===
    const fileInput = document.getElementById('file-input');
    const processBtn = document.getElementById('process-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const taskBtns = document.querySelectorAll('.task-btn');
    
    // States
    const stateUpload = document.getElementById('state-upload');
    const statePreview = document.getElementById('state-preview');
    const stateLoading = document.getElementById('state-loading');
    const stateResult = document.getElementById('state-result');

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
    let currentTask = 'deblur'; // Mặc định
    const supportedExts = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'];

    // === 1. LOGIC CHỌN TASK ===
    taskBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            taskBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            // Set current task
            currentTask = btn.getAttribute('data-task');
            console.log("Selected Task:", currentTask);
        });
    });

    // === 2. XỬ LÝ CHỌN FILE ===
    fileInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) {
            currentFile = e.target.files[0];
            showPreview(currentFile);
            fileInput.value = ''; // Reset input
        }
    });

    function showPreview(file) {
        stateUpload.classList.add('hidden');
        statePreview.classList.remove('hidden');

        filenameDisplay.textContent = file.name;
        selectedModeDisplay.textContent = currentTask.toUpperCase();

        const ext = file.name.split('.').pop().toLowerCase();
        
        if (supportedExts.includes(ext)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewImg.classList.remove('hidden');
                noPreviewBox.classList.add('hidden');
                // Set sẵn ảnh gốc cho slider (phòng khi không có HEIC)
                beforeImg.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            // Trường hợp HEIC hoặc file lạ
            previewImg.classList.add('hidden');
            noPreviewBox.classList.remove('hidden');
        }
    }

    // Nút Quay lại (Cancel)
    cancelBtn.addEventListener('click', () => {
        statePreview.classList.add('hidden');
        stateUpload.classList.remove('hidden');
        currentFile = null;
    });

    // === 3. XỬ LÝ GỬI API ===
    processBtn.addEventListener('click', async () => {
        if(!currentFile) return;

        statePreview.classList.add('hidden');
        stateLoading.classList.remove('hidden');

        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('task', currentTask); // <--- QUAN TRỌNG: Gửi task lên server

        try {
            const res = await fetch('/api/process', { method: 'POST', body: formData });
            
            if(!res.ok) {
                const text = await res.text();
                throw new Error(text || "Lỗi Server");
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            // Setup ảnh kết quả
            afterImg.src = url;
            downloadBtn.href = url;
            downloadBtn.download = `nafnet_${currentTask}_${currentFile.name.split('.')[0]}.png`;

            // Nếu lúc nãy không xem được preview (HEIC), giờ lấy ảnh kết quả làm nền cho Before luôn
            // (Hoặc bạn có thể convert file gốc sang base64 ở server trả về để làm Before chuẩn hơn)
            if(previewImg.classList.contains('hidden')) {
                beforeImg.src = url; 
                // Lưu ý: Nếu muốn before chuẩn cho HEIC, backend cần trả về cả ảnh gốc đã convert.
                // Ở đây tạm thời dùng ảnh sau xử lý để tránh lỗi hiển thị.
            }

            afterImg.onload = () => {
                stateLoading.classList.add('hidden');
                stateResult.classList.remove('hidden');
                initSlider();
            };

        } catch (e) {
            alert("Lỗi: " + e.message);
            stateLoading.classList.add('hidden');
            statePreview.classList.remove('hidden');
        }
    });

    // === 4. SLIDER LOGIC (BEFORE / AFTER) ===
    function initSlider() {
        // Đợi ảnh load xong layout mới tính toán kích thước
        setTimeout(() => {
            beforeImg.style.width = container.offsetWidth + 'px';
            beforeImg.style.height = container.offsetHeight + 'px';
        }, 100);

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

        // Mouse Events
        container.addEventListener('mousedown', () => isDown = true);
        window.addEventListener('mouseup', () => isDown = false);
        container.addEventListener('mousemove', (e) => isDown && move(e));
        
        // Touch Events
        container.addEventListener('touchstart', (e) => { isDown = true; move(e); }, {passive:false});
        container.addEventListener('touchend', () => isDown = false);
        container.addEventListener('touchmove', (e) => { 
            if(isDown) { e.preventDefault(); move(e); } 
        }, {passive:false});

        // Resize Event
        window.addEventListener('resize', () => {
            if(stateResult.classList.contains('hidden')) return;
            beforeImg.style.width = container.offsetWidth + 'px';
            beforeImg.style.height = container.offsetHeight + 'px';
        });
    }
});
