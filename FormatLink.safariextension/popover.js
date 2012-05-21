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
  var format = safari.extension.settings['format' + formatId];
  var text = formatUrl(format, title, url);
//  var text = formatUrl(format, '["foo"]("this is title")', 'https://example.com/?foo=<bar>(baz)');
  var textElem = document.getElementById('textToCopy');
  textElem.value = text;
  setTimeout(function() {
    textElem.focus();
    textElem.select();
  }, 0);
}

function formatUrl(format, title, url) {
  var text = '';
  var work;
  var i = 0, len = format.length;

  function parseLiteral(str) {
    if (format.substr(i, str.length) === str) {
      i += str.length;
      return str;
    } else {
      return null;
    }
  }

  function parseString() {
    var str = '';
    if (parseLiteral('"')) {
      while (i < len) {
        if (parseLiteral('\\')) {
          if (i < len) {
            str += format.substr(i++, 1);
          } else {
            throw new Error('parse error expected "');
          }
        } else if (parseLiteral('"')) {
          return str;
        } else {
          if (i < len) {
            str += format.substr(i++, 1);
          } else {
            throw new Error('parse error expected "');
          }
        }
      }
    } else {
      return null;
    }
  }

  function processVar(value) {
    var work = value;
    while (i < len) {
      if (parseLiteral('.s(')) {
        var arg1 = parseString();
        if (arg1 && parseLiteral(',')) {
          var arg2 = parseString();
          if (arg2 && parseLiteral(')')) {
            var regex = new RegExp(arg1, 'g');
            work = work.replace(regex, arg2);
          } else {
            throw new Error('parse error');
          }
        } else {
          throw new Error('parse error');
        }
      } else if (parseLiteral('}}')) {
        text += work;
        return;
      } else {
        throw new Error('parse error');
      }
    }
  }

  while (i < len) {
    if (parseLiteral('\\')) {
      if (parseLiteral('n')) {
        text += "\n";
      } else if (parseLiteral('t')) {
        text += "\t";
      } else {
        text += format.substr(i++, 1);
      }
    } else if (parseLiteral('{{')) {
      if (parseLiteral('title')) {
        processVar(title);
      } else if (parseLiteral('url')) {
        processVar(url);
      }
    } else {
      text += format.substr(i++, 1);
    }
  }
  return text;
}
