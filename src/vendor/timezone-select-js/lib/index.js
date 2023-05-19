"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "listTz", {
  enumerable: true,
  get: function get() {
    return _tz.listTz;
  }
});
Object.defineProperty(exports, "clientTz", {
  enumerable: true,
  get: function get() {
    return _tz.clientTz;
  }
});
Object.defineProperty(exports, "findTzByName", {
  enumerable: true,
  get: function get() {
    return _tz.findTzByName;
  }
});
Object.defineProperty(exports, "tzRawData", {
  enumerable: true,
  get: function get() {
    return _tz.tzRawData;
  }
});
Object.defineProperty(exports, "findTzByKey", {
  enumerable: true,
  get: function get() {
    return _tz.findTzByKey;
  }
});
exports.TimezoneSelect = void 0;

var _react = _interopRequireWildcard(require("react"));

var _reactSelect = _interopRequireDefault(require("react-select"));

var _tz = require("./tz.helper");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var TimezoneSelect = function TimezoneSelect(_ref) {
  var value = _ref.value,
      onBlur = _ref.onBlur,
      onChange = _ref.onChange,
      _ref$labelStyle = _ref.labelStyle,
      labelStyle = _ref$labelStyle === void 0 ? 'original' : _ref$labelStyle,
      props = _objectWithoutProperties(_ref, ["value", "onBlur", "onChange", "labelStyle"]);

  var getOptions = (0, _react.useMemo)(function () {
    return (0, _tz.listTz)();
  }, [labelStyle]);

  var handleChange = function handleChange(tz) {
    onChange && onChange(tz);
  };

  var constructTz = function constructTz(data) {
    return typeof data === 'string' ? (0, _tz.findTzByName)(data, getOptions) : data;
  };

  return /*#__PURE__*/_react["default"].createElement(_reactSelect["default"], _extends({
    value: constructTz(value),
    onChange: handleChange,
    options: getOptions,
    onBlur: onBlur
  }, props));
};

exports.TimezoneSelect = TimezoneSelect;