document.addEventListener("DOMContentLoaded", () => {
    const uploadZone = document.getElementById("upload-zone");
    const fileInput = document.getElementById("file-input");
    const imagePreview = document.getElementById("image-preview");
    const loadingState = document.getElementById("loading-state");
    const resultsSection = document.getElementById("results");
    const repromptText = document.getElementById("reprompt-text");
    const copyBtn = document.getElementById("copy-btn");
    const statsGrid = document.getElementById("stats-grid");

    // === Navigation Section Switching ===
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    const pageSections = document.querySelectorAll('.page-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-section');

            // Update active nav link
            navLinks.forEach(l => {
                l.classList.remove('active');
                // Remove existing dot
                const existingDot = l.querySelector('.nav-link-dot');
                if (existingDot) existingDot.remove();
            });
            link.classList.add('active');
            const dot = document.createElement('span');
            dot.className = 'nav-link-dot';
            link.appendChild(dot);

            // Switch page section
            pageSections.forEach(s => s.classList.remove('page-section--active'));
            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.classList.add('page-section--active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });

    // Click to upload
    uploadZone.addEventListener("click", () => fileInput.click());

    // Drag & Drop
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
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Show Image Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.opacity = '1';
            uploadZone.classList.add('has-image');
        };
        reader.readAsDataURL(file);

        // Upload and Analyze
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

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const data = await response.json();

            // Populate Reprompt
            repromptText.textContent = data.reprompt;

            // Populate Stats
            statsGrid.innerHTML = '';
            const labels = {
                brightness_class: "Brightness Setup",
                dof_class: "Depth of Field",
                shadow_hardness: "Shadow Quality",
                shadow_score: "Shadow Contrast",
                light_direction: "Light Direction",
                contrast_ratio: "Contrast Ratio",
                aspect_ratio: "Aspect Ratio",
                global_contrast: "Global Contrast",
                sharpness_score: "Sharpness Focus"
            };

            for (const [key, value] of Object.entries(data.stats)) {
                if (labels[key]) {
                    const card = document.createElement("div");
                    card.className = "stat-card";

                    const valStr = typeof value === 'number' ? value.toFixed(2) : value;

                    card.innerHTML = `
                        <div class="stat-label">${labels[key]}</div>
                        <div class="stat-value">${valStr}</div>
                    `;
                    statsGrid.appendChild(card);
                }
            }

            loadingState.style.display = 'none';
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error("Error generating reprompt:", error);
            alert("Failed to process image. Check console for details.");
            loadingState.style.display = 'none';
        }
    }

    // Copy Button functionality
    copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(repromptText.textContent).then(() => {
            const span = copyBtn.querySelector('span');
            if (span) span.textContent = "Copied!";
            copyBtn.style.borderColor = "#6c5ce7";
            copyBtn.style.color = "#6c5ce7";
            setTimeout(() => {
                if (span) span.textContent = "Copy";
                copyBtn.style.borderColor = "";
                copyBtn.style.color = "";
            }, 2000);
        });
    });
});
