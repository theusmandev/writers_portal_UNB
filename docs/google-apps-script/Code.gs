/**
 * Urdu Novel Bank — Writer Portal backend (Google Apps Script)
 * ------------------------------------------------------------
 * Deploy: Extensions > Apps Script from your portal spreadsheet, paste this
 * file, then Deploy > New deployment > Web app
 *   Execute as:  Me
 *   Access:      Anyone
 * Copy the /exec URL into the frontend env var VITE_PORTAL_API_URL.
 *
 * Sheets required (tab names must match): Writers, Submissions, StatusHistory,
 * Policies, Timelines, FAQs.  Column order is documented in docs/DATA-MODEL.md.
 */

var CONFIG = {
  SHEET_ID: 'PUT_YOUR_SPREADSHEET_ID_HERE',
  DRIVE_ROOT_ID: 'PUT_YOUR_WRITER_PORTAL_FOLDER_ID_HERE',
  ADMIN_TOKEN: 'PUT_A_LONG_RANDOM_STRING_HERE', // required for admin actions
  NOTIFY_FROM_NAME: 'Urdu Novel Bank',
};

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function ss_() {
  return SpreadsheetApp.openById(CONFIG.SHEET_ID);
}

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet: ' + name);
  return sh;
}

function rows_(name) {
  var values = sheet_(name).getDataRange().getValues();
  var header = values.shift();
  return values.map(function (row) {
    var obj = {};
    header.forEach(function (key, i) {
      obj[String(key)] = row[i];
    });
    return obj;
  });
}

/** ---------------------------- GET endpoints ---------------------------- */
function doGet(e) {
  try {
    var action = (e.parameter.action || '').toLowerCase();
    if (action === 'policies') return json_({ success: true, data: rows_('Policies') });
    if (action === 'timeline') return json_({ success: true, data: rows_('Timelines') });
    if (action === 'faqs') return json_({ success: true, data: rows_('FAQs') });
    if (action === 'track')
      return json_(track_(e.parameter.submissionId, e.parameter.email));
    return json_({ success: false, message: 'Unknown action.' });
  } catch (err) {
    return json_({ success: false, message: 'Server error: ' + err.message });
  }
}

/** --------------------------- POST endpoints ---------------------------- */
function doPost(e) {
  try {
    var action = (e.parameter.action || '').toLowerCase();
    var body = JSON.parse(e.postData.contents || '{}');
    if (action === 'submit') return json_(submit_(body));
    if (action === 'track') return json_(track_(body.submissionId, body.email));
    if (action === 'admin/status') return json_(adminStatus_(body));
    return json_({ success: false, message: 'Unknown action.' });
  } catch (err) {
    return json_({ success: false, message: 'Server error: ' + err.message });
  }
}

/** ------------------------------ Submission ----------------------------- */
function nextSubmissionId_() {
  var year = new Date().getFullYear();
  var ids = sheet_('Submissions').getDataRange().getValues().slice(1);
  var count = 0;
  ids.forEach(function (r) {
    if (String(r[0]).indexOf('UNB-' + year + '-') === 0) count++;
  });
  return 'UNB-' + year + '-' + ('0000' + (count + 1)).slice(-4);
}

function folderFor_(year, submissionId) {
  var root = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_ID);
  var subs = getOrCreate_(root, 'Submissions');
  var yearFolder = getOrCreate_(subs, String(year));
  return getOrCreate_(yearFolder, submissionId);
}

function getOrCreate_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function saveFile_(folder, file) {
  if (!file || !file.data) return { id: '', url: '' };
  var blob = Utilities.newBlob(
    Utilities.base64Decode(file.data),
    file.mimeType || 'application/octet-stream',
    file.name
  );
  var saved = folder.createFile(blob);
  return { id: saved.getId(), url: saved.getUrl() };
}

