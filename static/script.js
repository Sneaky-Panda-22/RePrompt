document.addEventListener("DOMContentLoaded", () => {
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
            alert('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.opacity = '1';
            uploadZone.classList.add('has-image');
        };
        reader.readAsDataURL(file);
        processImage(file);
    }

    async function processImage(file) {
        loadingState.style.display = 'block';
        resultsSection.style.display = 'none';

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/reprompt", {
                method: "POST",
                body: formData
            });
            
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

            const data = await response.json();
            repromptText.textContent = data.reprompt;

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

            loadingState.style.display = 'none';
            resultsSection.style.display = 'block';

            // Trigger reveal animations for new results
            requestAnimationFrame(() => {
                resultsSection.querySelectorAll('.reveal, .reveal-scale').forEach(el => {
                    revealObserver.observe(el);
                });
            });

            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error("Error generating reprompt:", error);
            alert("Failed to process image. Check console for details.");
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
            } catch (err) {
                console.error("PDF generation failed:", err);
                alert("Failed to generate PDF. Make sure the page has fully loaded.");
                downloadPdfBtn.textContent = "Download PDF";
            }
        });
    }
});
