'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _path = require('path');

function getReplaceFunc() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        replaceFunc = _ref.replaceFunc,
        _ref$replaceHandlerNa = _ref.replaceHandlerName,
        replaceHandlerName = _ref$replaceHandlerNa === undefined ? 'default' : _ref$replaceHandlerNa,
        _ref$resolveFrom = _ref.resolveFrom,
        resolveFrom = _ref$resolveFrom === undefined ? 'process.cwd()' : _ref$resolveFrom;

    var absolutePath = (0, _path.resolve)(eval(resolveFrom), replaceFunc);
    var replaceContainer = require(absolutePath);
    if (!replaceContainer) {
        throw new Error('Cannot find replace function file: ' + absolutePath);
    }

    var replace = replaceContainer[replaceHandlerName] || replaceContainer;
    // If the result is not a function, throw
    if (!replace || typeof replace !== 'function') {
        throw new Error('Cannot find replace handler in: ' + absolutePath + " with name: " + replaceHandlerName);
    }

    return replace;
}

exports.default = function (_ref2, a, b) {
    var t = _ref2.types;

    var cachedReplaceFunction = void 0;

    function mapModule(source, file, state) {
        var opts = state.opts;
        if (!cachedReplaceFunction) {
            cachedReplaceFunction = getReplaceFunc(opts);
        }
        var replace = cachedReplaceFunction;
        var result = replace(source, file, opts);
        if (result !== source) {
            return result;
        } else {
            return;
        }
    }

    function transformRequireCall(nodePath, state) {
        if (!t.isIdentifier(nodePath.node.callee, { name: 'require' }) && !(t.isMemberExpression(nodePath.node.callee) && t.isIdentifier(nodePath.node.callee.object, { name: 'require' }))) {
            return;
        }

        var moduleArg = nodePath.node.arguments[0];
        if (moduleArg && moduleArg.type === 'StringLiteral') {
            var modulePath = mapModule(moduleArg.value, state.file.opts.filename, state);
            if (modulePath) {
                nodePath.replaceWith(t.callExpression(nodePath.node.callee, [t.stringLiteral(modulePath)]));
            }
        }
    }

    function transformImportExportCall(nodePath, state) {
        var moduleArg = nodePath.node.source;
        if (moduleArg && moduleArg.type === 'StringLiteral') {
            var modulePath = mapModule(moduleArg.value, state.file.opts.filename, state);
            if (modulePath) {
                nodePath.node.source = t.stringLiteral(modulePath);
            }
        }
    }

    return {
        visitor: {
            CallExpression: {
                exit: function exit(nodePath, state) {
                    return transformRequireCall(nodePath, state);
                }
            },
            ImportDeclaration: {
                exit: function exit(nodePath, state) {
                    return transformImportExportCall(nodePath, state);
                }
            },
            ExportDeclaration: {
                exit: function exit(nodePath, state) {
                    return transformImportExportCall(nodePath, state);
                }
            }
        }
    };
};