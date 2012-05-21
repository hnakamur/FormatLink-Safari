safari.application.addEventListener("popover", popoverHandler, false);
function popoverHandler(event) {
  populateFormatSelect();
  var formatId = safari.extension.settings.defaultFormat;
  populateTextToCopy(formatId);
}

var MIN_FORMAT_ID = 1,
    MAX_FORMAT_ID = 9;

function populateFormatSelect() {
  var elem = document.getElementById('formatSelect');
  var settings = safari.extension.settings;
  for (var id = MIN_FORMAT_ID; id <= MAX_FORMAT_ID; ++id) {
    var title = settings['title' + id];
    var format = settings['format' + id];
    if (title === undefined || format === undefined) {
      break;
    }
    elem.options[id - 1] = new Option(title, id);
  }
  var defaultFormatId = safari.extension.settings.defaultFormat;
  elem.selectedIndex = defaultFormatId - 1;
  elem.addEventListener('change', function() {
    var formatId = elem.options[elem.selectedIndex].value;
    populateTextToCopy(formatId);
  });
}

function populateTextToCopy(formatId) {
  var tab = safari.application.activeBrowserWindow.activeTab;
  var title = tab.title;
  var url = tab.url;
  var funcBody = safari.extension.settings['format' + formatId];
  var func = new Function("title", "url", funcBody);
  var text = func(title, url);
  var textElem = document.getElementById('textToCopy');
  textElem.value = text;
  setTimeout(function() {
    textElem.focus();
    textElem.select();
  }, 0);
}
