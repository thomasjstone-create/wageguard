(() => {
  const cookieName = 'wageguard_cookie_consent';
  const consentBannerId = 'cookie-consent-banner';
  const consentButtonId = 'cookie-consent-accept';
  const manageButtonId = 'cookie-consent-manage';
  const quoteFormId = 'quote-form';
  const formStatusId = 'quote-form-status';
  const formSuccessRedirect = 'thank-you.html';
  const formAction = 'https://formsubmit.co/help@wageguard.co.uk';
  const storageKey = 'wageguard_form_data';
  const zapierWebhook = 'https://hooks.zapier.com/hooks/catch/18881283/43u6z9t/';

  function hasCookieConsent() {
    return document.cookie.split('; ').some(cookie => cookie.startsWith(`${cookieName}=`));
  }

  function setCookieConsent() {
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${cookieName}=accepted; path=/; expires=${expires}; SameSite=Lax`;
  }

  function hideCookieBanner() {
    const banner = document.getElementById(consentBannerId);
    if (banner) banner.classList.add('hidden');
  }

  function showCookieBanner() {
    const banner = document.getElementById(consentBannerId);
    if (banner) banner.classList.remove('hidden');
  }

  function updateFormStatus(message, type = 'info') {
    const status = document.getElementById(formStatusId);
    if (!status) return;
    status.textContent = message;
    status.className = `text-sm mt-4 ${type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`;
  }

  function updateFinalStatus(message, type = 'info') {
    const status = document.getElementById('final-submit-status');
    if (!status) return;
    status.textContent = message;
    status.className = `text-sm mt-4 ${type === 'success' ? 'text-emerald-600' : type === 'error' ? 'text-rose-600' : 'text-slate-600'}`;
  }

  function initCookieBanner() {
    if (hasCookieConsent()) return;
    const acceptButton = document.getElementById(consentButtonId);
    const manageButton = document.getElementById(manageButtonId);
    if (!acceptButton) return;
    showCookieBanner();
    acceptButton.addEventListener('click', () => {
      setCookieConsent();
      hideCookieBanner();
    });
    if (manageButton) {
      manageButton.addEventListener('click', () => {
        window.location.href = 'cookie-policy.html';
      });
    }
  }

  function getSavedData() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function saveFormData(partialData) {
    const current = getSavedData();
    localStorage.setItem(storageKey, JSON.stringify(Object.assign({}, current, partialData)));
  }

  function setOtpStatus(message, type = 'info') {
    const status = document.getElementById('otp-status');
    if (!status) return;
    status.textContent = message;
    status.className = `text-sm ${type === 'success' ? 'text-emerald-600' : type === 'error' ? 'text-rose-600' : 'text-slate-500'}`;
  }

  function renderOtpState() {
    const data = getSavedData();
    const otpPanel = document.getElementById('otp-verification-panel');
    const badge = document.getElementById('phone-verified-badge');
    const finishButton = document.getElementById('nav-finish-quote');

    const verified = data.phoneVerified === true;
    if (otpPanel) {
      otpPanel.classList.toggle('hidden', verified);
    }
    if (badge) {
      badge.classList.toggle('hidden', !verified);
    }
    if (finishButton) {
      finishButton.disabled = !verified;
      finishButton.classList.toggle('opacity-50', !verified);
      finishButton.classList.toggle('cursor-not-allowed', !verified);
    }

    if (verified) {
      setOtpStatus('Phone verified. Continue to submit your quote.', 'success');
    } else if (data.otpSent) {
      setOtpStatus('Enter the 4-digit code sent to your phone.');
    } else {
      setOtpStatus('Tap Send code to receive a 4-digit verification code.');
    }
  }

  function setChoiceLink(id, field, value, nextPage) {
    const element = document.getElementById(id);
    if (!element) return;
    element.addEventListener('click', event => {
      event.preventDefault();
      saveFormData({ [field]: value });
      if (nextPage) {
        window.location.href = nextPage;
      }
    });
  }

  function restoreFinalPageValues() {
    const data = getSavedData();
    if (!data) return;
    ['firstName', 'lastName', 'email', 'phone'].forEach(name => {
      const input = document.querySelector(`input[name="${name}"]`);
      if (input && data[name]) {
        input.value = data[name];
      }
    });
    const dobDay = document.querySelector('select[name="dobDay"]');
    const dobMonth = document.querySelector('select[name="dobMonth"]');
    const dobYear = document.querySelector('select[name="dobYear"]');
    if (data.dateOfBirth && dobDay && dobMonth && dobYear) {
      const parts = data.dateOfBirth.split('/');
      if (parts.length === 3) {
        dobDay.value = parts[0];
        dobMonth.value = parts[1];
        dobYear.value = parts[2];
      }
    }
  }

  async function submitFinalForm(event) {
    event.preventDefault();
    const data = getSavedData();
    const payload = {
      employmentStatus: data.employmentStatus || '',
      coverAmount: data.coverAmount || '',
      smokingStatus: data.smokingStatus || '',
      healthHistory: data.healthHistory || '',
      dateOfBirth: data.dateOfBirth || '',
      birthDay: data.birthDay || '',
      birthMonth: data.birthMonth || '',
      birthYear: data.birthYear || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || ''
    };

    const requiredFields = ['firstName', 'lastName', 'email', 'phone'];
    for (const field of requiredFields) {
      const input = document.querySelector(`input[name="${field}"]`);
      if (input) {
        const value = input.value.trim();
        if (!value) {
          updateFinalStatus(`Please enter your ${field}.`, 'error');
          input.focus();
          return;
        }
        payload[field] = value;
      }
    }

    const savedData = getSavedData();
    if (savedData.phoneVerified !== true) {
      updateFinalStatus('Please verify your phone number with the 4-digit code before submitting.', 'error');
      return;
    }

    const dobDay = document.querySelector('select[name="dobDay"]');
    const dobMonth = document.querySelector('select[name="dobMonth"]');
    const dobYear = document.querySelector('select[name="dobYear"]');
    if (dobDay && dobMonth && dobYear) {
      const day = dobDay.value;
      const month = dobMonth.value;
      const year = dobYear.value;
      if (!day || !month || !year) {
        updateFinalStatus('Please select your date of birth.', 'error');
        return;
      }
      payload.dateOfBirth = `${day}/${month}/${year}`;
      payload.birthDay = day;
      payload.birthMonth = month;
      payload.birthYear = year;
      saveFormData({ dateOfBirth: payload.dateOfBirth, birthDay: day, birthMonth: month, birthYear: year });
    }

    saveFormData(payload);
    payload.submittedAt = new Date().toISOString();
    updateFinalStatus('Sending your quote details…', 'info');
    console.log('Zapier payload:', payload);

    try {
      const response = await fetch(zapierWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      console.log('Zapier response status:', response.status);
      console.log('Zapier response body:', text);
      if (!response.ok) {
        throw new Error(text || 'Webhook submission failed');
      }
      updateFinalStatus('Your details are sent. Redirecting…', 'success');
      localStorage.removeItem(storageKey);
      setTimeout(() => {
        window.location.href = formSuccessRedirect;
      }, 1200);
    } catch (error) {
      console.error('Zapier submit error:', error);
      updateFinalStatus('Unable to send data at the moment. Please try again or email help@wageguard.co.uk.', 'error');
    }
  }

  function initStepNavigation() {
    const pageName = window.location.pathname.split('/').pop();
    switch (pageName) {
      case '02-wage-guard-employment-status-update.html':
        setChoiceLink('nav-employed-link', 'employmentStatus', 'Employed Full-Time', '03-wage-guard-coverage-selection-orange-theme.html');
        setChoiceLink('nav-self-employed-link', 'employmentStatus', 'Self-Employed / Sole Trader', '03-wage-guard-coverage-selection-orange-theme.html');
        break;
      case '03-wage-guard-coverage-selection-orange-theme.html':
        setChoiceLink('coverage-0-1k-link', 'coverAmount', '£0 - £1k', '04-wage-guard-smoking-status-updated-logo.html');
        setChoiceLink('coverage-1k-2k-link', 'coverAmount', '£1k - £2k', '04-wage-guard-smoking-status-updated-logo.html');
        setChoiceLink('coverage-2k-3k-link', 'coverAmount', '£2k - £3k', '04-wage-guard-smoking-status-updated-logo.html');
        setChoiceLink('coverage-3kplus-link', 'coverAmount', '£3k +', '04-wage-guard-smoking-status-updated-logo.html');
        break;
      case '04-wage-guard-smoking-status-updated-logo.html':
        setChoiceLink('choice-no-smoke', 'smokingStatus', 'No', '05-wage-guard-health-history-updated-logo-theme.html');
        setChoiceLink('choice-yes-smoke', 'smokingStatus', 'Yes', '05-wage-guard-health-history-updated-logo-theme.html');
        break;
      case '05-wage-guard-health-history-updated-logo-theme.html':
        setChoiceLink('option-none', 'healthHistory', 'None', '07-wage-guard-date-of-birth-entry.html');
        setChoiceLink('option-back-pain', 'healthHistory', 'Back pain', '07-wage-guard-date-of-birth-entry.html');
        setChoiceLink('option-shoulder-knee', 'healthHistory', 'Shoulder/knee issues', '07-wage-guard-date-of-birth-entry.html');
        setChoiceLink('option-rsi', 'healthHistory', 'Repetitive strain injuries', '07-wage-guard-date-of-birth-entry.html');
        setChoiceLink('option-physio-claims', 'healthHistory', 'Past physio claims', '07-wage-guard-date-of-birth-entry.html');
        break;
      case '07-wage-guard-date-of-birth-entry.html': {
        const continueLink = document.getElementById('cta-continue-dob');
        if (!continueLink) break;
        continueLink.addEventListener('click', event => {
          event.preventDefault();
          const day = document.querySelector('select[name="dobDay"]')?.value;
          const month = document.querySelector('select[name="dobMonth"]')?.value;
          const year = document.querySelector('select[name="dobYear"]')?.value;
          if (!day || !month || !year) {
            alert('Please select your day, month and year of birth.');
            return;
          }
          const birthDate = new Date(Number(year), Number(month) - 1, Number(day));
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          saveFormData({ dateOfBirth: `${day}/${month}/${year}`, birthDay: day, birthMonth: month, birthYear: year });
          if (age >= 60) {
            const formSection = document.getElementById('dob-form-section');
            const declineSection = document.getElementById('age-decline-screen');
            if (formSection) formSection.classList.add('hidden');
            if (declineSection) declineSection.classList.remove('hidden');
            return;
          }
          window.location.href = '06-wage-guard-fixed-brand-logo-consistency.html';
        });
        break;
      }
      case '06-wage-guard-fixed-brand-logo-consistency.html': {
        restoreFinalPageValues();
        const finishButton = document.getElementById('nav-finish-quote');
        const phoneInput = document.querySelector('input[name="phone"]');
        const sendOtpButton = document.getElementById('send-otp-button');
        const verifyOtpButton = document.getElementById('verify-otp-button');
        const otpInput = document.getElementById('phone-otp');

        if (finishButton) {
          finishButton.addEventListener('click', submitFinalForm);
        }

        if (phoneInput) {
          phoneInput.addEventListener('input', () => {
            const data = getSavedData();
            if (data.phoneVerified === true) {
              saveFormData({ phoneVerified: false, otpSent: false });
              renderOtpState();
            }
          });
        }

        if (sendOtpButton) {
          sendOtpButton.addEventListener('click', async () => {
            const phone = phoneInput?.value.trim() || '';
            if (!phone) {
              setOtpStatus('Please enter your phone number first.', 'error');
              if (phoneInput) phoneInput.focus();
              return;
            }
            try {
              const response = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
              });
              let result;
              try {
                result = await response.json();
              } catch (parseErr) {
                const text = await response.text();
                throw new Error(`Server response (${response.status}): ${text}`);
              }
              if (!response.ok) {
                throw new Error(result.error || `Unable to send verification code (status ${response.status})`);
              }
              saveFormData({ phoneVerified: false, otpSent: true });
              setOtpStatus('Verification code sent. Enter it below to verify your phone.', 'success');
              if (otpInput) otpInput.value = '';
              renderOtpState();
            } catch (error) {
              setOtpStatus(error.message || 'Unable to send verification code. Try again later.', 'error');
            }
          });
        }

        if (verifyOtpButton) {
          verifyOtpButton.addEventListener('click', async () => {
            const code = otpInput?.value.trim() || '';
            const phone = phoneInput?.value.trim() || '';
            if (code.length !== 4 || !/^[0-9]{4}$/.test(code)) {
              setOtpStatus('Enter the 4-digit code exactly as shown.', 'error');
              if (otpInput) otpInput.focus();
              return;
            }
            try {
              const response = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code })
              });
              const result = await response.json();
              if (!response.ok) {
                throw new Error(result.error || 'Verification failed');
              }
              saveFormData({ phoneVerified: true, otpSent: false });
              setOtpStatus('Phone verified successfully.', 'success');
              renderOtpState();
            } catch (error) {
              setOtpStatus(error.message || 'Verification failed. Please try again.', 'error');
            }
          });
        }

        const inputs = document.querySelectorAll('input[name]');
        inputs.forEach(input => {
          input.addEventListener('input', event => {
            saveFormData({ [event.target.name]: event.target.value });
          });
        });

        renderOtpState();
        break;
      }
      default:
        break;
    }
  }

  async function submitQuoteForm(event) {
    event.preventDefault();
    const form = event.target;
    const consent = form.querySelector('input[name="consent"]');
    if (consent && !consent.checked) {
      updateFormStatus('Please accept the privacy policy to continue.', 'error');
      consent.focus();
      return;
    }

    updateFormStatus('Sending your request…', 'info');
    const formData = new FormData(form);
    formData.append('_captcha', 'false');
    formData.append('_template', 'box');
    formData.append('_subject', 'Wage Guard quote request');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json'
        }
      });
      if (!response.ok) throw new Error('Submission failed');
      const data = await response.json();
      if (data.success === true || data.success === 'true' || response.status === 200) {
        updateFormStatus('Thank you! Your quote request has been sent.', 'success');
        setTimeout(() => {
          window.location.href = formSuccessRedirect;
        }, 1400);
        return;
      }
      throw new Error(data.message || 'Unexpected response');
    } catch (error) {
      updateFormStatus('There was a problem sending your request. Please email help@wageguard.co.uk.', 'error');
    }
  }

  function initQuoteForm() {
    const form = document.getElementById(quoteFormId);
    if (!form) return;
    form.action = formAction;
    form.addEventListener('submit', submitQuoteForm);
  }

  function init() {
    initCookieBanner();
    initQuoteForm();
    initStepNavigation();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
