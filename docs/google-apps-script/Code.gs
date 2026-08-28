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
  TEXT_PRIMARY: '#2E1F0F',
  SOCIAL: {
    facebook: 'https://www.facebook.com/people/Urdu-novel-Bank/100090906471153/',
    whatsapp: 'https://whatsapp.com/channel/0029VaurdEY0wajrnyeAl50Y',
    pinterest: 'https://www.pinterest.com/urdunovelbanks/',
    instagram: 'https://www.instagram.com/urdunovelbank/',
    youtube: 'https://youtube.com/@urdunovelbank'
  }
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
      case 'deleteSubmissionFolder':
        return jsonResponse(handleDeleteSubmissionFolder(body));
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
function handleFileUpload(body) {
  const { submissionCode, fileType, fileName, mimeType, base64Data, episodeNumber } = body;

  if (!submissionCode || !fileType || !fileName || !base64Data) {
    return { success: false, error: 'Missing required file upload fields.' };
  }

  let rootFolder;
  let targetFolder;

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    rootFolder = getOrCreateFolder(CONFIG.ROOT_FOLDER_NAME, DriveApp.getRootFolder());

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
      
      if (targetFolder.getName() !== newName) {
        targetFolder.setName(newName);
      }
    }
  } catch (err) {
    return { success: false, error: 'Failed to acquire folder lock: ' + err.message };
  } finally {
    lock.releaseLock();
  }

  return { success: true };
}

// ── PART 1C: DELETE SUBMISSION FOLDER (TRASH) ────────────────
function handleDeleteSubmissionFolder(body) {
  const { submissionCode } = body;
  
  if (!submissionCode) {
    return { success: false, error: 'Missing submissionCode.' };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    const rootFolder = getOrCreateFolder(CONFIG.ROOT_FOLDER_NAME, DriveApp.getRootFolder());
    
    const year = submissionCode.match(/UNB-(\d{4})-/)
        ? submissionCode.match(/UNB-(\d{4})-/)[1]
        : new Date().getFullYear().toString();
        
    const submissionsFolder = getOrCreateFolder('Submissions', rootFolder);
    const yearFolder = getOrCreateFolder(year, submissionsFolder);
    
    const existing = yearFolder.getFoldersByName(submissionCode);
    if (existing.hasNext()) {
      const submissionFolder = existing.next();
      submissionFolder.setTrashed(true);
    }
    
  } catch (err) {
    return { success: false, error: 'Failed to delete folder: ' + err.message };
  } finally {
    lock.releaseLock();
  }

  return { success: true };
}


