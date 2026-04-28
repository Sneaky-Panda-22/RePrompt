// === Theme Toggle (Default: Light) ===
(function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
})();

document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");

    function updateThemeIcon() {
        if (!themeIcon) return;
        if (document.body.classList.contains('dark-mode')) {
            themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
        } else {
            themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
        }
    }

    if (themeToggle) {
        updateThemeIcon();
        themeToggle.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");
            const isDark = document.body.classList.contains("dark-mode");
            localStorage.setItem("theme", isDark ? "dark" : "light");
            updateThemeIcon();
        });
    }

    const uploadZone = document.getElementById("upload-zone");
    const fileInput = document.getElementById("file-input");
    const imagePreview = document.getElementById("image-preview");
    const loadingState = document.getElementById("loading-state");
    const resultsSection = document.getElementById("results");
    const repromptText = document.getElementById("reprompt-text");
    const copyBtn = document.getElementById("copy-btn");
    const statsGrid = document.getElementById("stats-grid");

    // === Scroll Reveal (Apple-style) ===
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

    document.querySelectorAll('.reveal, .reveal-scale').forEach(el => {
        revealObserver.observe(el);
    });

    // Re-observe after page section switch
    function observeReveals() {
        document.querySelectorAll('.reveal:not(.visible), .reveal-scale:not(.visible)').forEach(el => {
            revealObserver.observe(el);
        });
    }

    // === Navigation Section Switching ===
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    const pageSections = document.querySelectorAll('.page-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-section');

            navLinks.forEach(l => {
                l.classList.remove('active');
                const existingDot = l.querySelector('.nav-link-dot');
                if (existingDot) existingDot.remove();
            });
            link.classList.add('active');

            pageSections.forEach(s => s.classList.remove('page-section--active'));
            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.classList.add('page-section--active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });

    // === Upload ===
    uploadZone.addEventListener("click", () => fileInput.click());

    uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadZone.classList.add("dragover");
    });
    uploadZone.addEventListener("dragleave", () => {
        uploadZone.classList.remove("dragover");
    });
    uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadZone.classList.remove("dragover");
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length) handleFile(fileInput.files[0]);
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        loadingState.style.display = 'block';
        resultsSection.style.display = 'none';
        const loadingText = document.getElementById("loading-text");
        if (loadingText) loadingText.innerHTML = 'Compressing image...<span class="loading-dots"></span>';

        compressImage(file, (compressedFile, base64Preview) => {
            imagePreview.src = base64Preview;
            imagePreview.style.opacity = '1';
            uploadZone.classList.add('has-image');
            processImage(compressedFile, base64Preview);
        });
    }


    let loadingInterval;
    const loadingMessages = [
        "Extracting shadow hardness...",
        "Analyzing depth of field...",
        "Evaluating brightness distribution...",
        "Querying Gemini Vision model...",
        "Synthesizing creative prompt...",
        "Finalizing details..."
    ];

    async function processImage(file, base64Preview) {
        const loadingText = document.getElementById("loading-text");
        let msgIndex = 0;

        if (loadingText) {
            loadingText.innerHTML = `${loadingMessages[0]}<span class="loading-dots"></span>`;
            loadingInterval = setInterval(() => {
                msgIndex = (msgIndex + 1) % loadingMessages.length;
                loadingText.innerHTML = `${loadingMessages[msgIndex]}<span class="loading-dots"></span>`;
            }, 1500);
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/reprompt", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Server error: ${response.statusText}`);
            }

            const data = await response.json();
            repromptText.textContent = data.reprompt;

            saveToHistory(base64Preview, data.reprompt);

            statsGrid.innerHTML = '';
            const labels = {
                brightness_class: "Brightness",
                dof_class: "Depth of Field",
                shadow_hardness: "Shadows",
                shadow_score: "Shadow Contrast",
                light_direction: "Light Direction",
                contrast_ratio: "Contrast Ratio",
                aspect_ratio: "Aspect Ratio",
                global_contrast: "Global Contrast",
                sharpness_score: "Sharpness"
            };

            let delay = 0;
            for (const [key, value] of Object.entries(data.stats)) {
                if (labels[key]) {
                    const card = document.createElement("div");
                    card.className = `stat-card reveal reveal-delay-${Math.min(delay, 4)}`;
                    const valStr = typeof value === 'number' ? value.toFixed(2) : value;
                    card.innerHTML = `
                        <div class="stat-label">${labels[key]}</div>
                        <div class="stat-value">${valStr}</div>
                    `;
                    statsGrid.appendChild(card);
                    delay++;
                }
            }

            clearInterval(loadingInterval);
            loadingState.style.display = 'none';
            resultsSection.style.display = 'block';
            showToast("Analysis complete!", "success");

            // Trigger reveal animations for new results
            requestAnimationFrame(() => {
                resultsSection.querySelectorAll('.reveal, .reveal-scale').forEach(el => {
                    revealObserver.observe(el);
                });
            });

            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error("Error generating reprompt:", error);
            showToast(error.message || "Failed to process image.", "error");
            clearInterval(loadingInterval);
            loadingState.style.display = 'none';
        }
    }

    // === Copy Button ===
    copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(repromptText.textContent).then(() => {
            const span = copyBtn.querySelector('span');
            if (span) span.textContent = "Copied!";
            copyBtn.style.background = "#34c759";
            setTimeout(() => {
                if (span) span.textContent = "Copy";
                copyBtn.style.background = "";
            }, 1800);
        });
    });

    // === Reset Button ===
    const resetBtn = document.getElementById("reset-btn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            // Clear image preview
            imagePreview.src = "";
            imagePreview.style.opacity = "0";
            uploadZone.classList.remove("has-image");

            // Reset file input
            fileInput.value = "";

            // Hide results & loading
            resultsSection.style.display = "none";
            loadingState.style.display = "none";

            // Reset prompt text
            repromptText.textContent = "Your reverse-engineered prompt will appear here.";

            // Clear stats
            statsGrid.innerHTML = "";

            // Scroll to top
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // === Download PDF Button ===
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener("click", () => {
            if (!imagePreview.src || !imagePreview.src.startsWith("data:image")) {
                alert("No image available to generate PDF.");
                return;
            }

            try {
                // Change button text temporarily
                const originalText = downloadPdfBtn.textContent;
                downloadPdfBtn.textContent = "Generating...";

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                // Add Title
                doc.setFontSize(22);
                doc.setFont("helvetica", "bold");
                doc.text("RePrompt Analysis", 20, 20);

                // Use a canvas to safely convert any image format (like webp) to JPEG for jsPDF
                const canvas = document.createElement("canvas");
                canvas.width = imagePreview.naturalWidth || 800;
                canvas.height = imagePreview.naturalHeight || 800;
                const ctx = canvas.getContext("2d");

                // Draw a white background first (in case of transparent PNG)
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(imagePreview, 0, 0);

                const jpegData = canvas.toDataURL("image/jpeg", 0.95);
                const pdfWidth = doc.internal.pageSize.getWidth();

                // Max dimensions to fit top half
                const maxWidth = pdfWidth - 40;
                const maxHeight = 100;

                // Scale to fit
                const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
                const finalWidth = canvas.width * ratio;
                const finalHeight = canvas.height * ratio;

                // Center image
                const xOffset = (pdfWidth - finalWidth) / 2;

                doc.addImage(jpegData, "JPEG", xOffset, 30, finalWidth, finalHeight);

                // Add Analyzed Prompt text below image
                let currentY = 30 + finalHeight + 15;

                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text("Analyzed Prompt:", 20, currentY);

                currentY += 10;
                doc.setFontSize(11);
                doc.setFont("helvetica", "normal");

                // Split text to fit width and handle long prompts gracefully
                const textLines = doc.splitTextToSize(repromptText.textContent, pdfWidth - 40);
                doc.text(textLines, 20, currentY);

                doc.save("RePrompt_Analysis.pdf");

                // Restore text
                downloadPdfBtn.textContent = originalText;
                showToast("PDF Downloaded!", "success");
            } catch (err) {
                console.error("PDF generation failed:", err);
                showToast("Failed to generate PDF. Make sure page loaded.", "error");
                downloadPdfBtn.textContent = "Download PDF";
            }
        });
    }

    // === Utilities ===
    function showToast(message, type = "success") {
        const container = document.getElementById("toast-container");
        if (!container) return;
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add("show"));

        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    function compressImage(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;
                const maxDimension = 1600;

                if (width > height && width > maxDimension) {
                    height *= maxDimension / width;
                    width = maxDimension;
                } else if (height > maxDimension) {
                    width *= maxDimension / height;
                    height = maxDimension;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() });
                    callback(compressedFile, canvas.toDataURL("image/jpeg", 0.7));
                }, "image/jpeg", 0.7);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function saveToHistory(imgBase64, prompt) {
        let history = JSON.parse(localStorage.getItem("reprompt_history") || "[]");
        history.unshift({ img: imgBase64, prompt: prompt, id: Date.now() });
        if (history.length > 5) history.pop();
        localStorage.setItem("reprompt_history", JSON.stringify(history));
        loadHistory();
    }

    window.loadHistory = function () {
        const historySection = document.getElementById("history-section");
        const historyGrid = document.getElementById("history-grid");
        if (!historySection || !historyGrid) return;

        let history = JSON.parse(localStorage.getItem("reprompt_history") || "[]");
        const navHistoryBtn = document.getElementById("nav-history-btn");
        
        if (history.length === 0) {
            historySection.style.display = "none";
            if (navHistoryBtn) navHistoryBtn.style.display = "none";
            return;
        }

        historySection.style.display = "block";
        if (navHistoryBtn) navHistoryBtn.style.display = "inline-block";
        historyGrid.innerHTML = "";

        history.forEach(item => {
            const div = document.createElement("div");
            div.className = "history-item reveal";
            div.innerHTML = `
                <img src="${item.img}" class="history-img" alt="History Image">
                <div class="history-content">
                    <div class="history-meta">Generated Prompt</div>
                    <div class="history-prompt">${item.prompt}</div>
                    <div class="history-actions">
                        <button class="history-copy-btn" onclick="navigator.clipboard.writeText(\`${item.prompt.replace(/`/g, "\\`")}\`); const ev = new CustomEvent('toast', {detail: 'Prompt Copied!'}); document.dispatchEvent(ev);">Copy</button>
                        <button class="history-delete-btn" title="Delete" onclick="deleteFromHistory(${item.id})">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </div>
            `;
            historyGrid.appendChild(div);
        });

        setTimeout(observeReveals, 100);
    };

    window.deleteFromHistory = function (id) {
        let history = JSON.parse(localStorage.getItem("reprompt_history") || "[]");
        history = history.filter(item => item.id !== id);
        localStorage.setItem("reprompt_history", JSON.stringify(history));
        loadHistory();
        showToast("Deleted from history", "success");
    };

    document.addEventListener('toast', (e) => showToast(e.detail, 'success'));
    window.loadHistory();
});
