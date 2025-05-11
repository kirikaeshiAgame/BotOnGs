function getSheetById(id) {
  return SpreadsheetApp.openById(SsId).getSheets().filter(
    function(s) { return s.getSheetId() == id; }
  )[0];
}

function sendText(chat_id, text, keyBoard) {
  let data = {
    method: 'post',
    payload: {
      method: 'sendMessage',
      chat_id: String(chat_id),
      text: text,
      parse_mode: 'HTML',
      reply_markup: JSON.stringify(keyBoard),
      link_preview_options: JSON.stringify({ is_disabled: true })
    },
    muteHttpExceptions: true
  };
  return JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/ ', data));
}



// Функция для получения или создания страницы пользователя
function getOrCreateUserSheet(chat_id) {
  const spreadsheet = SpreadsheetApp.openById(SsId); // Основная таблица
  const sheetName = `User_${chat_id}`; // Уникальное имя страницы
  let userSheet = spreadsheet.getSheetByName(sheetName);
  if (!userSheet) {
    userSheet = spreadsheet.insertSheet(sheetName);
    
    // --- Создаем финансовую таблицу (фиксированный формат) ---
    // Фиксированные категории для первой колонки
    const categories = ["Краткосрочные", "Среднесрочные", "Долгосрочные", "кредиты", "благотворительность", "приход"];
    
    // Получаем динамические данные для финансовой таблицы из вопросного листа
    const financialData = getFinancialData(chat_id);
    
    // Записываем категории и соответствующие числа, полученные из расчёта
    for (let i = 0; i < categories.length; i++) {
      userSheet.getRange(i + 1, 1).setValue(categories[i]);
      userSheet.getRange(i + 1, 2).setValue(financialData[categories[i]] || 0);
    }
    // Применяем форматирование к финансовой таблице (A1:B6)
    let financeRange = userSheet.getRange(1, 1, 6, 2);
    financeRange.setFontFamily("Arial")
                .setFontSize(11)
                .setHorizontalAlignment("center")
                .setBorder(true, true, true, true, true, true);
    // Оформляем первую колонку (категории)
    let catRange = userSheet.getRange(1, 1, 6, 1);
    catRange.setFontWeight("bold").setBackground("#d9d9d9");
    // Оформляем вторую колонку (значения)
    let valueRange = userSheet.getRange(1, 2, 6, 1);
    valueRange.setBackground("#e6f2ff").setNumberFormat("#,##0.00");
    
    // Добавляем пустую строку в качестве разделителя (например, строка 7)
    userSheet.insertRowAfter(6);
    
    // --- Создаем раздел для логирования сообщений ---
    // Заголовки для логов разместим, например, начиная с 8-й строки
    const headers = ["Timestamp", "User ID", "Message", "Message Type", "Additional Info", "Processed"];
    userSheet.getRange(8, 1, 1, headers.length).setValues([headers]);
    // Применяем стили к заголовкам логов
    const headerRange = userSheet.getRange(8, 1, 1, headers.length);
    headerRange.setFontWeight("bold")
      .setFontSize(12)
      .setHorizontalAlignment("center")
      .setBackground("#f4f4f4")
      .setBorder(true, true, true, true, true, true);
    // Дополнительное форматирование для остальных столбцов логов
    userSheet.setColumnWidth(3, 300); // Message
    userSheet.setColumnWidth(4, 150); // Message Type
    userSheet.setColumnWidth(5, 200); // Additional Info
    userSheet.setColumnWidth(6, 100); // Processed
    
    // Фиксируем строку с заголовками логов (8-я строка)
    userSheet.setFrozenRows(8);
  }
  return userSheet;
}

