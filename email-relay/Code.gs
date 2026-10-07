/**
 * VEYA Transactional Email Relay (Google Apps Script Web App)
 * 
 * Secure server-to-server relay using Google Workspace MailApp.
 * Requests must be signed with HMAC-SHA256 using a shared secret stored in Script Properties.
 */

function getSharedSecret() {
  var secret = PropertiesService.getScriptProperties().getProperty('EMAIL_RELAY_SECRET');
  if (!secret) {
    throw new Error('EMAIL_RELAY_SECRET script property is not set');
  }
  return secret;
}

function computeHmacSha256(message, secret) {
  var signatureBytes = Utilities.computeHmacSha256Signature(message, secret);
  return signatureBytes.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ error: 'Missing request body' }, 400);
    }

    var payload = JSON.parse(e.postData.contents);
    var timestamp = payload.timestamp;
    var signature = payload.signature;
    var data = payload.data;

    if (!timestamp || !signature || !data) {
      return jsonResponse({ error: 'Missing required payload fields (timestamp, signature, data)' }, 400);
    }

    // 1. Verify Timestamp Freshness (prevent replay attacks, allow 5 minutes clock drift)
    var nowMs = Date.now();
    var reqMs = Number(timestamp);
    if (isNaN(reqMs) || Math.abs(nowMs - reqMs) > 300000) {
      return jsonResponse({ error: 'Timestamp expired or out of allowed window' }, 401);
    }

    // 2. Verify HMAC Signature
    var secret = getSharedSecret();
    var canonicalString = timestamp + ':' + JSON.stringify(data);
    var expectedSignature = computeHmacSha256(canonicalString, secret);

    if (signature.toLowerCase() !== expectedSignature.toLowerCase()) {
      return jsonResponse({ error: 'Invalid HMAC signature' }, 401);
    }

    // 3. Process Controlled Email Types
    var type = data.type;
    var to = data.to;
    var firstName = data.firstName || 'there';

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return jsonResponse({ error: 'Invalid recipient email address' }, 400);
    }

    if (type === 'WELCOME') {
      sendWelcomeEmail(to, firstName);
      return jsonResponse({ success: true, message: 'Welcome email sent successfully' }, 200);
    } else if (type === 'PASSWORD_RESET') {
      var resetUrl = data.resetUrl;
      if (!resetUrl || typeof resetUrl !== 'string') {
        return jsonResponse({ error: 'Missing resetUrl for PASSWORD_RESET' }, 400);
      }

      // Open redirect & origin protection: only allow official production reset URL
      if (!resetUrl.startsWith('https://app.lucidmediax.in/reset-password?token=')) {
        return jsonResponse({ error: 'Disallowed resetUrl origin or route' }, 400);
      }

      sendPasswordResetEmail(to, firstName, resetUrl);
      return jsonResponse({ success: true, message: 'Password reset email sent successfully' }, 200);
    } else {
      return jsonResponse({ error: 'Unsupported email type' }, 400);
    }

  } catch (err) {
    return jsonResponse({ error: 'Relay error: ' + err.message }, 500);
  }
}

function sendWelcomeEmail(to, firstName) {
  var cleanName = escapeHtml(firstName);
  var appUrl = 'https://app.lucidmediax.in';

  var subject = 'Welcome to VEYA';

  var textBody = [
    'Hi ' + firstName + ',',
    '',
    'Welcome to VEYA.',
    '',
    'Your account has been created successfully.',
    '',
    'You can now sign in and start managing your work: ' + appUrl,
    '',
    'Regards,',
    'VEYA'
  ].join('\n');

  var htmlBody = [
    '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1e293b; line-height: 1.6;">',
    '  <div style="margin-bottom: 24px;">',
    '    <span style="font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #4f46e5;">VEYA</span>',
    '  </div>',
    '  <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">',
    '    <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">Welcome to VEYA</h1>',
    '    <p style="font-size: 14px; color: #475569; margin-bottom: 16px;">Hi ' + cleanName + ',</p>',
    '    <p style="font-size: 14px; color: #475569; margin-bottom: 16px;">Your account has been created successfully. You can now sign in and start organizing projects, tracking time, and collaborating with your team.</p>',
    '    <div style="margin: 28px 0;">',
    '      <a href="' + appUrl + '" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; display: inline-block;">Open VEYA &rarr;</a>',
    '    </div>',
    '    <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">If you have any questions or need help, simply reply to this email.</p>',
    '  </div>',
    '  <div style="margin-top: 24px; text-align: center; font-size: 12px; color: #94a3b8;">',
    '    &copy; ' + new Date().getFullYear() + ' VEYA. All rights reserved.',
    '  </div>',
    '</div>'
  ].join('\n');

  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: textBody,
    htmlBody: htmlBody,
    name: 'VEYA'
  });
}

function sendPasswordResetEmail(to, firstName, resetUrl) {
  var cleanName = escapeHtml(firstName);
  var subject = 'Reset your VEYA password';

  var textBody = [
    'Hi ' + firstName + ',',
    '',
    'We received a request to reset your VEYA password.',
    '',
    'Click the following link to set a new password:',
    resetUrl,
    '',
    'This link expires in 30 minutes and can only be used once.',
    '',
    'If you didn\'t request this, you can safely ignore this email.',
    '',
    'Regards,',
    'VEYA'
  ].join('\n');

  var htmlBody = [
    '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1e293b; line-height: 1.6;">',
    '  <div style="margin-bottom: 24px;">',
    '    <span style="font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #4f46e5;">VEYA</span>',
    '  </div>',
    '  <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">',
    '    <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">Reset Your Password</h1>',
    '    <p style="font-size: 14px; color: #475569; margin-bottom: 16px;">Hi ' + cleanName + ',</p>',
    '    <p style="font-size: 14px; color: #475569; margin-bottom: 16px;">We received a request to reset your VEYA account password. Click the button below to choose a new password:</p>',
    '    <div style="margin: 28px 0;">',
    '      <a href="' + resetUrl + '" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; display: inline-block;">Reset Password</a>',
    '    </div>',
    '    <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">This secure link expires in <strong>30 minutes</strong> and can only be used once.</p>',
    '    <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>',
    '  </div>',
    '  <div style="margin-top: 24px; text-align: center; font-size: 12px; color: #94a3b8;">',
    '    &copy; ' + new Date().getFullYear() + ' VEYA. All rights reserved.',
    '  </div>',
    '</div>'
  ].join('\n');

  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: textBody,
    htmlBody: htmlBody,
    name: 'VEYA'
  });
}

function jsonResponse(obj, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
