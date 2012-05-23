safari.application.addEventListener("validate", validateHandler, false);
function validateHandler(event) {
  var button = elem('saveDefaultFormatButton')
  saveDefaultFormatButton.addEventListener('click', saveDefaultFormat);
  populateFormatGroup();

//  var textLabel = elem('textLabel');
//  var popover = safari.extension.popovers[0];
//  console.log('textLabel.offsetTop=' + textLabel.offsetTop);
//  console.log('button.offsetTop=' + button.offsetTop);
//  console.log('button.clientHeight=' + button.clientHeight);
//  popover.height = button.offsetTop + button.clientHeight -
//    textLabel.offsetTop + 20;
//  console.log('popover.height=' + popover.height);
}

safari.application.addEventListener("popover", popoverHandler, false);
function popoverHandler(event) {
  var formatId = safari.extension.settings.defaultFormat;
  populateTextToCopy(formatId);
}

function getOption(name) {
  return safari.extension.settings[name];
}

function elem(id) {
  return document.getElementById(id);
}

var MIN_FORMAT_ID = 1,
    MAX_FORMAT_ID = 9;

function getFormatCount() {
  var i;
  for (i = MIN_FORMAT_ID; i <= MAX_FORMAT_ID; ++i) {
    var optTitle = getOption('title' + i);
    var optFormat = getOption('format' + i);
    if (optTitle === undefined || optFormat === undefined) {
      break;
    }
  }
  return i - 1;
}

function populateFormatGroup() {
  var tab = safari.application.activeBrowserWindow.activeTab;
  var title = tab.title;
  var url = tab.url;
  var defaultFormat = getOption('defaultFormat');
  var radios = [];
  var cnt = getFormatCount();
  for (var i = 1; i <= cnt; ++i) {
    var optTitle = getOption('title' + i);
    var radioId = 'format' + i;
    radios.push('<span class="radio"><input type="radio" name="format" id="' +
        radioId + '" value="' + i + '"' +
        (i == defaultFormat ? ' checked' : '') +
        '><label for="' + radioId + '">' + optTitle.replace(/</g, '&lt;') +
        '</label></input></span>');
  }
  var group = elem('formatGroup');
  group.innerHTML = radios.join('');

  for (var i = 1; i <= radios.length; ++i) {
    var radioId = 'format' + i;
    elem(radioId).addEventListener('click', function(e) {
      var formatId = e.target.value;
      populateTextToCopy(formatId);
    });
  }
}

function populateTextToCopy(formatId) {
  var tab = safari.application.activeBrowserWindow.activeTab;
  var title = tab.title;
  var url = tab.url;
  var format = safari.extension.settings['format' + formatId];
  var text = formatUrl(format, title, url);
  var textElem = document.getElementById('textToCopy');
  textElem.value = text;
  setTimeout(selectTextToCopy, 0);
}

function selectTextToCopy() {
  var textElem = document.getElementById('textToCopy');
  textElem.focus();
  textElem.select();
}

function getSelectedFormat() {
  var cnt = getFormatCount();
  for (var i = 1; i <= cnt; ++i) {
    if (elem('format' + i).checked) {
      return i;
    }
  }
  return undefined;
}

function saveDefaultFormat() {
  safari.extension.settings.defaultFormat = getSelectedFormat();
  selectTextToCopy();
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
