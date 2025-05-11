const adminChatId = ''; // ID вашего админа

function getRecommendation() {
  // Открываем таблицу по ID
  const ss = SpreadsheetApp.openById(SsId);
  // Получаем лист "рекомендации"
  const sheet = ss.getSheetByName("рекомендации");
  if (!sheet) {
    Logger.log("Лист 'рекомендации' не найден");
    return "";
  }
  // Возвращаем значение ячейки A1
  return sheet.getRange("A1").getValue();
}

// Функция, которая удаляет все лишние символы и оставляет только цифры, точку и минус
function extractNumber(input) {
  if (!input) return 0;
  let cleaned = input.toString().replace(/[^0-9.\-]/g, '');
  let number = parseFloat(cleaned);
  return isNaN(number) ? 0 : number;
}

function doPost(e) {
  const contents = JSON.parse(e.postData.contents);
  getSheetById(DebugSheetId).getRange(1, 1).setValue(JSON.stringify(contents, null, 7));

  if (contents.callback_query) {
    handleCallbackQuery(contents.callback_query);
    return;
  }

  if (contents.message && contents.message.text) {
    const chat_id = contents.message.from.id;
    let message = contents.message.text;
    
    // Если сообщение является ответом на запрос нового дохода
    const cache = CacheService.getScriptCache();
    if (cache.get("income_update_" + chat_id) === "true") {
      let newIncome = parseFloat(message);
      if (isNaN(newIncome)) {
        sendText(chat_id, "Введено некорректное значение дохода. Попробуйте ещё раз.");
        return;
      }
      // Обновляем все ячейки с тегом (доход) для данного пользователя (принимается только введённое значение)
      let sheet = getSheetById(QuestionSheetId);
      let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      for (let j = 1; j < headers.length; j++) {
        if (headers[j].indexOf("(доход)") !== -1) {
          updateIncomeAtColumn(chat_id, j, newIncome);
        }
      }
      cache.remove("income_update_" + chat_id);
      // Используем новый метод расчёта (с конкретными суммами)
      let updatedCalculations = calculateCategoryPercentages(getUserData(chat_id));
      sendMessageToAdmin(updatedCalculations, chat_id);
      sendText(chat_id, "Новый доход принят и отправлен на рассмотрение");
      return;
    }

    let column = 0;
    let i = 1; // Начинаем с 1, так как 0-я строка — это заголовки
    let text;
    let keyBoard = null;

    if (chat_id == adminChatId) {
      const message = contents.message.text;
      // Если админ отправил новый текст, редактируем его и отправляем пользователю
      if (contents.message.text && contents.message.text !== "Пожалуйста, введите новый текст сообщения для пользователя.") {
        const messageText = message.trim();
        const userChatIdMatch = messageText.match(/ID: (\d+)/);
        if (userChatIdMatch) {
          const userChatId = userChatIdMatch[1];
          const editedMessage = messageText.replace(`ID: ${userChatId}`, '').trim();
          sendText(userChatId, editedMessage);
          sendText(adminChatId, "Сообщение успешно отредактировано и отправлено пользователю.");
        } else {
          sendText(adminChatId, "Не удалось извлечь ID пользователя для редактирования сообщения.");
        }
      }
      return;
    }

    // Получаем все данные из вопросного листа
    let allData = getSheetById(QuestionSheetId).getDataRange().getDisplayValues();
    let userExists = false;
    for (let row = 1; row < allData.length; row++) {
      if (allData[row][0] == chat_id) {
        userExists = true;
        i = row;
        break;
      }
    }
    if (!userExists) {
      getSheetById(QuestionSheetId).appendRow([chat_id]);
      i = getSheetById(QuestionSheetId).getLastRow();
      getSheetById(QuestionSheetId).getRange(i, 1).setValue(chat_id);
      text = allData[0][1];
      sendText(chat_id, text);
      saveUserData(chat_id, message, "Example info");
      return;
    }

    for (; i < allData.length; i++) {
      if (allData[i][0] == chat_id) {
        for (let j = column; j < allData[i].length; j++) {
          if (allData[i][j] !== "") {
            column = j;
          }
        }
        while (column <= LastColumn) {
          const currentQuestion = allData[0][column + 2];
          if (currentQuestion.includes("*")) {
            getSheetById(QuestionSheetId).getRange(i + 1, column + 2).setValue(message);
            text = currentQuestion.replace("*", "");
            sendText(chat_id, text);
            column++;
            continue;
          } else if (currentQuestion.includes("(кнопка)")) {
            getSheetById(QuestionSheetId).getRange(i + 1, column + 2).setValue(message);
            saveUserData(chat_id, message, "Example info");
            text = currentQuestion.replace("(кнопка)", "").trim();
            keyBoard = getButtonKeyboard();
            column++;
            break;
          } else if (currentQuestion.includes("(КраткосрочныйРасход)") || currentQuestion.includes("(СреднесрочныйРасход)") || currentQuestion.includes("(ДолгосрочныйРасход)")) {
            getSheetById(QuestionSheetId).getRange(i + 1, column + 2).setValue(message);
            saveUserData(chat_id, message, "Example info");
            if (currentQuestion.includes("(КраткосрочныйРасход)")) {
              text = currentQuestion.replace("(КраткосрочныйРасход)", "").trim();
            } else if (currentQuestion.includes("(СреднесрочныйРасход)")) {
              text = currentQuestion.replace("(СреднесрочныйРасход)", "").trim();
            } else if (currentQuestion.includes("(ДолгосрочныйРасход)")) {
              text = currentQuestion.replace("(ДолгосрочныйРасход)", "").trim();
            }
            column++;
            break;
          } else if (currentQuestion.includes("(доход)")) {
            getSheetById(QuestionSheetId).getRange(i + 1, column + 2).setValue(message);
            saveUserData(chat_id, message, "Example info");
            text = currentQuestion.replace("(доход)", "").trim();
            column++;
            break;
          } else if (currentQuestion.includes("(накопления)")) {
            getSheetById(QuestionSheetId).getRange(i + 1, column + 2).setValue(message);
            saveUserData(chat_id, message, "Example info");
            text = currentQuestion.replace("(накопления)", "").trim();
            column++;
            break;
          } else if (currentQuestion.includes("(долг)")) {
            getSheetById(QuestionSheetId).getRange(i + 1, column + 2).setValue(message);
            saveUserData(chat_id, message, "Example info");
            text = currentQuestion.replace("(долг)", "").trim();
            column++;
            break;
          } else if (currentQuestion.includes("(благотворительность)")) {
            getSheetById(QuestionSheetId).getRange(i + 1, column + 2).setValue(message);
            saveUserData(chat_id, message, "Example info");
            text = currentQuestion.replace("(благотворительность)", "").trim();
            column++;
            break;
          } else {
            getSheetById(QuestionSheetId).getRange(i + 1, column + 2).setValue(message);
            saveUserData(chat_id, message, "Example info");
            text = currentQuestion;
            column++;
            break;
          }
        }
        sendText(chat_id, text, keyBoard);
        return;
      }
    }
  }
}

