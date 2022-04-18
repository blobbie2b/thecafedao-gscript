function getEnvironment() {
  var environment = {
    spreadsheetID: "",
    firebaseUrl: "",
    trackingSheetName: "",
    surveyResponsesSheetName: "",
  };
  return environment;
}

// Creates a Google Sheets on change trigger for the specific sheet
function createSpreadsheetEditTrigger(sheetID) {
  var triggers = ScriptApp.getProjectTriggers();
  var triggerExists = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getTriggerSourceId() == sheetID) {
      triggerExists = true;
      break;
    }
  }

  if (!triggerExists) {
    var spreadsheet = SpreadsheetApp.openById(sheetID);
    ScriptApp.newTrigger("importSheet")
      .forSpreadsheet(spreadsheet)
      .onEdit()
      .create();
    ScriptApp.newTrigger("latestSignup")
      .forSpreadsheet(spreadsheet)
      .onFormSubmit()
      .create();
  }
}

// Delete all the existing triggers for the project
function deleteTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}

// Initialize
function initialize(e) {
  writeDataToFirebase();
}

// Write the data to the Firebase URL
function writeDataToFirebase() {
  const env = getEnvironment();
  var ss = SpreadsheetApp.openById(env.spreadsheetID);
  SpreadsheetApp.setActiveSpreadsheet(ss);
  createSpreadsheetEditTrigger(env.spreadsheetID);
  
  // Only get changes from trackingSheetName. There is a better way to do this
  var sheet = ss.getSheets().find(sheet => env.trackingSheetName === sheet.getSheetName())
  importSheet(sheet);
  SpreadsheetApp.setActiveSheet(sheet);

}

// A utility function to generate nested object when
// given a keys in array format
function assign(obj, keyPath, value) {
  lastKeyIndex = keyPath.length - 1;
  for (var i = 0; i < lastKeyIndex; ++i) {
    key = keyPath[i];
    if (!(key in obj)) obj[key] = {};
    obj = obj[key];
  }
  obj[keyPath[lastKeyIndex]] = value;
}

// Import each sheet when there is a change
function importSheet() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var name = sheet.getName();
  
  // Columns of interest
  var data = sheet.getRange(`${getEnvironment().trackingSheetName}!B:J`).getValues()

  var dataToImport = {};

  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === '') continue
    dataToImport[data[i][1]] = {};
    for (var j = 0; j < data[0].length; j++) {
      assign(dataToImport[data[i][1]], data[0][j].split("__"), data[i][j]);
    }
  }

  var token = ScriptApp.getOAuthToken();
  var firebaseUrl =
    getEnvironment().firebaseUrl + sheet.getParent().getId() + "/" + name;
  FirebaseApp.getDatabaseByUrl(firebaseUrl, token).setData("", dataToImport);
}

// Triggered on form submit
function latestSignup() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getRange(`${getEnvironment().surveyResponsesSheetName}!C:C`).getValues()
  
  // Get non-blank there is a better way to do this
  var filtered = data.reduce((prev, curr) => {
    const x = curr[0]
    if (x !== '') {
      prev.push(x)
    }
    return prev
  }, [])
  
  var token = ScriptApp.getOAuthToken();
  var firebaseUrl =
    getEnvironment().firebaseUrl + sheet.getParent().getId() + "/" + "latestSignup";
  FirebaseApp.getDatabaseByUrl(firebaseUrl, token).setData("", filtered[filtered.length - 1]);
}