// ── PART 2: EMAIL NOTIFICATIONS ──────────────────────────────
function handleSendEmail(body) {
  const {
    emailType, writerEmail, writerName, novelTitle, submissionCode,
    statusNote, publishedUrl, missingFiles
  } = body;

  if (!emailType || !writerEmail || !submissionCode) {
    return { success: false, error: 'Missing required email fields.' };
  }

  const trackLink = `${CONFIG.SITE_URL}/track?code=${encodeURIComponent(submissionCode)}&email=${encodeURIComponent(writerEmail)}`;
  const safeTitle = novelTitle || 'your novel';

  let subject, html;

  switch (emailType) {
    case 'received': {
      // New subject format: title-first, code kept for reference
      subject = `Your Submission of "${safeTitle}" Received — ${submissionCode}`;

      const missingFilesNote = missingFiles
        ? `
          <div style="background:#FDEDEC; border-left:4px solid #DC2626; padding:14px 16px; margin:16px 0; border-radius:6px;">
            <strong>Please note:</strong> We couldn't upload your ${escapeHtml(missingFiles)}. 
            Please email it directly to ${CONFIG.SUPPORT_EMAIL} along with your Submission ID: 
            <strong>${escapeHtml(submissionCode)}</strong>.
          </div>
        `
        : '';

      let headingUrduText = 'آپ کی تحریر موصول ہو گئی';
      if (body.episodeCount === 1 || body.episodeCount === "1") {
        headingUrduText = 'آپ کے ناول کی 1 قسط موصول ہو گئی ہے';
      } else if (body.episodeCount > 1) {
        headingUrduText = `آپ کے ناول کی ${body.episodeCount} اقساط موصول ہو گئی ہیں`;
      }

      html = buildEmailTemplate({
        heading: `Your Submission of "${escapeHtml(safeTitle)}" is Received`,
        headingUrdu: headingUrduText,
        body: `
          <p>Dear ${escapeHtml(writerName || 'Writer')},</p>
          <p>Thank you for submitting <strong>${escapeHtml(safeTitle)}</strong> to Urdu Novel Bank. 
          We have received your manuscript and it will now go through our review process.</p>
          <p style="margin-bottom:6px;"><strong>Your Submission ID:</strong></p>
          <div style="font-size:20px; font-weight:bold; color:${CONFIG.BRAND_PRIMARY}; margin:4px 0 16px 0;">
            ${escapeHtml(submissionCode)}
          </div>
          ${missingFilesNote}
          <p>Please save this ID — you'll need it to track your submission's progress.</p>
        `,
        bodyUrdu: 'براہِ کرم اپنی سبمیشن آئی ڈی محفوظ کریں، آپ اپنی تحریر کی صورتحال ٹریک کرنے کے لیے اسے استعمال کر سکتے ہیں۔',
        duaUrdu: 'دعا ہے کہ اللہ تعالیٰ آپ کے قلم کو مزید طاقت دے اور آپ کی یہ کہانی جلد ہی قارئین کے دلوں میں گھر کر جائے۔ آمین۔',
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
          <strong>${escapeHtml(safeTitle)}</strong> (${escapeHtml(submissionCode)}).</p>
          ${statusNote ? `
            <div style="background:${CONFIG.BG_CREAM}; border-left:4px solid ${CONFIG.BRAND_ACCENT}; padding:14px 16px; margin:16px 0; border-radius:6px;">
              ${escapeHtml(statusNote)}
            </div>
          ` : ''}
          <p>Please visit your tracking page to respond.</p>
        `,
        bodyUrdu: 'براہِ کرم اپنی تحریر کی صورتحال دیکھنے کے لیے ٹریکنگ صفحہ ملاحظہ کریں۔',
        duaUrdu: 'دعا ہے کہ یہ مرحلہ آپ کے لیے آسان ہو، اور اللہ تعالیٰ آپ کی محنت کو بہترین نتیجے سے نوازے۔ آمین۔',
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
          <strong>${escapeHtml(safeTitle)}</strong> (${escapeHtml(submissionCode)}) at this time.</p>
          ${statusNote ? `
            <div style="background:${CONFIG.BG_CREAM}; border-left:4px solid #999; padding:14px 16px; margin:16px 0; border-radius:6px;">
              ${escapeHtml(statusNote)}
            </div>
          ` : ''}
          <p>You're welcome to revise and submit again in the future. Thank you for considering Urdu Novel Bank.</p>
        `,
        bodyUrdu: 'آپ مستقبل میں نظرثانی کے بعد دوبارہ جمع کروا سکتے ہیں۔',
        duaUrdu: 'دعا ہے کہ اللہ تعالیٰ آپ کو مزید بہتر لکھنے کی توفیق دے، اور آپ کی اگلی تحریر کامیابی سے ہمکنار ہو۔ آمین۔',
        ctaText: 'View Details',
        ctaLink: trackLink
      });
      break;

    case 'published':
      subject = `🎉 Your Novel "${safeTitle}" is Published! — ${submissionCode}`;
      html = buildEmailTemplate({
        heading: '🎉 Congratulations! Your Novel is Published',
        headingUrdu: 'مبارک ہو! آپ کا ناول شائع ہو گیا',
        body: `
          <p>Dear ${escapeHtml(writerName || 'Writer')},</p>
          <p>We're excited to let you know that <strong>${escapeHtml(safeTitle)}</strong> 
          is now published on Urdu Novel Bank!</p>
        `,
        bodyUrdu: 'ہمیں خوشی ہے کہ آپ کا ناول اردو ناول بینک پر شائع ہو گیا ہے۔',
        duaUrdu: 'دعا ہے کہ اللہ تعالیٰ آپ کے قلم میں مزید برکت دے، آپ کی کہانی زیادہ سے زیادہ دلوں تک پہنچے، اور آپ کو لکھنے کی مسلسل توفیق اور خوشی عطا فرمائے۔ آمین۔',
        ctaText: 'Track Submission',
        ctaLink: trackLink
      });
      break;

    case 'episodes_added':
      subject = `New Episodes Added — ${submissionCode}`;
      html = buildEmailTemplate({
        heading: 'New Episodes Received',
        headingUrdu: 'نئی اقساط موصول ہو گئیں',
        body: `
          <p>Dear ${escapeHtml(writerName || 'Writer')},</p>
          <p>Thank you for submitting new episodes for your ongoing novel <strong>${escapeHtml(safeTitle)}</strong>.</p>
          <p>We have successfully received the new episodes. Your submission now has a total of <strong>${body.episodeCount || ''}</strong> episodes.</p>
          <p>You can track the status of your submission using your Submission ID: <strong>${escapeHtml(submissionCode)}</strong>.</p>
        `,
        bodyUrdu: 'آپ کی نئی اقساط ہمیں موصول ہو گئی ہیں، شکریہ۔',
        duaUrdu: 'دعا ہے کہ اللہ تعالیٰ آپ کے قلم میں تسلسل اور برکت عطا فرمائے، اور آپ کی کہانی مسلسل بہتری کی طرف بڑھتی رہے۔ آمین۔',
        ctaText: 'Track Your Submission',
        ctaLink: trackLink
      });
      break;

    case 'episodes_published': {
      const epNumsStr = body.episodeNumbers || "";
      const epCount = epNumsStr.split(',').length;
      const isSingular = epCount === 1;

      subject = isSingular 
        ? `🎉 New Episode of "${safeTitle}" Published! — ${submissionCode}` 
        : `🎉 New Episodes of "${safeTitle}" Published! — ${submissionCode}`;

      html = buildEmailTemplate({
        heading: isSingular ? '🎉 New Episode Is Live' : '🎉 New Episodes Are Live',
        headingUrdu: isSingular ? 'نئی قسط شائع ہو گئی' : 'نئی اقساط شائع ہو گئیں',
        body: `
          <p>Dear ${escapeHtml(writerName || 'Writer')},</p>
          <p>We're excited to let you know that ${isSingular ? `episode ${escapeHtml(epNumsStr)}` : `episodes ${escapeHtml(epNumsStr)}`} of 
          <strong>${escapeHtml(safeTitle)}</strong> ${isSingular ? 'is' : 'are'} now published on Urdu Novel Bank!</p>
        `,
        bodyUrdu: isSingular 
          ? `ہمیں خوشی ہے کہ آپ کے ناول کی قسط نمبر ${escapeHtml(epNumsStr)} اردو ناول بینک پر شائع ہو گئی ہے۔`
          : 'ہمیں خوشی ہے کہ آپ کے ناول کی مزید اقساط اردو ناول بینک پر شائع ہو گئی ہیں۔',
        duaUrdu: 'دعا ہے کہ آپ کی یہ اقساط قارئین کے دلوں میں جگہ بنائیں، اور اللہ تعالیٰ آپ کے تخلیقی سفر کو مزید کامیابیوں سے نوازے۔ آمین۔',
        ctaText: publishedUrl ? 'View Your Novel' : 'Track Submission',
        ctaLink: publishedUrl || trackLink
      });
      break;
    }

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

// ── EMAIL TEMPLATE BUILDER (v2 — mobile-first, social links, dua) ────
function buildEmailTemplate({ heading, headingUrdu, body, bodyUrdu, duaUrdu, ctaText, ctaLink }) {
  const socialBadge = (label, url, color) => `
    <a href="${url}" style="display:inline-block; margin:4px 6px; padding:8px 14px; background:#FFFCF5; border:1px solid #E8D9BE; border-radius:20px; color:${color}; text-decoration:none; font-size:12px; font-family: Georgia, 'Times New Roman', serif;">
      ${label}
    </a>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @media only screen and (max-width: 480px) {
    .unb-container { width: 100% !important; border-radius: 0 !important; }
    .unb-padded { padding: 22px 18px !important; }
    .unb-header-padded { padding: 20px 18px !important; }
    .unb-cta { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    .unb-heading { font-size: 20px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:${CONFIG.BG_CREAM};">

<div style="font-family: Georgia, 'Times New Roman', serif; background:${CONFIG.BG_CREAM}; padding:24px 12px;">
  <div class="unb-container" style="max-width:560px; margin:0 auto; background:#FFFCF5; border-radius:10px; overflow:hidden; border:1px solid #E8D9BE;">

    <!-- Header -->
    <div class="unb-header-padded" style="background:${CONFIG.BRAND_PRIMARY}; padding:24px 32px;">
      <div style="color:#fff; font-size:19px; font-weight:bold;">📖 Urdu Novel Bank</div>
      <div style="color:${CONFIG.BRAND_ACCENT}; font-size:12px; margin-top:2px;">Writer &amp; Publication Portal</div>
    </div>

    <!-- Body -->
    <div class="unb-padded" style="padding:30px 32px;">
      <h1 class="unb-heading" style="font-size:22px; color:${CONFIG.TEXT_PRIMARY}; margin:0 0 6px 0; line-height:1.3;">${heading}</h1>
      <div dir="rtl" style="font-size:16px; color:${CONFIG.BRAND_PRIMARY}; margin:0 0 20px 0; font-family: 'Noto Nastaliq Urdu', serif; line-height:1.9;">
        ${headingUrdu}
      </div>

      <div style="font-size:15px; line-height:1.75; color:${CONFIG.TEXT_PRIMARY};">
        ${body}
      </div>

      <div dir="rtl" style="font-size:14px; color:#6B5842; margin-top:14px; font-family: 'Noto Nastaliq Urdu', serif; line-height:1.9;">
        ${bodyUrdu}
      </div>

      <!-- Dua -->
      ${duaUrdu ? `
      <div dir="rtl" style="margin-top:22px; background:${CONFIG.BG_CREAM}; border:1px solid #E8D9BE; border-radius:8px; padding:16px 18px; font-family: 'Noto Nastaliq Urdu', serif; font-size:15px; color:${CONFIG.BRAND_SECONDARY}; line-height:2;">
        🤲 ${duaUrdu}
      </div>
      ` : ''}

      <!-- CTA Button -->
      <div style="text-align:center; margin-top:28px;">
        <a href="${ctaLink}" class="unb-cta" style="background:${CONFIG.BRAND_PRIMARY}; color:#fff; text-decoration:none; padding:14px 36px; border-radius:8px; font-size:15px; font-weight:bold; display:inline-block; letter-spacing:0.3px; box-shadow:0 2px 6px rgba(159,84,5,0.35);">
          ${ctaText} →
        </a>
      </div>

      <!-- Instagram quick-question line -->
      <div style="text-align:center; margin-top:26px; padding-top:20px; border-top:1px solid #E8D9BE;">
        <p style="font-size:13px; color:#6B5842; margin:0 0 10px 0;">
          Have a quick question? Message us on Instagram — we're happy to help.
        </p>
        <a href="${CONFIG.SOCIAL.instagram}" style="display:inline-block; padding:8px 18px; background:${CONFIG.BRAND_ACCENT}; color:#fff; text-decoration:none; border-radius:20px; font-size:13px; font-weight:bold;">
          📷 Message us on Instagram
        </a>
      </div>

      <!-- Social row -->
      <div style="text-align:center; margin-top:22px;">
        ${socialBadge('📘 Facebook', CONFIG.SOCIAL.facebook, CONFIG.BRAND_SECONDARY)}
        ${socialBadge('💬 WhatsApp', CONFIG.SOCIAL.whatsapp, CONFIG.BRAND_SECONDARY)}
        ${socialBadge('📌 Pinterest', CONFIG.SOCIAL.pinterest, CONFIG.BRAND_SECONDARY)}
        ${socialBadge('▶️ YouTube', CONFIG.SOCIAL.youtube, CONFIG.BRAND_SECONDARY)}
      </div>
    </div>

    <!-- Footer -->
    <div style="background:${CONFIG.BRAND_SECONDARY}; padding:18px 32px; text-align:center;">
      <div style="color:#D9C6AC; font-size:12px;">
        © ${new Date().getFullYear()} Urdu Novel Bank &nbsp;•&nbsp; 
        <a href="${CONFIG.MAIN_SITE_URL}" style="color:${CONFIG.BRAND_ACCENT};">urdunovelbanks.com</a>
      </div>
    </div>

  </div>
</div>

</body>
</html>
  `;
}

// ── PART 3: AUTO-PUBLISH CHECKER ──────────────────────────────
function checkAndSendAutoPublishNotifications() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty('SUPABASE_URL');
  const supabaseAnonKey = props.getProperty('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in Script Properties. Aborting auto-publish check.');
    return;
  }

  const baseOptions = {
    method: 'post',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({}),
    muteHttpExceptions: true
  };

  let completeFoundCount = 0;
  let completeSuccessCount = 0;
  let completeFailCount = 0;

  const endpointComplete = `${supabaseUrl}/rest/v1/rpc/auto_publish_due_submissions`;
  let responseComplete;
  try {
    responseComplete = UrlFetchApp.fetch(endpointComplete, baseOptions);
  } catch (err) {
    console.error('Failed to call Supabase RPC (auto_publish_due_submissions):', err);
  }

  if (responseComplete) {
    if (responseComplete.getResponseCode() === 200) {
      let publishedSubmissions = [];
      try {
        publishedSubmissions = JSON.parse(responseComplete.getContentText());
      } catch (err) {
        console.error('Failed to parse Supabase JSON response (Complete):', err);
      }

      if (Array.isArray(publishedSubmissions) && publishedSubmissions.length > 0) {
        completeFoundCount = publishedSubmissions.length;
        for (const sub of publishedSubmissions) {
          try {
            const emailBody = {
              emailType: 'published',
              writerEmail: sub.writer_email,
              writerName: sub.writer_name,
              novelTitle: sub.novel_title,
              submissionCode: sub.submission_code,
              publishedUrl: sub.published_url
            };
            
            const emailResult = handleSendEmail(emailBody);
            
            if (emailResult.success) {
              completeSuccessCount++;
              console.log(`Successfully sent published email for ${sub.submission_code}`);
            } else {
              completeFailCount++;
              console.error(`Failed to send published email for ${sub.submission_code}: ${emailResult.error}`);
            }
          } catch (err) {
            completeFailCount++;
            console.error(`Exception while sending email for ${sub.submission_code}:`, err);
          }
        }
      }
    } else {
      console.error(`Supabase RPC error Complete (${responseComplete.getResponseCode()}): ${responseComplete.getContentText()}`);
    }
  }

  let episodeFoundCount = 0;
  let episodeSuccessCount = 0;
  let episodeFailCount = 0;

  const endpointEpisodes = `${supabaseUrl}/rest/v1/rpc/auto_publish_due_episodes`;
  let responseEpisodes;
  try {
    responseEpisodes = UrlFetchApp.fetch(endpointEpisodes, baseOptions);
  } catch (err) {
    console.error('Failed to call Supabase RPC (auto_publish_due_episodes):', err);
  }

  if (responseEpisodes) {
    if (responseEpisodes.getResponseCode() === 200) {
      let publishedEpisodes = [];
      try {
        publishedEpisodes = JSON.parse(responseEpisodes.getContentText());
      } catch (err) {
        console.error('Failed to parse Supabase JSON response (Episodes):', err);
      }

      if (Array.isArray(publishedEpisodes) && publishedEpisodes.length > 0) {
        episodeFoundCount = publishedEpisodes.length;
        for (const sub of publishedEpisodes) {
          try {
            const emailBody = {
              emailType: 'episodes_published',
              writerEmail: sub.writer_email,
              writerName: sub.writer_name,
              novelTitle: sub.novel_title,
              submissionCode: sub.submission_code,
              publishedUrl: sub.published_url,
              episodeNumbers: sub.episode_numbers
            };
            
            const emailResult = handleSendEmail(emailBody);
            
            if (emailResult.success) {
              episodeSuccessCount++;
              console.log(`Successfully sent episodes_published email for ${sub.submission_code} (episodes: ${sub.episode_numbers})`);
            } else {
              episodeFailCount++;
              console.error(`Failed to send episodes_published email for ${sub.submission_code}: ${emailResult.error}`);
            }
          } catch (err) {
            episodeFailCount++;
            console.error(`Exception while sending episodes_published email for ${sub.submission_code}:`, err);
          }
        }
      }
    } else {
      console.error(`Supabase RPC error Episodes (${responseEpisodes.getResponseCode()}): ${responseEpisodes.getContentText()}`);
    }
  }

  if (completeFoundCount === 0 && episodeFoundCount === 0) {
    console.log('No due submissions or episodes found for auto-publishing.');
  } else {
    console.log(`Auto-publish summary: Complete novels — Found ${completeFoundCount}, Sent ${completeSuccessCount}, Failed ${completeFailCount}. Episodes — Found ${episodeFoundCount}, Sent ${episodeSuccessCount}, Failed ${episodeFailCount}.`);
  }
}