function submit_(b) {
  var required = ['fullName', 'penName', 'email', 'whatsapp', 'novelTitle', 'genre', 'synopsis'];
  for (var i = 0; i < required.length; i++) {
    if (!b[required[i]]) return { success: false, message: 'Missing field: ' + required[i] };
  }
  if (!/^\S+@\S+\.\S+$/.test(b.email)) return { success: false, message: 'Invalid email address.' };

  var existing = rows_('Submissions');
  var duplicate = existing.some(function (r) {
    return (
      String(r['Email']).toLowerCase() === String(b.email).toLowerCase() &&
      String(r['Novel Title']).trim().toLowerCase() === String(b.novelTitle).trim().toLowerCase()
    );
  });
  if (duplicate) return { success: false, message: 'This novel has already been submitted from this email.' };

  var now = new Date();
  var id = nextSubmissionId_();
  var folder = folderFor_(now.getFullYear(), id);
  var manuscript = saveFile_(folder, b.manuscript);
  var cover = saveFile_(folder, b.cover);

  var writerId = upsertWriter_(b, now);

  sheet_('Submissions').appendRow([
    id, writerId, b.fullName, b.email, b.novelTitle, b.genre, b.novelStatus || '',
    b.synopsis, b.wordCount || '', manuscript.id, manuscript.url, cover.id,
    now, 'Received', 'Submission Confirmation', now, '',
  ]);
  sheet_('StatusHistory').appendRow([id, '', 'Received', 'system', now, 'Submission received']);

  sendMail_(
    b.email,
    'Submission received — ' + id,
    'Assalam-o-Alaikum ' + b.penName + ',\n\n' +
      'Your novel "' + b.novelTitle + '" has been received.\n\n' +
      'Submission ID: ' + id + '\n\n' +
      'Please save this ID. You can track your submission any time on the writer portal.\n\n' +
      CONFIG.NOTIFY_FROM_NAME
  );

  return {
    success: true,
    data: {
      submissionId: id,
      email: b.email,
      novelTitle: b.novelTitle,
      penName: b.penName,
      genre: b.genre,
      submittedAt: now.toISOString(),
      lastUpdated: now.toISOString(),
      status: 'Received',
      stage: 'Submission Confirmation',
    },
  };
}

function upsertWriter_(b, now) {
  var sh = sheet_('Writers');
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][3]).toLowerCase() === String(b.email).toLowerCase()) return data[i][0];
  }
  var writerId = 'W-' + ('0000' + data.length).slice(-4);
  sh.appendRow([writerId, b.fullName, b.penName, b.email, b.whatsapp, b.bio || '', now, 'Active']);
  return writerId;
}

/** ------------------------------- Tracking ------------------------------ */
function track_(submissionId, email) {
  if (!submissionId || !email) return { success: false, message: 'Submission ID and email are required.' };
  var match = rows_('Submissions').filter(function (r) {
    return (
      String(r['Submission ID']).trim().toUpperCase() === String(submissionId).trim().toUpperCase() &&
      String(r['Email']).trim().toLowerCase() === String(email).trim().toLowerCase()
    );
  })[0];
  if (!match) return { success: false, message: 'No submission matches that ID and email address.' };
  return {
    success: true,
    data: {
      submissionId: match['Submission ID'],
      email: match['Email'],
      novelTitle: match['Novel Title'],
      penName: match['Writer Name'],
      genre: match['Genre'],
      submittedAt: new Date(match['Submission Date']).toISOString(),
      lastUpdated: new Date(match['Last Updated'] || match['Submission Date']).toISOString(),
      status: match['Current Status'],
      stage: match['Current Stage'],
    },
  };
}

/** -------------------------------- Admin -------------------------------- */
function adminStatus_(b) {
  if (b.token !== CONFIG.ADMIN_TOKEN) return { success: false, message: 'Unauthorized.' };
  var sh = sheet_('Submissions');
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(b.submissionId)) {
      var oldStatus = data[i][13];
      sh.getRange(i + 1, 14).setValue(b.status);
      sh.getRange(i + 1, 15).setValue(b.stage || data[i][14]);
      sh.getRange(i + 1, 16).setValue(new Date());
      if (b.adminNote) sh.getRange(i + 1, 17).setValue(b.adminNote);
      sheet_('StatusHistory').appendRow([
        b.submissionId, oldStatus, b.status, b.changedBy || 'admin', new Date(), b.comment || '',
      ]);
      if (b.notify) {
        sendMail_(
          data[i][3],
          'Submission update — ' + b.submissionId,
          'Your submission status has been updated.\n\nPrevious status: ' + oldStatus +
            '\nNew status: ' + b.status + '\n\n' + (b.comment || '') + '\n\n' + CONFIG.NOTIFY_FROM_NAME
        );
      }
      return { success: true, data: { submissionId: b.submissionId, status: b.status } };
    }
  }
  return { success: false, message: 'Submission not found.' };
}

function sendMail_(to, subject, body) {
  try {
    MailApp.sendEmail({ to: to, subject: subject, body: body, name: CONFIG.NOTIFY_FROM_NAME });
  } catch (err) {
    // Never fail a submission because email quota was exhausted.
    Logger.log('Mail failed: ' + err.message);
  }
}