// Функция для получения настоящих финансовых данных из вопросного листа
// Сканирует вопросный лист (QuestionSheetId), находит строку с ответами для chat_id
// и суммирует значения по категориям в зависимости от тегов в заголовках
function getFinancialData(chat_id) {
  var sumShort = 0;
  var sumMid = 0;
  var sumLong = 0;
  var sumCredit = 0;
  var sumCharity = 0;
  var sumIncome = 0;
  
  // Получаем данные из вопросного листа
  var questionSheet = getSheetById(QuestionSheetId);
  var allData = questionSheet.getDataRange().getDisplayValues();
  var userRowIndex = -1;
  for (var i = 1; i < allData.length; i++) {
    if (allData[i][0] == chat_id) {
      userRowIndex = i;
      break;
    }
  }
  if (userRowIndex === -1) {
    // Если данных нет, возвращаем нули для всех категорий
    return {
      "Краткосрочные": 0,
      "Среднесрочные": 0,
      "Долгосрочные": 0,
      "кредиты": 0,
      "благотворительность": 0,
      "приход": 0
    };
  }
  
  var headers = allData[0];
  var userData = allData[userRowIndex];
  // Проходим по всем столбцам, начиная со второго (индекс 1), так как первый – chat_id
  for (var col = 1; col < headers.length; col++) {
    var header = headers[col];
    var answer = parseFloat(userData[col]);
    if (isNaN(answer)) continue;
    if (header.indexOf("(КраткосрочныйРасход)") !== -1) {
      sumShort += answer;
    } else if (header.indexOf("(СреднесрочныйРасход)") !== -1) {
      sumMid += answer;
    } else if (header.indexOf("(ДолгосрочныйРасход)") !== -1) {
      sumLong += answer;
    } else if (header.indexOf("(долг)") !== -1) {
      sumCredit += answer;
    } else if (header.indexOf("(благотворительность)") !== -1) {
      sumCharity += answer;
    } else if (header.indexOf("(доход)") !== -1) {
      sumIncome += answer;
    }
  }
  var totalIncome = sumShort + sumMid + sumLong;
  return {
    "Краткосрочные": sumShort,
    "Среднесрочные": sumMid,
    "Долгосрочные": sumLong,
    "кредиты": sumCredit,
    "благотворительность": sumCharity,
    "приход": totalIncome,
    "Общий доход": sumIncome
  };
}

// Функция обновления финансовой таблицы на листе пользователя
// Считывает актуальные данные из вопросного листа и перезаписывает значения в столбце B
function updateFinancialTable(chat_id) {
  var financialData = getFinancialData(chat_id);
  var userSheet = getOrCreateUserSheet(chat_id);
  var categories = ["Краткосрочные", "Среднесрочные", "Долгосрочные", "кредиты", "благотворительность", "приход"];
  for (var i = 0; i < categories.length; i++) {
    userSheet.getRange(i + 1, 2).setValue(financialData[categories[i]]);
  }
  // Обновляем формат числовых значений
  let valueRange = userSheet.getRange(1, 2, 6, 1);
  valueRange.setNumberFormat("#,##0.00");
}

// Функция записи данных в страницу пользователя (логирование сообщений)
function saveUserData(chat_id, message, additionalInfo = "", processed = "No") {
  const userSheet = getOrCreateUserSheet(chat_id); // Получаем или создаем лист
  const timestamp = new Date(); // Текущее время
  // Определяем тип сообщения
  let messageType = "Text"; // По умолчанию текст
  if (message.startsWith("/")) {
    messageType = "Command";
    additionalInfo = `Command: ${message}`;
  } else if (message.includes("Picture sent")) {
    messageType = "Image";
    additionalInfo = `Caption: ${additionalInfo || "No caption provided"}`;
  } else {
    additionalInfo = `Length: ${message.length}`;
  }
  // Добавляем данные в лог (они будут добавлены ниже финансовой таблицы)
  userSheet.appendRow([timestamp, chat_id, message, messageType, additionalInfo, processed]);
  const lastRow = userSheet.getLastRow();
  const rowRange = userSheet.getRange(lastRow, 1, 1, 6);
  rowRange.setFontSize(10)
    .setHorizontalAlignment("left")
    .setBorder(true, true, true, true, false, false);
  
  // После записи логов обновляем финансовую таблицу, чтобы отразить новые данные
  updateFinancialTable(chat_id);
}
