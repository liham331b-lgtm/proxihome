document.addEventListener('DOMContentLoaded', () => {
    // Gestion du bouton son
    const soundBtn = document.getElementById('soundToggle');
    if (soundBtn) {
        soundBtn.textContent = ProxiAudio.isEnabled() ? '🔊' : '🔇';
        soundBtn.addEventListener('click', () => {
            const active = ProxiAudio.toggle();
            soundBtn.textContent = active ? '🔊' : '🔇';
        });
    }

    document.querySelectorAll('.sound-click').forEach(el => {
        el.addEventListener('click', () => ProxiAudio.click());
    });

    // Menu mobile
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
    }

    // Logique du tunnel de réservation (uniquement sur /reserver)
    if (!document.getElementById('zoneModal')) return;

    let bookingData = {
        booking_date: '',
        booking_time: ''
    };

    window.goToStep = function(step) {
        document.querySelectorAll('.booking-card').forEach(c => c.classList.add('hidden'));
        const target = document.getElementById('step' + step);
        if (target) target.classList.remove('hidden');

        const pct = Math.round((step / 6) * 100);
        document.getElementById('progressFill').style.width = pct + '%';
        document.querySelectorAll('.step-label').forEach(lbl => {
            lbl.classList.toggle('active', parseInt(lbl.dataset.step) <= step);
        });
    };

    // Étape 1 : Vérification Wasquehal
    document.getElementById('btnYesWasquehal').addEventListener('click', () => {
        document.getElementById('zoneModal').classList.add('hidden');
        goToStep(2);
    });

    document.getElementById('btnNoWasquehal').addEventListener('click', () => {
        document.getElementById('zoneChoices').classList.add('hidden');
        document.getElementById('zoneErrorMsg').classList.remove('hidden');
    });

    // Étape 2 : Validation coordonnées
    document.getElementById('toStep3Btn').addEventListener('click', () => {
        const lastName = document.getElementById('lastName').value.trim();
        const firstName = document.getElementById('firstName').value.trim();
        const address = document.getElementById('address').value.trim();
        const postalCode = document.getElementById('postalCode').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();

        const cpErr = document.getElementById('cpError');
        const step2Err = document.getElementById('step2Error');

        cpErr.classList.toggle('hidden', postalCode === '59290');

        if (!lastName || !firstName || !address || postalCode !== '59290' || !email.includes('@') || phone.length < 8) {
            step2Err.classList.remove('hidden');
            return;
        }
        step2Err.classList.add('hidden');

        Object.assign(bookingData, {
            last_name: lastName,
            first_name: firstName,
            address,
            postal_code: postalCode,
            email,
            phone
        });
        goToStep(3);
    });

    // Étape 3 : Vérification anti-robot simulée
    const validateCaptchaBtn = document.getElementById('validateFakeCaptchaBtn');
    const captchaInput = document.getElementById('fakeCaptchaInput');

    async function submitFakeCaptcha() {
        const errEl = document.getElementById('captchaError');
        const codeVal = captchaInput.value.trim();

        errEl.classList.add('hidden');
        validateCaptchaBtn.disabled = true;

        try {
            const res = await fetch('/api/verify-captcha', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN
                },
                body: JSON.stringify({ code: codeVal })
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                if (data.new_code) {
                    document.getElementById('fakeCaptchaCode').textContent = data.new_code;
                }
                captchaInput.value = '';
                errEl.textContent = data.message || 'Code invalide.';
                errEl.classList.remove('hidden');
                validateCaptchaBtn.disabled = false;
                return;
            }

            ProxiAudio.success();
            document.getElementById('captchaLoader').classList.remove('hidden');
            setTimeout(() => {
                document.getElementById('captchaLoader').classList.add('hidden');
                validateCaptchaBtn.disabled = false;
                goToStep(4);
            }, 600);
        } catch (e) {
            errEl.textContent = 'Erreur réseau lors de la vérification.';
            errEl.classList.remove('hidden');
            validateCaptchaBtn.disabled = false;
        }
    }

    if (validateCaptchaBtn) {
        validateCaptchaBtn.addEventListener('click', submitFakeCaptcha);
    }
    if (captchaInput) {
        captchaInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitFakeCaptcha();
            }
        });
    }

    // Étape 4 : Calendrier & Créneaux
    const dateInput = document.getElementById('bookingDate');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];

    dateInput.addEventListener('change', async () => {
        const val = dateInput.value;
        if (!val) return;
        bookingData.booking_date = val;
        bookingData.booking_time = '';
        document.getElementById('toStep5Btn').disabled = true;
        document.getElementById('selectedSlotBanner').classList.add('hidden');

        const dObj = new Date(val + 'T00:00:00');
        const dayStr = dObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        document.getElementById('dayNameDisplay').textContent = dayStr;

        const wrapper = document.getElementById('slotsWrapper');
        wrapper.innerHTML = '<p class="muted-text">Chargement des créneaux...</p>';

        const res = await fetch(`/api/slots?date=${val}`);
        const data = await res.json();

        if (data.closed || !data.slots || data.slots.length === 0) {
            wrapper.innerHTML = '<p class="error-banner">Aucun créneau disponible à cette date.</p>';
            return;
        }

        wrapper.innerHTML = '';
        data.slots.forEach(slot => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'slot-btn';
            btn.textContent = slot.time + (slot.available ? '' : ' (Complet)');
            btn.disabled = !slot.available;
            btn.addEventListener('click', () => {
                ProxiAudio.click();
                document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                bookingData.booking_time = slot.time;
                document.getElementById('selectedSlotText').textContent = `${dayStr} à ${slot.time}`;
                document.getElementById('selectedSlotBanner').classList.remove('hidden');
                document.getElementById('toStep5Btn').disabled = false;
            });
            wrapper.appendChild(btn);
        });
    });

    // Étape 5 : Récapitulatif
    document.getElementById('toStep5Btn').addEventListener('click', () => {
        document.getElementById('sumName').textContent = `${bookingData.first_name} ${bookingData.last_name}`;
        document.getElementById('sumAddress').textContent = bookingData.address;
        document.getElementById('sumEmail').textContent = bookingData.email;
        document.getElementById('sumPhone').textContent = bookingData.phone;
        document.getElementById('sumDate').textContent = bookingData.booking_date;
        document.getElementById('sumTime').textContent = bookingData.booking_time;
        goToStep(5);
    });

    // Étape 6 : Confirmation API
    document.getElementById('confirmBookingBtn').addEventListener('click', async () => {
        const accepted = document.getElementById('acceptTerms').checked;
        const errBox = document.getElementById('step5Error');

        if (!accepted) {
            errBox.textContent = "Veuillez cocher la case d'acceptation du tarif de 10 € en espèces.";
            errBox.classList.remove('hidden');
            return;
        }
        errBox.classList.add('hidden');
        bookingData.accepted = true;

        const btn = document.getElementById('confirmBookingBtn');
        btn.disabled = true;
        btn.textContent = "Enregistrement en cours...";

        try {
            const response = await fetch('/api/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN
                },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();
            if (result.success) {
                ProxiAudio.success();
                document.getElementById('finalRef').textContent = result.reference;
                document.getElementById('finalDate').textContent = result.date;
                document.getElementById('finalTime').textContent = result.time;
                document.getElementById('trackNowLink').href = `/suivi?ref=${result.reference}`;
                goToStep(6);
            } else {
                btn.disabled = false;
                btn.textContent = "CONFIRMER MA DEMANDE";
                errBox.textContent = result.message || "Erreur lors de la réservation.";
                errBox.classList.remove('hidden');
            }
        } catch (e) {
            btn.disabled = false;
            btn.textContent = "CONFIRMER MA DEMANDE";
            errBox.textContent = "Erreur réseau lors de l'envoi de la réservation.";
            errBox.classList.remove('hidden');
        }
    });
});