function handleCallbackQuery(callback_query) {
  const chat_id = callback_query.from.id;
  const callback_data = callback_query.data;

  if (callback_data === "button_response") {
    // При обычном прохождении вопросов используем первичный расчёт
    let userData = getUserData(chat_id);
    const resultMessage = calculatePrimaryPercentages(userData);
    sendMessageToAdmin(resultMessage, chat_id);
    answerCallbackQuery(callback_query.id, "Сообщение отправлено админу.");
  } else if (callback_data === "send_to_user") {
    const adminChatId = callback_query.from.id;
    const messageText = callback_query.message.text;
    const userChatIdMatch = messageText.match(/ID: (\d+)/);
    if (userChatIdMatch) {
      const userChatId = userChatIdMatch[1];
      const messageToSend = messageText.replace(/ID: \d+\n/, '').trim();
      const finalMessage = `${messageToSend}\n\nБлагодарю!`;
      // Добавляем кнопки: "Ввести доход" и "Начать заново"
      const userKeyboard = {
        inline_keyboard: [
          [
            { text: "Ввести доход", callback_data: "enter_income" },
            { text: "Начать заново", callback_data: "reset" }
          ]
        ]
      };
      sendText(userChatId, finalMessage, userKeyboard);
      sendText(adminChatId, "Сообщение отправлено пользователю.");
    } else {
      sendText(adminChatId, "Не удалось найти ID пользователя в сообщении.");
    }
  } else if (callback_data === "edit_message") {
    sendText(chat_id, "Пожалуйста, введите новый текст сообщения для пользователя.");
  } else if (callback_data === "enter_income") {
    // Устанавливаем флаг, чтобы следующий ввод воспринимать как новый доход
    CacheService.getScriptCache().put("income_update_" + chat_id, "true", 300);
    sendText(chat_id, "Пожалуйста, введите сумму поступивших средств:");
  } else if (callback_data === "reset") {
    // Сбрасываем ответы пользователя и начинаем заново
    resetUser(chat_id);
    let allData = getSheetById(QuestionSheetId).getDataRange().getDisplayValues();
    let firstQuestion = allData[0][1]; // первый вопрос (из второй колонки)
    sendText(chat_id, "Начинаем заново. " + firstQuestion);
    answerCallbackQuery(callback_query.id, "Начинаем заново");
  }
}

