/**
 * Alpha No-Code - Audit IA Form
 * Multi-step form with localStorage autosave, UTM tracking, and webhook submission
 */

(function() {
  'use strict';

  // ========================================
  // Configuration
  // ========================================
  const CONFIG = {
    WEBHOOK_URL: 'https://n8n.srv1159833.hstgr.cloud/webhook/audit-ia',
    WEBHOOK_TOKEN: 'QcGB32qxCHGmTX9Pb3ZklydHQfjunShc',
    LOCALSTORAGE_KEY: 'audit_ia_form_data',
    TRACKING_KEY: 'audit_ia_tracking',
    SESSION_KEY: 'audit_ia_session_id',
    TOTAL_PAGES: 7
  };

  // ========================================
  // State
  // ========================================
  let currentPage = 1;
  let formData = {};
  let tracking = {};

  // ========================================
  // DOM Elements
  // ========================================
  const form = document.getElementById('auditForm');
  const pages = document.querySelectorAll('.form-page');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const errorModal = document.getElementById('errorModal');
  const errorMessage = document.getElementById('errorMessage');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const submitBtn = document.getElementById('submitBtn');
  const analysisContainer = document.getElementById('analysisContainer');
  const painScoreInput = document.getElementById('pain_score');
  const painScoreValue = document.getElementById('pain_score_value');

  // ========================================
  // Utility Functions
  // ========================================
  
  /**
   * Generate a stable session ID
   */
  function generateSessionId() {
    let sessionId = localStorage.getItem(CONFIG.SESSION_KEY);
    if (!sessionId) {
      sessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(CONFIG.SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  /**
   * Get URL parameters
   */
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
      ref: params.get('ref') || '',
      variant: params.get('variant') || ''
    };
  }

  /**
   * Initialize tracking from URL params
   */
  function initTracking() {
    // Check if we have stored tracking data
    const storedTracking = localStorage.getItem(CONFIG.TRACKING_KEY);
    if (storedTracking) {
      tracking = JSON.parse(storedTracking);
    }

    // Get current URL params
    const urlParams = getUrlParams();
    
    // Update tracking with URL params (URL params take precedence)
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'variant'];
    trackingParams.forEach(param => {
      if (urlParams[param]) {
        tracking[param] = urlParams[param];
      } else if (!tracking[param]) {
        tracking[param] = '';
      }
    });

    // Ensure session ID exists
    tracking.sessionId = generateSessionId();
    
    // Save tracking
    localStorage.setItem(CONFIG.TRACKING_KEY, JSON.stringify(tracking));
    
    return tracking;
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========================================
  // localStorage Autosave
  // ========================================
  
  function saveToLocalStorage() {
    const data = {
      formData: formData,
      currentPage: currentPage,
      timestamp: Date.now()
    };
    localStorage.setItem(CONFIG.LOCALSTORAGE_KEY, JSON.stringify(data));
  }

  function loadFromLocalStorage() {
    const stored = localStorage.getItem(CONFIG.LOCALSTORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Check if data is not too old (24 hours)
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          formData = data.formData || {};
          currentPage = Math.min(data.currentPage || 1, 6); // Don't restore to page 7
          return true;
        }
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    }
    return false;
  }

  function clearLocalStorage() {
    localStorage.removeItem(CONFIG.LOCALSTORAGE_KEY);
  }

  function restoreFormFields() {
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      const field = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
      
      if (!field) return;

      if (field.type === 'checkbox') {
        field.checked = value === true || value === 'on';
      } else if (field.type === 'radio') {
        const radios = document.querySelectorAll(`[name="${key}"]`);
        radios.forEach(radio => {
          radio.checked = radio.value === value;
        });
      } else if (key === 'error_impact' && Array.isArray(value)) {
        const checkboxes = document.querySelectorAll('[name="error_impact"]');
        checkboxes.forEach(cb => {
          cb.checked = value.includes(cb.value);
        });
      } else {
        field.value = value;
      }
    });

    // Update pain score display
    if (formData.pain_score) {
      painScoreValue.textContent = formData.pain_score;
    }

    // Handle conditional fields visibility
    handleConditionalFields();
  }

  // ========================================
  // Form Field Collection
  // ========================================
  
  function collectFormData() {
    const data = {};
    
    // Text, email, tel, number inputs
    const textInputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], textarea, select');
    textInputs.forEach(input => {
      if (input.name && input.name !== 'hp_field') {
        data[input.name] = input.value;
      }
    });

    // Range input
    if (painScoreInput) {
      data['pain_score'] = parseInt(painScoreInput.value, 10);
    }

    // Radio buttons
    const radioGroups = ['client_type', 'urgency', 'decision_power', 'budget_range', 'goal_type', 'preferred_channel', 'preferred_time'];
    radioGroups.forEach(name => {
      const checked = form.querySelector(`input[name="${name}"]:checked`);
      if (checked) {
        data[name] = checked.value;
      }
    });

    // Checkboxes (error_impact)
    const errorImpactCheckboxes = form.querySelectorAll('input[name="error_impact"]:checked');
    data['error_impact'] = Array.from(errorImpactCheckboxes).map(cb => cb.value);

    // RGPD consent
    const consentCheckbox = document.getElementById('consent_rgpd');
    data['consent_rgpd'] = consentCheckbox ? consentCheckbox.checked : false;

    // Honeypot
    const honeypot = document.getElementById('hp_field');
    data['hp_field'] = honeypot ? honeypot.value : '';

    return data;
  }

  // ========================================
  // Validation
  // ========================================
  
  function validatePage(pageNum) {
    const page = document.querySelector(`.form-page[data-page="${pageNum}"]`);
    if (!page) return true;

    let isValid = true;
    const errors = [];

    // Clear previous errors
    page.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    page.querySelectorAll('.error-message').forEach(el => el.textContent = '');

    // Page 2 validation
    if (pageNum === 2) {
      const businessSector = document.getElementById('business_sector');
      if (!businessSector.value) {
        businessSector.classList.add('error');
        isValid = false;
      }

      // If "Autre" is selected, validate business_sector_other
      if (businessSector.value === 'Autre') {
        const businessSectorOther = document.getElementById('business_sector_other');
        if (!businessSectorOther.value.trim()) {
          businessSectorOther.classList.add('error');
          isValid = false;
        }
      }

      const clientType = form.querySelector('input[name="client_type"]:checked');
      if (!clientType) {
        isValid = false;
      }

      const q1People = document.getElementById('q1_people');
      if (!q1People.value || parseInt(q1People.value, 10) < 1) {
        q1People.classList.add('error');
        isValid = false;
      }
    }

    // Page 3 validation
    if (pageNum === 3) {
      const biggestChallenge = document.getElementById('biggestChallenge');
      if (!biggestChallenge.value.trim()) {
        biggestChallenge.classList.add('error');
        isValid = false;
      }
    }

    // Page 4 validation
    if (pageNum === 4) {
      const processType = document.getElementById('process_type');
      if (!processType.value) {
        processType.classList.add('error');
        isValid = false;
      }

      const processVolume = document.getElementById('process_volume');
      if (!processVolume.value || parseInt(processVolume.value, 10) < 1) {
        processVolume.classList.add('error');
        isValid = false;
      }

      const errorImpactChecked = form.querySelectorAll('input[name="error_impact"]:checked');
      if (errorImpactChecked.length === 0) {
        const errorEl = document.getElementById('error_impact_error');
        if (errorEl) {
          errorEl.textContent = 'Sélectionnez au moins une option';
        }
        isValid = false;
      }
    }

    // Page 5 validation
    if (pageNum === 5) {
      const urgency = form.querySelector('input[name="urgency"]:checked');
      if (!urgency) isValid = false;

      const decisionPower = form.querySelector('input[name="decision_power"]:checked');
      if (!decisionPower) isValid = false;

      const budgetRange = form.querySelector('input[name="budget_range"]:checked');
      if (!budgetRange) isValid = false;

      const goalType = form.querySelector('input[name="goal_type"]:checked');
      if (!goalType) {
        isValid = false;
      } else {
        // Validate goal_value or goal_text based on goal_type
        if (goalType.value !== 'autre') {
          const goalValue = document.getElementById('goal_value');
          if (!goalValue.value || parseInt(goalValue.value, 10) < 1) {
            goalValue.classList.add('error');
            isValid = false;
          }
        } else {
          const goalText = document.getElementById('goal_text');
          if (!goalText.value.trim()) {
            goalText.classList.add('error');
            isValid = false;
          }
        }
      }
    }

    // Page 6 validation
    if (pageNum === 6) {
      const companyName = document.getElementById('company_name');
      if (!companyName.value.trim()) {
        companyName.classList.add('error');
        isValid = false;
      }

      const contactFirstname = document.getElementById('contact_firstname');
      if (!contactFirstname.value.trim()) {
        contactFirstname.classList.add('error');
        isValid = false;
      }

      const contactLastname = document.getElementById('contact_lastname');
      if (!contactLastname.value.trim()) {
        contactLastname.classList.add('error');
        isValid = false;
      }

      const contactEmail = document.getElementById('contact_email');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!contactEmail.value.trim() || !emailRegex.test(contactEmail.value)) {
        contactEmail.classList.add('error');
        isValid = false;
      }

      const preferredChannel = form.querySelector('input[name="preferred_channel"]:checked');
      if (!preferredChannel) isValid = false;

      const preferredTime = form.querySelector('input[name="preferred_time"]:checked');
      if (!preferredTime) isValid = false;

      const consentRgpd = document.getElementById('consent_rgpd');
      if (!consentRgpd.checked) {
        isValid = false;
      }
    }

    return isValid;
  }

  // ========================================
  // Navigation
  // ========================================
  
  function updateProgress() {
    const progress = (currentPage / CONFIG.TOTAL_PAGES) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `Étape ${currentPage} sur ${CONFIG.TOTAL_PAGES}`;
  }

  function showPage(pageNum) {
    pages.forEach(page => {
      page.classList.remove('active');
      if (parseInt(page.dataset.page, 10) === pageNum) {
        page.classList.add('active');
      }
    });
    currentPage = pageNum;
    updateProgress();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Save to localStorage
    formData = collectFormData();
    saveToLocalStorage();
  }

  function nextPage() {
    if (currentPage < CONFIG.TOTAL_PAGES - 1) { // Don't validate for page 7
      if (validatePage(currentPage)) {
        showPage(currentPage + 1);
      }
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      showPage(currentPage - 1);
    }
  }

  // ========================================
  // Conditional Fields
  // ========================================
  
  function handleConditionalFields() {
    // business_sector_other visibility
    const businessSector = document.getElementById('business_sector');
    const businessSectorOtherGroup = document.getElementById('business_sector_other_group');
    if (businessSector && businessSectorOtherGroup) {
      businessSectorOtherGroup.style.display = businessSector.value === 'Autre' ? 'block' : 'none';
    }

    // goal_value and goal_text visibility
    const goalType = form.querySelector('input[name="goal_type"]:checked');
    const goalValueGroup = document.getElementById('goal_value_group');
    const goalTextGroup = document.getElementById('goal_text_group');
    
    if (goalValueGroup && goalTextGroup) {
      if (goalType) {
        if (goalType.value === 'autre') {
          goalValueGroup.style.display = 'none';
          goalTextGroup.style.display = 'block';
        } else {
          goalValueGroup.style.display = 'block';
          goalTextGroup.style.display = 'none';
        }
      } else {
        goalValueGroup.style.display = 'none';
        goalTextGroup.style.display = 'none';
      }
    }
  }

  // ========================================
  // Form Submission
  // ========================================
  
  async function submitForm(e) {
    e.preventDefault();

    // Validate final page
    if (!validatePage(6)) {
      return;
    }

    // Check honeypot
    const honeypot = document.getElementById('hp_field');
    if (honeypot && honeypot.value) {
      // Bot detected, silently fail
      showPage(7);
      analysisContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Merci pour votre intérêt.</p>';
      return;
    }

    // Collect final form data
    formData = collectFormData();

    // Show loading state
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    submitBtn.disabled = true;

    // Build payload
    const payload = {
      meta: {
        submittedAt: new Date().toISOString(),
        tracking: {
          sessionId: tracking.sessionId,
          tag: 'audit-ia',
          params: {
            utm_source: tracking.utm_source || '',
            utm_medium: tracking.utm_medium || '',
            utm_campaign: tracking.utm_campaign || '',
            utm_term: tracking.utm_term || '',
            utm_content: tracking.utm_content || '',
            ref: tracking.ref || '',
            variant: tracking.variant || ''
          }
        }
      },
      answers: {
        business_sector: formData.business_sector || '',
        business_sector_other: formData.business_sector_other || '',
        client_type: formData.client_type || '',
        q1_people: parseInt(formData.q1_people, 10) || 0,
        biggestChallenge: formData.biggestChallenge || '',
        pain_score: parseInt(formData.pain_score, 10) || 5,
        process_type: formData.process_type || '',
        process_volume: parseInt(formData.process_volume, 10) || 0,
        process_volume_unit: formData.process_volume_unit || '/mois',
        error_impact: formData.error_impact || [],
        urgency: formData.urgency || '',
        decision_power: formData.decision_power || '',
        budget_range: formData.budget_range || '',
        goal_type: formData.goal_type || '',
        goal_value: parseInt(formData.goal_value, 10) || 0,
        goal_text: formData.goal_text || '',
        company_name: formData.company_name || '',
        contact_firstname: formData.contact_firstname || '',
        contact_lastname: formData.contact_lastname || '',
        contact_email: formData.contact_email || '',
        contact_phone: formData.contact_phone || '',
        preferred_channel: formData.preferred_channel || '',
        preferred_time: formData.preferred_time || '',
        consent_rgpd: formData.consent_rgpd || false
      }
    };

    try {
      const webhookUrl = `${CONFIG.WEBHOOK_URL}?token=${CONFIG.WEBHOOK_TOKEN}`;
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        result = { ok: false, error: 'Invalid response from server' };
      }

      // Handle response
      if (result.ok === true) {
        // Success - show page 7 with analysis
        clearLocalStorage();
        
        if (result.analysis_html) {
          analysisContainer.innerHTML = result.analysis_html;
        } else {
          analysisContainer.innerHTML = `
            <div style="text-align:center;padding:24px;">
              <p style="font-size:16px;color:var(--text-light);">Votre analyse a été générée avec succès !</p>
              <p style="font-size:14px;color:var(--text-muted);margin-top:8px;">ID: ${escapeHtml(result.submissionId || 'N/A')}</p>
            </div>
          `;
        }
        
        showPage(7);
      } else {
        // Error response from webhook
        throw new Error(result.error || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('Submission error:', error);
      
      // Show error modal
      errorMessage.textContent = error.message || 'Une erreur est survenue. Veuillez réessayer.';
      errorModal.classList.add('active');
    } finally {
      // Reset button state
      btnText.style.display = 'block';
      btnLoader.style.display = 'none';
      submitBtn.disabled = false;
    }
  }

  // ========================================
  // Error Modal
  // ========================================
  
  function closeModal() {
    errorModal.classList.remove('active');
  }

  // ========================================
  // Event Listeners
  // ========================================
  
  function initEventListeners() {
    // Next buttons
    document.querySelectorAll('.btn-next').forEach(btn => {
      btn.addEventListener('click', nextPage);
    });

    // Previous buttons
    document.querySelectorAll('.btn-prev').forEach(btn => {
      btn.addEventListener('click', prevPage);
    });

    // Form submission
    form.addEventListener('submit', submitForm);

    // Close modal
    closeModalBtn.addEventListener('click', closeModal);
    errorModal.addEventListener('click', (e) => {
      if (e.target === errorModal) closeModal();
    });

    // Pain score slider
    painScoreInput.addEventListener('input', () => {
      painScoreValue.textContent = painScoreInput.value;
    });

    // Business sector change
    const businessSector = document.getElementById('business_sector');
    businessSector.addEventListener('change', handleConditionalFields);

    // Goal type change
    const goalTypeRadios = document.querySelectorAll('input[name="goal_type"]');
    goalTypeRadios.forEach(radio => {
      radio.addEventListener('change', handleConditionalFields);
    });

    // Auto-save on input change
    form.addEventListener('change', () => {
      formData = collectFormData();
      saveToLocalStorage();
    });

    form.addEventListener('input', debounce(() => {
      formData = collectFormData();
      saveToLocalStorage();
    }, 500));

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') {
        e.preventDefault();
        if (currentPage < 6) {
          nextPage();
        }
      }
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  /**
   * Debounce function
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // ========================================
  // Initialization
  // ========================================
  
  function init() {
    // Initialize tracking
    initTracking();

    // Try to restore from localStorage
    const restored = loadFromLocalStorage();
    
    if (restored) {
      restoreFormFields();
    }

    // Show initial page
    showPage(currentPage);

    // Handle conditional fields
    handleConditionalFields();

    // Initialize event listeners
    initEventListeners();

    console.log('Audit IA Form initialized');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
