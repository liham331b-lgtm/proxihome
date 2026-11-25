document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    document.querySelectorAll('.sound-click').forEach(el => {
        el.addEventListener('click', () => {
            if (window.ProxiAudio && typeof ProxiAudio.click === 'function') {
                ProxiAudio.click();
            }
        });
    });

    const bookingForm = document.getElementById('bookingForm');
    if (!bookingForm) return;

    let currentStep = 1;
    const totalSteps = 6;
    const stepPanels = document.querySelectorAll('.step-panel');
    const stepDots = document.querySelectorAll('.step-dot');
    const errorBox = document.getElementById('stepError');
    const slotsContainer = document.getElementById('slotsContainer');
    const dateInput = document.getElementById('bookingDate');

    function showError(msg) {
        if (!errorBox) return;
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
        if (window.ProxiAudio && typeof ProxiAudio.error === 'function') {
            ProxiAudio.error();
        }
    }

    function clearError() {
        if (!errorBox) return;
        errorBox.textContent = '';
        errorBox.style.display = 'none';
    }

    function goToStep(stepNum) {
        clearError();
        currentStep = stepNum;

        stepPanels.forEach(panel => {
            panel.classList.toggle('active', Number(panel.dataset.step) === stepNum);
        });

        stepDots.forEach(dot => {
            const dotStep = Number(dot.dataset.step);
            dot.classList.toggle('active', dotStep === stepNum);
            dot.classList.toggle('completed', dotStep < stepNum);
        });

        if (stepNum === 5) {
            updateSummary();
        }
    }

    document.querySelectorAll('.next-step').forEach(btn => {
        btn.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                if (currentStep === 3) {
                    loadSlotsForDate();
                }
                goToStep(currentStep + 1);
            }
        });
    });

    document.querySelectorAll('.prev-step').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 1) {
                goToStep(currentStep - 1);
            }
        });
    });

    function validateStep(step) {
        if (step === 1) {
            const postal = (document.getElementById('postalCode')?.value || '').trim();
            if (postal !== '59290') {
                showError("Nos interventions sont réservées exclusivement au code postal 59290 (Wasquehal).");
                return false;
            }
            return true;
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
            return true;
        }

        if (step === 3) {
            const selectedDate = (dateInput?.value || '').trim();
            if (!selectedDate) {
                showError("Veuillez choisir une date d'intervention.");
                return false;
            }
            return true;
        }

        if (step === 4) {
            const selectedSlot = document.querySelector('input[name="booking_time"]:checked');
            if (!selectedSlot) {
                showError("Veuillez sélectionner un créneau horaire.");
                return false;
            }
            return true;
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

            if (window.ProxiAudio && typeof ProxiAudio.success === 'function') {
                ProxiAudio.success();
            }

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
});