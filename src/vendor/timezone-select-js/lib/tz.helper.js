"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findTzByKey = exports.findTzByName = exports.tzRawData = exports.clientTz = exports.listTz = void 0;

var _tz = require("./tz.data");

var tzRawData = _tz.TIMEZONES;
exports.tzRawData = tzRawData;

var findTzByKey = function findTzByKey(key) {
  return _tz.TIMEZONES.find(function (item) {
    return item.name === key;
  });
};

exports.findTzByKey = findTzByKey;

var findTzByName = function findTzByName(name, list) {
  var data = list || listTz();
  return data.find(function (item) {
    return item.included && item.included.includes(name);
  });
};

exports.findTzByName = findTzByName;

var newTzItem = function newTzItem(_ref) {
  var data = _ref.data,
      displayName = _ref.displayName,
      offset = _ref.offset;
  return {
    value: data.name,
    label: "(GMT".concat(data.offset, ") ").concat(displayName),
    included: [data.name],
    country: data.country,
    offset: data.offset,
    offsetValue: offset
  };
};

var clientTz = function clientTz() {
  var clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  var clientTzObj = findTzByKey(clientTz);
  return clientTzObj.status === 'Deprecated' ? clientTzObj.link : clientTz;
};

exports.clientTz = clientTz;

var proceedDependences = function proceedDependences(item) {
  // proceed name offset
  var offsetParts = item.offset.split(/\d+/g);
  var offsetPrefix;

  if (offsetParts[0] === '+') {
    offsetPrefix = '+';
  } else {
    offsetPrefix = '-';
  }

  item.offset = item.offset.replace(offsetParts[0], offsetPrefix);
  var offset = +item.offset.replace(':', ''); // proceed name

  var nameArr = item.name.split('/').slice(1);
  var displayName = nameArr.join('-').replace(/_/g, ' '); // proceed key

  var key = "".concat(item.country, "_").concat(item.offset);
  return {
    key: key,
    offset: offset,
    displayName: displayName
  };
};

var listTz = function listTz() {
  var newTz = _tz.TIMEZONES.reduce(function (obj, item) {
    if (item.status === 'Deprecated') {
      if (item.link) {
        // proceed tz item by using linking item
        var linkingItem = findTzByKey(item.link);

        var _proceedDependences = proceedDependences(linkingItem),
            key = _proceedDependences.key,
            displayName = _proceedDependences.displayName,
            offset = _proceedDependences.offset;

        if (obj[key]) {
          obj[key].included.push(item.name);
        } else {
          obj[key] = newTzItem({
            data: linkingItem,
            displayName: displayName,
            offset: offset
          });
        }
      }
    } else if (item.country === '') {// todo
    } else {
      // proceed tz item
      var _proceedDependences2 = proceedDependences(item),
          _key = _proceedDependences2.key,
          _displayName = _proceedDependences2.displayName,
          _offset = _proceedDependences2.offset;

      if (obj[_key]) {
        if (obj[_key].included && !obj[_key].included.includes(item.name)) {
          obj[_key].label += ", ".concat(_displayName);

          obj[_key].included.push(item.name);
        }
      } else {
        obj[_key] = newTzItem({
          data: item,
          displayName: _displayName,
          offset: _offset
        });
      }
    }

    return obj;
  }, {});

  return Object.values(newTz).sort(function (a, b) {
    return a.offsetValue - b.offsetValue;
  });
};

exports.listTz = listTz;