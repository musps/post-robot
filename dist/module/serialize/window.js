function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

import 'cross-domain-utils/src';
import { WeakMap } from 'cross-domain-safe-weakmap/src';
import { ZalgoPromise } from 'zalgo-promise/src';
import { uniqueID, getOrSet, noop, memoizePromise } from 'belter/src';
import { serializeType } from 'universal-serialize/src';

import { SERIALIZATION_TYPE } from '../conf';
import { global } from '../global';
import { getWindowInstanceID, onKnownWindow } from '../lib';

export var ProxyWindow = function () {
    function ProxyWindow(serializedWindow) {
        _classCallCheck(this, ProxyWindow);

        this.serializedWindow = serializedWindow;
        this.actualWindowPromise = new ZalgoPromise();
        this.serializedWindow.getInstanceID = memoizePromise(this.serializedWindow.getInstanceID);
        this.waitForWindows();
    }

    ProxyWindow.prototype.waitForWindows = function waitForWindows() {
        var _this = this;

        onKnownWindow(function (win) {
            _this.matchWindow(win).then(function (match) {
                if (match) {
                    _this.setWindow(win);
                }
            })['catch'](noop);
        });
    };

    ProxyWindow.prototype.setLocation = function setLocation(href) {
        var _this2 = this;

        return ZalgoPromise['try'](function () {
            if (_this2.actualWindow) {
                _this2.actualWindow.location = href;
            } else {
                return _this2.serializedWindow.setLocation(href);
            }
        }).then(function () {
            return _this2;
        });
    };

    ProxyWindow.prototype.setName = function setName(name) {
        var _this3 = this;

        return ZalgoPromise['try'](function () {
            if (_this3.actualWindow) {
                // $FlowFixMe
                _this3.actualWindow.name = name;
            } else {
                return _this3.serializedWindow.setName(name);
            }
        }).then(function () {
            return _this3;
        });
    };

    ProxyWindow.prototype.close = function close() {
        var _this4 = this;

        return ZalgoPromise['try'](function () {
            if (_this4.actualWindow) {
                _this4.actualWindow.close();
            } else {
                return _this4.serializedWindow.close();
            }
        }).then(function () {
            return _this4;
        });
    };

    ProxyWindow.prototype.focus = function focus() {
        var _this5 = this;

        return ZalgoPromise['try'](function () {
            if (_this5.actualWindow) {
                _this5.actualWindow.focus();
            } else {
                return _this5.serializedWindow.focus();
            }
        }).then(function () {
            return _this5;
        });
    };

    ProxyWindow.prototype.setWindow = function setWindow(win) {
        this.actualWindow = win;
        this.actualWindowPromise.resolve(win);
    };

    ProxyWindow.prototype.matchWindow = function matchWindow(win) {
        var _this6 = this;

        return ZalgoPromise['try'](function () {
            if (_this6.actualWindow) {
                return win === _this6.actualWindow;
            }

            return ZalgoPromise.all([_this6.getInstanceID(), getWindowInstanceID(win)]).then(function (_ref) {
                var proxyInstanceID = _ref[0],
                    knownWindowInstanceID = _ref[1];

                return proxyInstanceID === knownWindowInstanceID;
            });
        });
    };

    ProxyWindow.prototype.hasWindow = function hasWindow() {
        return Boolean(this.actualWindow);
    };

    ProxyWindow.prototype.awaitWindow = function awaitWindow() {
        return this.actualWindowPromise;
    };

    ProxyWindow.prototype.getSerializedID = function getSerializedID() {
        return this.serializedWindow.serializedID;
    };

    ProxyWindow.prototype.getInstanceID = function getInstanceID() {
        if (this.actualWindow) {
            return getWindowInstanceID(this.actualWindow);
        } else {
            return this.serializedWindow.getInstanceID();
        }
    };

    ProxyWindow.isProxyWindow = function isProxyWindow(obj) {
        return obj instanceof ProxyWindow;
    };

    return ProxyWindow;
}();

global.serializedWindows = global.serializedWindows || new WeakMap();

export function serializeWindow(destination, domain, win) {
    return global.serializedWindows.getOrSet(win, function () {
        return serializeType(SERIALIZATION_TYPE.CROSS_DOMAIN_WINDOW, ProxyWindow.isProxyWindow(win) ? {
            // $FlowFixMe
            serializedID: win.getSerializedID(),
            // $FlowFixMe
            getInstanceID: function getInstanceID() {
                return win.getInstanceID();
            },
            close: function close() {
                return win.close();
            },
            focus: function focus() {
                return win.focus();
            },
            // $FlowFixMe
            setLocation: function setLocation(href) {
                return win.setLocation(href);
            },
            // $FlowFixMe
            setName: function setName(name) {
                return win.setName(name);
            }
        } : {
            serializedID: uniqueID(),
            getInstanceID: function getInstanceID() {
                return getWindowInstanceID(win);
            },
            close: function close() {
                return ZalgoPromise['try'](function () {
                    return win.close();
                });
            },
            focus: function focus() {
                return ZalgoPromise['try'](function () {
                    return win.focus();
                });
            },
            setLocation: function setLocation(href) {
                return ZalgoPromise['try'](function () {
                    win.location = href;
                });
            },
            setName: function setName(name) {
                return ZalgoPromise['try'](function () {
                    // $FlowFixMe
                    win.name = name;
                });
            }
        });
    });
}

global.deseserializedWindows = {};

export function deserializeWindow(source, origin, win) {
    return getOrSet(global.deseserializedWindows, win.serializedID, function () {
        return new ProxyWindow(win);
    });
}