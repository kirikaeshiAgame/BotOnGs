const token = "8098811360:AAEnxdEj22QzYh_F4h42atVjZzci5qUXF_w";
const SsId = "1sTzZ33Voo0svBLo6fRbK-YecqNQuKy5Zyay6opHNJO8";
const DebugSheetId = 110720766;
const QuestionSheetId = 0;
// const LastColumn = 4;
const LastColumn = getLastColumn(QuestionSheetId) - 1;

function start() {
  let webAppUrl = 'https://script.google.com/macros/s/AKfycbzIFp8rCeDz2rJXgIbF3ikyfNBTqhqQzECdwyIB-nz1haBGZhry7D2cOJJJaFI0xQg/exec';
  var url = `https://api.telegram.org/bot${token}/setWebhook?url=${webAppUrl}`;
  console.log(url);
  let resp = UrlFetchApp.fetch(url);
  console.log(resp.getContentText());
}

// Функция для определения количества вопросов (последнего заполненного столбца)
function getLastColumn(sheetId) {
  const sheet = getSheetById(sheetId);
  const firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; // Берем первую строку
  let lastColumn = 0;
  for (let i = 0; i < firstRow.length; i++) {
    if (firstRow[i] !== "") { // Проверяем, что ячейка не пустая
      lastColumn = i;
    }
  }
  return lastColumn;
}

const token = "";
const SsId = "";
const DebugSheetId = ;
const QuestionSheetId = 0;
// const LastColumn = 4;
const LastColumn = getLastColumn(QuestionSheetId) - 1;

function start() {
  let webAppUrl = '';
  var url = ``;
  console.log(url);
  let resp = UrlFetchApp.fetch(url);
  console.log(resp.getContentText());
}

// Функция для определения количества вопросов (последнего заполненного столбца)
function getLastColumn(sheetId) {
  const sheet = getSheetById(sheetId);
  const firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; // Берем первую строку
  let lastColumn = 0;
  for (let i = 0; i < firstRow.length; i++) {
    if (firstRow[i] !== "") { // Проверяем, что ячейка не пустая
      lastColumn = i;
    }
  }
  return lastColumn;
}
