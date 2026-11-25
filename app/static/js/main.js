document.addEventListener('DOMContentLoaded', () => {
    const SOUND_STORAGE_KEY = 'proxihome_sound_enabled';

    // ==================== 1. NAVIGATION MOBILE ====================
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    function setMobileMenu(open) {
        if (!navLinks) return;
        navLinks.classList.toggle('open', open);
        if (navToggle) {
            navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
    }

    if (navToggle && navLinks) {
        navToggle.setAttribute('aria-expanded', 'false');

        navToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setMobileMenu(!navLinks.classList.contains('open'));
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => setMobileMenu(false));
        });

        document.addEventListener('click', (e) => {
            if (
                navLinks.classList.contains('open') &&
                !navLinks.contains(e.target) &&
                !navToggle.contains(e.target)
            ) {
                setMobileMenu(false);
            }
        });
    }

    // ==================== 2. GESTION DU SON (ACTIVER / DÉSACTIVER) ====================
    function isSoundEnabled() {
        const saved = localStorage.getItem(SOUND_STORAGE_KEY);
        if (saved === null) return true;
        return saved === 'true';
    }

    function applySoundState(enabled) {
        localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');

        if (window.ProxiAudio) {
            window.ProxiAudio.enabled = enabled;
            window.ProxiAudio.muted = !enabled;
            if (typeof window.ProxiAudio.setMuted === 'function') {
                window.ProxiAudio.setMuted(!enabled);
            }
        }

        const toggles = document.querySelectorAll(
            '#soundToggle, [data-sound-toggle], .sound-toggle, [aria-label*="son" i], [title*="son" i]'
        );

        toggles.forEach(btn => {
            btn.classList.toggle('muted', !enabled);
            btn.classList.toggle('is-muted', !enabled);
            btn.classList.toggle('active', enabled);
            btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
            btn.dataset.soundEnabled = enabled ? 'true' : 'false';

            const labelTarget = btn.querySelector('.sound-label, span');
            if (labelTarget) {
                labelTarget.textContent = enabled ? 'Son activé' : 'Son désactivé';
            } else if (btn.tagName === 'BUTTON' && btn.children.length === 0) {
                btn.textContent = enabled ? 'Son : Activé' : 'Son : Désactivé';
            }
        });
    }

    function playClickSound() {
        if (!isSoundEnabled()) return;
        if (window.ProxiAudio && typeof window.ProxiAudio.click === 'function') {
            window.ProxiAudio.click();
        }
    }

    function playErrorSound() {
        if (!isSoundEnabled()) return;
        if (window.ProxiAudio && typeof window.ProxiAudio.error === 'function') {
            window.ProxiAudio.error();
        }
    }

    function playSuccessSound() {
        if (!isSoundEnabled()) return;
        if (window.ProxiAudio && typeof window.ProxiAudio.success === 'function') {
            window.ProxiAudio.success();
        }
    }

    applySoundState(isSoundEnabled());

    // ==================== 3. SÉLECTION DES CATÉGORIES ====================
    const categoryInput = document.getElementById('selectedCategory')
        || document.getElementById('categoryInput')
        || document.querySelector('input[name="category"]');

    function selectCategory(value, triggerEl = null) {
        const cleanVal = (value || '').trim();
        if (!cleanVal) return;

        const allCategoryItems = document.querySelectorAll(
            '[data-category], .category-card, .category-btn, .category-option'
        );

        allCategoryItems.forEach(item => {
            const itemVal = (item.dataset.category || item.dataset.value || item.textContent || '').trim();
            const isMatch = triggerEl ? item === triggerEl : itemVal === cleanVal;
            item.classList.toggle('selected', isMatch);
            item.classList.toggle('active', isMatch);
            item.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
        });

        if (categoryInput) {
            categoryInput.value = cleanVal;
            categoryInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const selectEl = document.querySelector('select[name="category"], #categorySelect');
        if (selectEl && selectEl.value !== cleanVal) {
            selectEl.value = cleanVal;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }

        playClickSound();
    }

    const selectCategoryDropdown = document.querySelector('select[name="category"], #categorySelect');
    if (selectCategoryDropdown) {
        selectCategoryDropdown.addEventListener('change', (e) => {
            selectCategory(e.target.value);
        });
    }

    // ==================== 4. RÉSERVATION, WASQUEHAL (OUI / NON) & RETOUR ACCUEIL ====================
    const bookingForm = document.getElementById('bookingForm');
    const stepPanels = Array.from(document.querySelectorAll('.step-panel'));
    const stepDots = Array.from(document.querySelectorAll('.step-dot'));
    const errorBox = document.getElementById('stepError');
    const slotsContainer = document.getElementById('slotsContainer');
    const dateInput = document.getElementById('bookingDate');
    const postalInput = document.getElementById('postalCode');

    let currentStep = 1;
    const totalSteps = stepPanels.length || 6;

    function showError(msg) {
        if (errorBox) {
            errorBox.textContent = msg;
            errorBox.style.display = 'block';
        }
        playErrorSound();
    }

    function clearError() {
        if (!errorBox) return;
        errorBox.textContent = '';
        errorBox.style.display = 'none';
    }

    function closeAnyModal() {
        document.querySelectorAll('.modal.open, .modal.active, .modal.show, [data-modal].open').forEach(modal => {
            modal.classList.remove('open', 'active', 'show');
            modal.style.display = 'none';
        });
        document.body.classList.remove('modal-open');
    }

    function goToStep(stepNum) {
        clearError();
        currentStep = Math.max(1, Math.min(totalSteps, stepNum));

        if (stepPanels.length > 0) {
            stepPanels.forEach(panel => {
                panel.classList.toggle('active', Number(panel.dataset.step) === currentStep);
            });
        }

        if (stepDots.length > 0) {
            stepDots.forEach(dot => {
                const dotStep = Number(dot.dataset.step);
                dot.classList.toggle('active', dotStep === currentStep);
                dot.classList.toggle('completed', dotStep < currentStep);
            });
        }

        if (currentStep === 5) {
            updateSummary();
        }
    }

    function handleWasquehalChoice(isYes) {
        playClickSound();
        closeAnyModal();

        if (isYes) {
            if (postalInput) {
                postalInput.value = '59290';
            }
            const targetStep = currentStep === 1 && stepPanels.length > 1 ? 2 : currentStep;
            goToStep(targetStep);
        } else {
            const noBox = document.getElementById('notWasquehalBox')
                || document.querySelector('.not-wasquehal, [data-not-wasquehal]');
            if (noBox) {
                noBox.style.display = 'block';
                noBox.classList.add('active', 'open');
            }
            showError("Nos interventions sont réservées exclusivement à Wasquehal (59290).");
        }
    }

    document.addEventListener('click', (e) => {
        // Bouton activer / désactiver le son
        const soundBtn = e.target.closest(
            '#soundToggle, [data-sound-toggle], .sound-toggle, [aria-label*="son" i], [title*="son" i]'
        );
        if (soundBtn) {
            e.preventDefault();
            e.stopPropagation();
            const nextState = !isSoundEnabled();
            applySoundState(nextState);
            if (nextState) {
                playClickSound();
            }
            return;
        }

        // Sélection d'une catégorie
        const catItem = e.target.closest(
            '[data-category], .category-card, .category-btn, .category-option'
        );
        if (catItem) {
            const val = catItem.dataset.category
                || catItem.dataset.value
                || (catItem.textContent || '').trim();
            selectCategory(val, catItem);
            return;
        }

        // Bouton retour à l'accueil explicite
        const homeBtn = e.target.closest('[data-go-home], .btn-home, #backHomeBtn');
        if (homeBtn) {
            e.preventDefault();
            playClickSound();
            window.location.href = '/';
            return;
        }

        // Bouton OUI Wasquehal
        const yesBtn = e.target.closest(
            '[data-wasquehal="yes"], #btnYesWasquehal, #yesWasquehal, .btn-yes-wasquehal'
        );
        if (yesBtn) {
            e.preventDefault();
            handleWasquehalChoice(true);
            return;
        }

        // Bouton NON Wasquehal
        const noBtn = e.target.closest(
            '[data-wasquehal="no"], #btnNoWasquehal, #noWasquehal, .btn-no-wasquehal'
        );
        if (noBtn) {
            e.preventDefault();
            handleWasquehalChoice(false);
            return;
        }

        // Détection de secours sur le libellé Oui / Non dans le bloc Wasquehal
        const actionBtn = e.target.closest('button, [role="button"], .btn');
        if (actionBtn) {
            const txt = (actionBtn.textContent || '').trim().toLowerCase();
            const inWasquehalBlock = Boolean(
                actionBtn.closest('[data-wasquehal-box], #wasquehalModal, .wasquehal-modal, .step-panel[data-step="1"]')
            );
            if (inWasquehalBlock && (txt === 'oui' || txt.startsWith('oui '))) {
                e.preventDefault();
                handleWasquehalChoice(true);
                return;
            }
            if (inWasquehalBlock && (txt === 'non' || txt.startsWith('non '))) {
                e.preventDefault();
                handleWasquehalChoice(false);
                return;
            }
        }

        // Clic générique sur élément avec .sound-click
        if (e.target.closest('.sound-click')) {
            playClickSound();
        }

        // Bouton suivant
        const nextBtn = e.target.closest('.next-step');
        if (nextBtn) {
            e.preventDefault();
            if (validateStep(currentStep)) {
                if (currentStep === 3) {
                    loadSlotsForDate();
                }
                goToStep(currentStep + 1);
            }
            return;
        }

        // Bouton précédent
        const prevBtn = e.target.closest('.prev-step');
        if (prevBtn) {
            e.preventDefault();
            if (currentStep > 1) {
                goToStep(currentStep - 1);
            }
        }
    });

    function validateStep(step) {
        if (step === 1 && postalInput) {
            const postal = (postalInput.value || '').trim();
            if (postal && postal !== '59290') {
                showError("Nos interventions sont réservées exclusivement au code postal 59290 (Wasquehal).");
                return false;
            }
        }

        if (step === 2) {
            const firstName = (document.getElementById('firstName')?.value || '').trim();
            const lastName = (document.getElementById('lastName')?.value || '').trim();
            const phone = (document.getElementById('phone')?.value || '').trim();
            const email = (document.getElementById('email')?.value || '').trim();
            const address = (document.getElementById('address')?.value || '').trim();

            if (!firstName || !lastName || !phone || !email || !address) {
                showError("Veuillez renseigner tous vos coordonnées et votre adresse à Wasquehal.");
                return false;
            }
        }

        if (step === 3) {
            const selectedDate = (dateInput?.value || '').trim();
            if (!selectedDate) {
                showError("Veuillez choisir une date d'intervention.");
                return false;
            }
        }

        if (step === 4) {
            const selectedSlot = document.querySelector('input[name="booking_time"]:checked');
            if (!selectedSlot) {
                showError("Veuillez sélectionner un créneau horaire.");
                return false;
            }
        }

        return true;
    }

    async function loadSlotsForDate() {
        if (!slotsContainer || !dateInput) return;
        const selectedDate = dateInput.value;
        slotsContainer.innerHTML = '<p>Chargement des créneaux disponibles...</p>';

        try {
            const response = await fetch(`/api/slots?date=${encodeURIComponent(selectedDate)}`);
            const data = await response.json();

            if (!response.ok || !data.slots || data.slots.length === 0) {
                slotsContainer.innerHTML = '<p>Aucun créneau disponible pour cette date.</p>';
                return;
            }

            slotsContainer.innerHTML = '';
            data.slots.forEach((slot, idx) => {
                const slotId = `slot_${idx}`;
                const label = document.createElement('label');
                label.className = `slot-card ${slot.available ? '' : 'disabled'}`;
                label.htmlFor = slotId;

                label.innerHTML = `
                    <input type="radio" id="${slotId}" name="booking_time" value="${slot.time}" ${slot.available ? '' : 'disabled'}>
                    <span>${slot.time}</span>
                    <small>${slot.available ? 'Disponible' : 'Complet'}</small>
                `;
                slotsContainer.appendChild(label);
            });
        } catch (err) {
            slotsContainer.innerHTML = '<p>Impossible de charger les créneaux pour le moment.</p>';
        }
    }

    if (dateInput) {
        dateInput.addEventListener('change', () => {
            if (currentStep >= 4) {
                loadSlotsForDate();
            }
        });
    }

    function updateSummary() {
        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        const firstName = (document.getElementById('firstName')?.value || '').trim();
        const lastName = (document.getElementById('lastName')?.value || '').trim();
        const address = (document.getElementById('address')?.value || '').trim();
        const bookingDate = (dateInput?.value || '').trim();
        const bookingTime = document.querySelector('input[name="booking_time"]:checked')?.value || '';

        setText('sumClient', `${firstName} ${lastName}`.trim());
        setText('sumAddress', `${address}, 59290 Wasquehal`);
        setText('sumDate', bookingDate);
        setText('sumTime', bookingTime);
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();

            const formData = new FormData(bookingForm);
            const payload = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    showError(result.error || "Erreur lors de l'enregistrement de la réservation.");
                    return;
                }

                playSuccessSound();
                localStorage.setItem('proxihome_last_ref', result.reference);

                const refEl = document.getElementById('finalRef');
                const dateEl = document.getElementById('finalDate');
                const timeEl = document.getElementById('finalTime');
                const trackLink = document.getElementById('trackNowLink');

                if (refEl) refEl.textContent = result.reference;
                if (dateEl) dateEl.textContent = result.date;
                if (timeEl) timeEl.textContent = result.time;
                if (trackLink) trackLink.href = `/suivi?ref=${encodeURIComponent(result.reference)}`;

                goToStep(totalSteps);
            } catch (err) {
                showError("Erreur réseau lors de l'envoi de la réservation.");
            }
        });
    }
});