function resetUser(chat_id) {
  let sheet = getSheetById(QuestionSheetId);
  let allData = sheet.getDataRange().getDisplayValues();
  let userRow = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] == chat_id) {
      userRow = i + 1;
      break;
    }
  }
  if (userRow === -1) return;
  let totalColumns = sheet.getLastColumn();
  // Очищаем всю строку, кроме колонки с ID (первая колонка)
  sheet.getRange(userRow, 2, 1, totalColumns - 1).clearContent();
}

function sendMessageToAdmin(message, userChatId) {
  const adminChatId = '1854238983';
  const keyboard = {
    inline_keyboard: [
      [
        { text: "Отправить пользователю", callback_data: "send_to_user" },
        { text: "Редактировать", callback_data: "edit_message" }
      ]
    ]
  };
  const textForAdmin = `ID: ${userChatId}\n${message}`;
  sendText(adminChatId, textForAdmin, keyboard);
}

function answerCallbackQuery(callback_query_id, text) {
  let payload = {
    method: 'answerCallbackQuery',
    callback_query_id: callback_query_id,
    text: text,
    show_alert: false
  };
  let data = {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  };
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/', data);
}

function getButtonKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "Отправить админу", callback_data: "button_response" }
      ]
    ]
  };
}

function sendText(chat_id, text, keyBoard = null) {
  let payload = {
    method: 'sendMessage',
    chat_id: String(chat_id),
    text: text,
    parse_mode: 'HTML',
    link_preview_options: JSON.stringify({ is_disabled: true })
  };
  if (keyBoard) {
    payload.reply_markup = JSON.stringify(keyBoard);
  }
  let data = {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  };
  return JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/', data));
}

function extractNumber(input) {
  if (!input) return 0;
  let cleaned = input.toString().replace(/[^0-9.\-]/g, '');
  let number = parseFloat(cleaned);
  return isNaN(number) ? 0 : number;
}

function adjustExpensesIterative(expenses) {
  let arr = expenses.slice();
  let iterations = 0;
  while (iterations < 1000) {
    iterations++;
    let maxVal = Math.max(...arr);
    let minVal = Math.min(...arr);
    if (maxVal - minVal <= 20 + 0.001) break;
    let maxIndex = arr.indexOf(maxVal);
    let allowed = minVal + 20;
    let reduction = maxVal - allowed;
    arr[maxIndex] = allowed;
    let otherIndices = [0, 1, 2].filter(i => i !== maxIndex);
    let addPerOther = reduction / otherIndices.length;
    for (let i of otherIndices) {
      arr[i] += addPerOther;
    }
    let sumNow = arr.reduce((a, b) => a + b, 0);
    if (Math.abs(sumNow - 100) > 0.001) {
      arr = arr.map(x => x * 100 / sumNow);
    }
  }
  return arr;
}

// Первичный расчет – используется до ввода нового дохода (при обычном прохождении вопросов)
function calculatePrimaryPercentages(userData) {
  let sumShort = 0, sumMid = 0, sumLong = 0;
  let income = 0, savings = 0, debt = 0;
  
  // Находим первое значение дохода и суммируем накопления и долг (если есть)
  for (let i = 0; i < userData.length; i++) {
    if (userData[i].tag.includes("(доход)")) {
      income = extractNumber(userData[i].value);
    } else if (userData[i].tag.includes("(накопления)")) {
      savings += extractNumber(userData[i].value);
    } else if (userData[i].tag.includes("(долг)")) {
      debt += extractNumber(userData[i].value);
    }
  }
  
  if (income === 0) {
    return "Нет данных о доходах для подсчета.";
  }
  
  // Суммируем расходы
  userData.forEach(item => {
    let value = extractNumber(item.value);
    if (item.tag.includes("(КраткосрочныйРасход)")) {
      sumShort += value;
    } else if (item.tag.includes("(СреднесрочныйРасход)")) {
      sumMid += value;
    } else if (item.tag.includes("(ДолгосрочныйРасход)")) {
      sumLong += value;
    }
  });
  
  let totalExpenses = sumShort + sumMid + sumLong;
  
  let currentMessage = `Текущие траты:\n` +
                       `Краткосрочный расход: ${(sumShort / income * 100).toFixed(2)}%\n` +
                       `Среднесрочный расход: ${(sumMid / income * 100).toFixed(2)}%\n` +
                       `Долгосрочный расход: ${(sumLong / income * 100).toFixed(2)}%\n` +
                       `Общие траты: ${(totalExpenses / income * 100).toFixed(2)}%\n\n`;
  
  let currentShort = (sumShort / income) * 100;
  let currentMid = (sumMid / income) * 100;
  let currentLong = (sumLong / income) * 100;
  let totalPercent = currentShort + currentMid + currentLong;
  let recShort = totalPercent ? (currentShort / totalPercent) * 100 : 0;
  let recMid = totalPercent ? (currentMid / totalPercent) * 100 : 0;
  let recLong = totalPercent ? (currentLong / totalPercent) * 100 : 0;
  
  let recommendedMessage = `Рекомендуемые траты:\n` +
                           `Краткосрочный расход: ${recShort.toFixed(2)}%\n` +
                           `Среднесрочный расход: ${recMid.toFixed(2)}%\n` +
                           `Долгосрочный расход: ${recLong.toFixed(2)}%\n` +
                           `Общие траты: 100.00%\n\n`;
  
  let otherMessage = `Прочее:\n` +
                     `Доход: ${income}\n` +
                     `Накопления: ${(income * 0.2875).toFixed(2)}%\n` +
                     `Долг: ${(income * 0.1875).toFixed(2)}%\n\n`;
  
  return currentMessage + recommendedMessage + otherMessage;
}

