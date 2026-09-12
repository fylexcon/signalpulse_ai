(function() {
  // Styles for the widget
  const styles = `
    #feedback-widget-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0ea5e9;
      color: white;
      border: none;
      border-radius: 50px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
      z-index: 9999;
      font-family: system-ui, -apple-system, sans-serif;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #feedback-widget-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4);
    }
    #feedback-widget-modal {
      display: none;
      position: fixed;
      bottom: 80px;
      right: 24px;
      width: 320px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      animation: slideUp 0.3s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #feedback-widget-header {
      background: #f8fafc;
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #feedback-widget-header h3 {
      margin: 0;
      font-size: 16px;
      color: #0f172a;
    }
    #feedback-widget-close {
      background: none;
      border: none;
      font-size: 20px;
      color: #64748b;
      cursor: pointer;
      line-height: 1;
    }
    #feedback-widget-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .feedback-widget-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 14px;
      box-sizing: border-box;
      outline: none;
    }
    .feedback-widget-input:focus {
      border-color: #0ea5e9;
    }
    #feedback-widget-submit {
      background: #0f172a;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 10px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 4px;
    }
    #feedback-widget-submit:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
    #feedback-widget-success {
      display: none;
      padding: 24px;
      text-align: center;
      color: #10b981;
    }
  `;

  // Inject styles
  const styleTag = document.createElement('style');
  styleTag.innerHTML = styles;
  document.head.appendChild(styleTag);

  // Extract API key from script tag if passed as data attribute
  const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const apiKey = scriptTag?.getAttribute('data-api-key') || '';
  const apiUrl = scriptTag?.getAttribute('data-api-url') || 'http://localhost:8000/api/v1/public/feedback';

  // Create UI
  const btn = document.createElement('button');
  btn.id = 'feedback-widget-btn';
  btn.innerText = 'Feedback';
  document.body.appendChild(btn);

  const modal = document.createElement('div');
  modal.id = 'feedback-widget-modal';
  modal.innerHTML = `
    <div id="feedback-widget-header">
      <h3>Send Feedback</h3>
      <button id="feedback-widget-close">&times;</button>
    </div>
    <div id="feedback-widget-body">
      <input type="text" id="feedback-widget-title" class="feedback-widget-input" placeholder="What's it about?" required />
      <textarea id="feedback-widget-content" class="feedback-widget-input" placeholder="Tell us more..." rows="4" required></textarea>
      <input type="email" id="feedback-widget-email" class="feedback-widget-input" placeholder="Your email (optional)" />
      <button id="feedback-widget-submit">Send Feedback</button>
    </div>
    <div id="feedback-widget-success">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 12px; display: block;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      <h3 style="margin: 0 0 8px; color: #0f172a;">Thank you!</h3>
      <p style="margin: 0; font-size: 14px; color: #64748b;">Your feedback has been received.</p>
    </div>
  `;
  document.body.appendChild(modal);

  // Logic
  const closeBtn = document.getElementById('feedback-widget-close');
  const submitBtn = document.getElementById('feedback-widget-submit');
  const titleInput = document.getElementById('feedback-widget-title');
  const contentInput = document.getElementById('feedback-widget-content');
  const emailInput = document.getElementById('feedback-widget-email');
  const bodyDiv = document.getElementById('feedback-widget-body');
  const successDiv = document.getElementById('feedback-widget-success');

  btn.addEventListener('click', () => {
    const isVisible = modal.style.display === 'block';
    modal.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      bodyDiv.style.display = 'flex';
      successDiv.style.display = 'none';
      titleInput.value = '';
      contentInput.value = '';
      emailInput.value = '';
    }
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  submitBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const email = emailInput.value.trim();

    if (!title || !content) {
      alert('Please fill out the title and content.');
      return;
    }

    if (!apiKey) {
      alert('API key is missing in widget script.');
      return;
    }

    submitBtn.innerText = 'Sending...';
    submitBtn.disabled = true;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          title,
          content,
          customer_email: email || null,
        }),
      });

      if (response.ok) {
        bodyDiv.style.display = 'none';
        successDiv.style.display = 'block';
        setTimeout(() => {
          modal.style.display = 'none';
        }, 3000);
      } else {
        const err = await response.json();
        alert('Failed to send feedback: ' + (err.detail || response.statusText));
      }
    } catch (e) {
      alert('Network error. Please try again later.');
    } finally {
      submitBtn.innerText = 'Send Feedback';
      submitBtn.disabled = false;
    }
  });
})();
