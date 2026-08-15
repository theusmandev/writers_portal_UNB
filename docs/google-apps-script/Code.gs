/**
 * ============================================================
 *  Urdu Novel Bank — Writer Portal Backend (Apps Script)
 *  Handles: Drive file uploads + Gmail email notifications
 * ============================================================
 */

// ── CONFIG ────────────────────────────────────────────────────
const CONFIG = {
  ROOT_FOLDER_NAME: 'Urdu Novel Bank - Writer Portal',
  POSTS_ROOT_FOLDER: 'Portal Post Images',
  SITE_URL: 'https://portal.urdunovelbanks.com',
  MAIN_SITE_URL: 'https://www.urdunovelbanks.com',
  SUPPORT_EMAIL: 'urdunovelbankofficial@gmail.com',
  SENDER_NAME: 'Urdu Novel Bank',
  BRAND_PRIMARY: '#9F5405',
  BRAND_SECONDARY: '#5C3A1E',
  BRAND_ACCENT: '#D4A24C',
  BG_CREAM: '#FDF6E9',
  TEXT_PRIMARY: '#2E1F0F'
};

// ── ENTRY POINTS ──────────────────────────────────────────────
function doGet(e) {
  return jsonResponse({ success: true, message: 'UNB Portal Backend is running.' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    switch (action) {
      case 'uploadFile':
        return jsonResponse(handleFileUpload(body));
      case 'sendEmail':
        return jsonResponse(handleSendEmail(body));
      case 'renamePostFolder':
        return jsonResponse(handleRenamePostFolder(body));
      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── PART 1: FILE UPLOAD TO DRIVE ─────────────────────────────
/**
 * Expected body:
 * {
 *   action: 'uploadFile',
 *   submissionCode: 'UNB-2026-0001' | 'uuid-token-for-posts',
 *   fileType: 'manuscript' | 'cover' | 'image',
 *   fileName: 'my-novel.pdf',
 *   mimeType: 'application/pdf',
 *   base64Data: '...'
 * }
 */
function handleFileUpload(body) {
  const { submissionCode, fileType, fileName, mimeType, base64Data, episodeNumber } = body;

  if (!submissionCode || !fileType || !fileName || !base64Data) {
    return { success: false, error: 'Missing required file upload fields.' };
  }

  let rootFolder;
  let targetFolder;

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // wait up to 30 seconds for the lock
    
    rootFolder = getOrCreateFolder(CONFIG.ROOT_FOLDER_NAME, DriveApp.getRootFolder());

    // Handle post image uploads specifically
    if (fileType === 'image') {
      const postsRoot = getOrCreateFolder(CONFIG.POSTS_ROOT_FOLDER, rootFolder);
      const shortToken = submissionCode.substring(0, 8);
      const prefix = 'post-' + shortToken;
      
      const existing = postsRoot.getFolders();
      let found = null;
      while (existing.hasNext()) {
        const folder = existing.next();
        if (folder.getName().startsWith(prefix)) {
          found = folder;
          break;
        }
      }
      
      if (found) {
        targetFolder = found;
      } else {
        targetFolder = postsRoot.createFolder(prefix);
      }
    } else {
      // Manuscript, cover, and episode submissions logic
      const year = submissionCode.match(/UNB-(\d{4})-/)
        ? submissionCode.match(/UNB-(\d{4})-/)[1]
        : new Date().getFullYear().toString();
    
      const submissionsFolder = getOrCreateFolder('Submissions', rootFolder);
      const yearFolder = getOrCreateFolder(year, submissionsFolder);
      const submissionFolder = getOrCreateFolder(submissionCode, yearFolder);
      
      if (fileType === 'episode') {
        targetFolder = getOrCreateFolder('Episodes', submissionFolder);
      } else {
        targetFolder = submissionFolder;
      }
    }
  } catch (err) {
    return { success: false, error: 'Failed to acquire folder lock: ' + err.message };
  } finally {
    lock.releaseLock();
  }

  const decoded = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(decoded, mimeType, fileName);

  if (fileType === 'image') {
    blob.setName(`${submissionCode.substring(0, 8)}-${Date.now()}-${fileName}`);
  } else if (fileType === 'episode') {
    blob.setName(`${submissionCode}-episode-${episodeNumber}-${fileName}`);
  } else {
    const prefix = fileType === 'cover' ? 'cover' : 'manuscript';
    blob.setName(`${submissionCode}-${prefix}-${fileName}`);
  }

  const file = targetFolder.createFile(blob);

  // Make file viewable via link (not publicly searchable/indexed)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    success: true,
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    downloadUrl: `https://drive.google.com/uc?id=${file.getId()}&export=download`
  };
}

function getOrCreateFolder(name, parentFolder) {
  const existing = parentFolder.getFoldersByName(name);
  if (existing.hasNext()) {
    return existing.next();
  }
  return parentFolder.createFolder(name);
}

// ── PART 1B: RENAME POST FOLDER ──────────────────────────────
/**
 * Expected body:
 * {
 *   action: 'renamePostFolder',
 *   token: 'uuid-token-for-posts',
 *   title: 'The Post Title'
 * }
 */
function handleRenamePostFolder(body) {
  const { token, title } = body;
  
  if (!token) {
    return { success: false, error: 'Missing token.' };
  }

  const shortToken = token.substring(0, 8);
  const prefix = 'post-' + shortToken;
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    const rootFolder = getOrCreateFolder(CONFIG.ROOT_FOLDER_NAME, DriveApp.getRootFolder());
    const postsRoot = getOrCreateFolder(CONFIG.POSTS_ROOT_FOLDER, rootFolder);
    
    const existing = postsRoot.getFolders();
    let targetFolder = null;
    while (existing.hasNext()) {
      const folder = existing.next();
      if (folder.getName().startsWith(prefix)) {
        targetFolder = folder;
        break;
      }
    }

    if (targetFolder) {
      const safeTitle = (title || 'Untitled')
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
      
      const newName = `${prefix} - ${safeTitle}`;
      
      // Only rename if it's different to save API calls
      if (targetFolder.getName() !== newName) {
        targetFolder.setName(newName);
      }
    }
  } catch (err) {
    return { success: false, error: 'Failed to acquire folder lock: ' + err.message };
  } finally {
    lock.releaseLock();
  }

  // We return success even if no folder was found, because it's valid for a post
  // to be saved without ever having uploaded any images.
  return { success: true };
}


// ── PART 2: EMAIL NOTIFICATIONS ──────────────────────────────
/**
 * Expected body:
 * {
 *   action: 'sendEmail',
 *   emailType: 'received' | 'action_required' | 'rejected' | 'published' | 'episodes_added',
 *   writerEmail: 'writer@example.com',
 *   writerName: 'Ahmad Ali',
 *   novelTitle: 'Mera Safar',
 *   submissionCode: 'UNB-2026-0001',
 *   statusNote: '...' (optional, for action_required / rejected),
 *   publishedUrl: '...' (optional, for published),
 *   missingFiles: '...' (optional, for received — e.g. 'manuscript', 'cover', 
 *                 or 'manuscript and cover' — only set when a file upload 
 *                 permanently failed)
 * }
 */
function handleSendEmail(body) {
  const {
    emailType, writerEmail, writerName, novelTitle, submissionCode,
    statusNote, publishedUrl, missingFiles
  } = body;

  if (!emailType || !writerEmail || !submissionCode) {
    return { success: false, error: 'Missing required email fields.' };
  }

  const trackLink = `${CONFIG.SITE_URL}/track?code=${encodeURIComponent(submissionCode)}&email=${encodeURIComponent(writerEmail)}`;

  let subject, html;

  switch (emailType) {
    case 'received': {
      subject = `Submission Received — ${submissionCode}`;

      const missingFilesNote = missingFiles
        ? `
          <div style="background:#FDEDEC; border-left:4px solid #DC2626; padding:14px 16px; margin:16px 0; border-radius:4px;">
            <strong>Please note:</strong> We couldn't upload your ${escapeHtml(missingFiles)}. 
            Please email it directly to ${CONFIG.SUPPORT_EMAIL} along with your Submission ID: 
            <strong>${escapeHtml(submissionCode)}</strong>.
          </div>
        `
        : '';

      html = buildEmailTemplate({
        heading: 'Submission Received',
        headingUrdu: 'آپ کی تحریر موصول ہو گئی',
        body: `
          <p>Dear ${escapeHtml(writerName || 'Writer')},</p>
          <p>Thank you for submitting <strong>${escapeHtml(novelTitle || 'your novel')}</strong> to Urdu Novel Bank. 
          We have received your manuscript and it will now go through our review process.</p>
          <p><strong>Your Submission ID:</strong></p>
          <div style="font-size:20px; font-weight:bold; color:${CONFIG.BRAND_PRIMARY}; margin:12px 0;">
            ${escapeHtml(submissionCode)}
          </div>
          ${missingFilesNote}
          <p>Please save this ID — you'll need it to track your submission's progress.</p>
        `,
        bodyUrdu: 'براہِ کرم اپنی سب کچھ محفوظ کریں، آپ اپنی تحریر کی صورتحال ٹریک کرنے کے لیے اسے استعمال کر سکتے ہیں۔',
        ctaText: 'Track Your Submission',
        ctaLink: trackLink
      });
      break;
    }

    case 'action_required':
      subject = `Action Required — ${submissionCode}`;
      html = buildEmailTemplate({
        heading: 'Action Required on Your Submission',
        headingUrdu: 'آپ کی تحریر پر کارروائی درکار ہے',
        body: `
          <p>Dear ${escapeHtml(writerName || 'Writer')},</p>
          <p>We need some additional information or corrections regarding your submission 
          <strong>${escapeHtml(novelTitle || '')}</strong> (${escapeHtml(submissionCode)}).</p>
          ${statusNote ? `
            <div style="background:${CONFIG.BG_CREAM}; border-left:4px solid ${CONFIG.BRAND_ACCENT}; padding:14px 16px; margin:16px 0; border-radius:4px;">
              ${escapeHtml(statusNote)}
            </div>
          ` : ''}
          <p>Please visit your tracking page to respond.</p>
        `,
        bodyUrdu: 'براہِ کرم اپنی تحریر کی صورتحال دیکھنے کے لیے ٹریکنگ صفحہ ملاحظہ کریں۔',
        ctaText: 'Respond Now',
        ctaLink: trackLink
      });
      break;

    case 'rejected':
      subject = `Update on Your Submission — ${submissionCode}`;
      html = buildEmailTemplate({
        heading: 'Submission Update',
        headingUrdu: 'آپ کی تحریر سے متعلق اپڈیٹ',
        body: `
          <p>Dear ${escapeHtml(writerName || 'Writer')},</p>
          <p>After careful review, we're unable to move forward with 
          <strong>${escapeHtml(novelTitle || 'your submission')}</strong> (${escapeHtml(submissionCode)}) at this time.</p>
          ${statusNote ? `
            <div style="background:${CONFIG.BG_CREAM}; border-left:4px solid #999; padding:14px 16px; margin:16px 0; border-radius:4px;">
              ${escapeHtml(statusNote)}
            </div>
          ` : ''}
          <p>You're welcome to revise and submit again in the future. Thank you for considering Urdu Novel Bank.</p>
        `,
        bodyUrdu: 'آپ مستقبل میں نظرثانی کے بعد دوبارہ جمع کروا سکتے ہیں۔',
        ctaText: 'View Details',
        ctaLink: trackLink
      });
      break;

    case 'published':
      subject = `🎉 Your Novel is Published! — ${submissionCode}`;
      html = buildEmailTemplate({
        heading: '🎉 Congratulations! Your Novel is Published',
        headingUrdu: 'مبارک ہو! آپ کا ناول شائع ہو گیا',
        body: `
          <p>Dear ${escapeHtml(writerName || 'Writer')},</p>
          <p>We're excited to let you know that <strong>${escapeHtml(novelTitle || 'your novel')}</strong> 
          is now published on Urdu Novel Bank!</p>
        `,
        bodyUrdu: 'ہمیں خوشی ہے کہ آپ کا ناول اردو ناول بینک پر شائع ہو گیا ہے۔',
        ctaText: publishedUrl ? 'View Your Novel' : 'Track Submission',
        ctaLink: publishedUrl || trackLink
      });
      break;

    case 'episodes_added':
      subject = `New Episodes Added — ${submissionCode}`;
      html = buildEmailTemplate({
        heading: 'New Episodes Received',
        headingUrdu: 'نئی اقساط موصول ہو گئیں',
        body: `
          <p>Dear ${escapeHtml(writerName || 'Writer')},</p>
          <p>Thank you for submitting new episodes for your ongoing novel <strong>${escapeHtml(novelTitle || '')}</strong>.</p>
          <p>We have successfully received the new episodes. Your submission now has a total of <strong>${body.episodeCount || ''}</strong> episodes.</p>
          <p>You can track the status of your submission using your Submission ID: <strong>${escapeHtml(submissionCode)}</strong>.</p>
        `,
        bodyUrdu: 'آپ کی نئی اقساط ہمیں موصول ہو گئی ہیں، شکریہ۔',
        ctaText: 'Track Your Submission',
        ctaLink: trackLink
      });
      break;

    default:
      return { success: false, error: 'Unknown emailType: ' + emailType };
  }

  MailApp.sendEmail({
    to: writerEmail,
    subject: subject,
    htmlBody: html,
    name: CONFIG.SENDER_NAME
  });

  return { success: true, message: 'Email sent to ' + writerEmail };
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── EMAIL TEMPLATE BUILDER ────────────────────────────────────
function buildEmailTemplate({ heading, headingUrdu, body, bodyUrdu, ctaText, ctaLink }) {
  return `
  <div style="font-family: Georgia, 'Times New Roman', serif; background:${CONFIG.BG_CREAM}; padding:32px 16px;">
    <div style="max-width:560px; margin:0 auto; background:#FFFCF5; border-radius:8px; overflow:hidden; border:1px solid #E8D9BE;">
      
      <div style="background:${CONFIG.BRAND_PRIMARY}; padding:24px 32px;">
        <div style="color:#fff; font-size:20px; font-weight:bold;">Urdu Novel Bank</div>
        <div style="color:${CONFIG.BRAND_ACCENT}; font-size:13px; margin-top:2px;">Writer &amp; Publication Portal</div>
      </div>

      <div style="padding:32px;">
        <h1 style="font-size:22px; color:${CONFIG.TEXT_PRIMARY}; margin:0 0 4px 0;">${heading}</h1>
        <div dir="rtl" style="font-size:16px; color:${CONFIG.BRAND_PRIMARY}; margin:0 0 20px 0; font-family: 'Noto Nastaliq Urdu', serif;">
          ${headingUrdu}
        </div>

        <div style="font-size:15px; line-height:1.7; color:${CONFIG.TEXT_PRIMARY};">
          ${body}
        </div>

        <div dir="rtl" style="font-size:14px; color:#6B5842; margin-top:16px; font-family: 'Noto Nastaliq Urdu', serif;">
          ${bodyUrdu}
        </div>

        <div style="text-align:center; margin-top:28px;">
          <a href="${ctaLink}" style="background:${CONFIG.BRAND_PRIMARY}; color:#fff; text-decoration:none; padding:12px 28px; border-radius:6px; font-size:15px; display:inline-block;">
            ${ctaText}
          </a>
        </div>
      </div>

      <div style="background:${CONFIG.BRAND_SECONDARY}; padding:16px 32px; text-align:center;">
        <div style="color:#D9C6AC; font-size:12px;">
          © ${new Date().getFullYear()} Urdu Novel Bank &nbsp;•&nbsp; 
          <a href="${CONFIG.MAIN_SITE_URL}" style="color:${CONFIG.BRAND_ACCENT};">urdunovelbanks.com</a>
        </div>
      </div>

    </div>
  </div>
  `;
}