// Новый расчет – используется после ввода нового дохода, выводит конкретные суммы
function calculateCategoryPercentages(userData) {
  let sumShort = 0, sumMid = 0, sumLong = 0;
  let income = 0;
  // Находим первое значение дохода (значение, введённое пользователем)
  for (let i = 0; i < userData.length; i++) {
    if (userData[i].tag.includes("(доход)")) {
      income = extractNumber(userData[i].value);
      break;
    }
  }
  
  if (income === 0) {
    return "Нет данных о доходах для подсчета.";
  }
  
  // Суммируем расходы
  userData.forEach(item => {
    let value = extractNumber(item.value);
    if (item.tag.includes("(КраткосрочныйРасход)")) {
      sumShort += value;
    } else if (item.tag.includes("(СреднесрочныйРасход)")) {
      sumMid += value;
    } else if (item.tag.includes("(ДолгосрочныйРасход)")) {
      sumLong += value;
    }
  });
  
  let currentShort = (sumShort / income) * 100;
  let currentMid = (sumMid / income) * 100;
  let currentLong = (sumLong / income) * 100;
  let totalExpensesPercent = currentShort + currentMid + currentLong;
  
  let recommended;
  if (totalExpensesPercent > 100) {
    recommended = [currentShort, currentMid, currentLong].map(x => x * (100 / totalExpensesPercent));
    recommended = adjustExpensesIterative(recommended);
  } else {
    recommended = [currentShort, currentMid, currentLong];
  }
  
  let amountForExpenditures = income * 0.80;
  let recShort = (recommended[0] * amountForExpenditures / 100);
  let recMid   = (recommended[1] * amountForExpenditures / 100);
  let recLong  = (recommended[2] * amountForExpenditures / 100);
  
  let recSavings = income * 0.10;
  let recInvest  = income * 0.10;
  
  let recommendedMessage = `Рекомендации по распределению:\n` +
                           `Краткосрочные расходы: ${recShort.toFixed(2)}\n` +
                           `Среднесрочные расходы: ${recMid.toFixed(2)}\n` +
                           `Долгосрочные расходы (Цели): ${recLong.toFixed(2)}\n` +
                           `Кредиты: ${recSavings.toFixed(2)}\n` +
                           `Благотворительность: ${recInvest.toFixed(2)}\n\n`;
  
  var recommendationText = getRecommendation();
  
  return recommendedMessage + recommendationText;
}

function getUserData(chat_id) {
  let allData = getSheetById(QuestionSheetId).getDataRange().getDisplayValues();
  let userData = [];
  let categories = allData[0];
  for (let row = 1; row < allData.length; row++) {
    if (allData[row][0] == chat_id) {
      for (let col = 1; col < allData[row].length; col++) {
        let value = allData[row][col];
        let tag = categories[col];
        if (tag && value) {
          if ((tag.includes("(КраткосрочныйРасход)") || tag.includes("(СреднесрочныйРасход)") || tag.includes("(ДолгосрочныйРасход)")) ||
              tag.includes("(доход)") ||
              tag.includes("(накопления)") ||
              tag.includes("(долг)")) {
            userData.push({ value: value, tag: tag });
          }
        }
      }
      break;
    }
  }
  function isNumeric(input) {
    return /^-?\d+(\.\d+)?$/.test(input);
  }
  return userData;
}

function updateIncomeAtColumn(chat_id, headerIndex, newIncome) {
  let sheet = getSheetById(QuestionSheetId);
  let allData = sheet.getDataRange().getDisplayValues();
  let userRow = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] == chat_id) {
      userRow = i + 1;
      break;
    }
  }
  if (userRow === -1) return;
  sheet.getRange(userRow, headerIndex + 1).setValue(newIncome);
}
