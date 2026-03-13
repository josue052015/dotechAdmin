/**
 * Google Apps Script Backend Proxy for OrderFlow Admin
 * 
 * Deployment Instructions:
 * 1. Open your target Google Spreadsheet.
 * 2. Go to Extensions > App Script.
 * 3. Paste this code and save.
 * 4. Click 'Deploy' > 'New Deployment'.
 * 5. Select 'Web App'.
 * 6. Execute as: 'User accessing the web app'.
 * 7. Who has access: 'Anyone with Google account'.
 * 8. Copy the Web App URL and update your Angular environment.
 */

const AUTHORIZED_OWNER = Session.getEffectiveUser().getEmail();

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const currentUser = Session.getActiveUser().getEmail();
  
  // Security Check: Only the spreadsheet owner can execute operations
  if (currentUser !== AUTHORIZED_OWNER) {
    return ContentService.createTextOutput(JSON.stringify({
      error: 'Unauthorized',
      message: 'Access restricted to spreadsheet owner only.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const action = e.parameter.action;
  const sheetName = e.parameter.sheet;
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    return errorResponse('Sheet not found: ' + sheetName);
  }

  try {
    switch (action) {
      case 'read':
        return readRange(sheet, e.parameter.range);
      case 'append':
        return appendRow(sheet, JSON.parse(e.postData.contents).values);
      case 'update':
        return updateRow(sheet, e.parameter.range, JSON.parse(e.postData.contents).values);
      default:
        return errorResponse('Invalid action');
    }
  } catch (err) {
    return errorResponse(err.message);
  }
}

function readRange(sheet, range) {
  const data = sheet.getRange(range).getValues();
  return successResponse({ values: data });
}

function appendRow(sheet, values) {
  sheet.appendRow(values[0]);
  return successResponse({ status: 'success' });
}

function updateRow(sheet, range, values) {
  sheet.getRange(range).setValues(values);
  return successResponse({ status: 'success' });
}

function successResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({ error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}
