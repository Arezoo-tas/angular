import { ParseError } from 'angular2/src/compiler/parse_util';
import { HtmlElementAst, HtmlTextAst, HtmlCommentAst, htmlVisitAll } from 'angular2/src/compiler/html_ast';
import { isPresent, isBlank } from 'angular2/src/facade/lang';
import { Message } from './message';
export const I18N_ATTR = "i18n";
export const I18N_ATTR_PREFIX = "i18n-";
/**
 * An i18n error.
 */
export class I18nError extends ParseError {
    constructor(span, msg) {
        super(span, msg);
    }
}
// Man, this is so ugly!
export function partition(nodes, errors) {
    let res = [];
    for (let i = 0; i < nodes.length; ++i) {
        let n = nodes[i];
        let temp = [];
        if (_isOpeningComment(n)) {
            let i18n = n.value.substring(5).trim();
            i++;
            while (!_isClosingComment(nodes[i])) {
                temp.push(nodes[i++]);
                if (i === nodes.length) {
                    errors.push(new I18nError(n.sourceSpan, "Missing closing 'i18n' comment."));
                    break;
                }
            }
            res.push(new Part(null, null, temp, i18n, true));
        }
        else if (n instanceof HtmlElementAst) {
            let i18n = _findI18nAttr(n);
            res.push(new Part(n, null, n.children, isPresent(i18n) ? i18n.value : null, isPresent(i18n)));
        }
        else if (n instanceof HtmlTextAst) {
            res.push(new Part(null, n, null, null, false));
        }
    }
    return res;
}
export class Part {
    constructor(rootElement, rootTextNode, children, i18n, hasI18n) {
        this.rootElement = rootElement;
        this.rootTextNode = rootTextNode;
        this.children = children;
        this.i18n = i18n;
        this.hasI18n = hasI18n;
    }
    get sourceSpan() {
        if (isPresent(this.rootElement))
            return this.rootElement.sourceSpan;
        else if (isPresent(this.rootTextNode))
            return this.rootTextNode.sourceSpan;
        else
            return this.children[0].sourceSpan;
    }
    createMessage(parser) {
        return new Message(stringifyNodes(this.children, parser), meaning(this.i18n), description(this.i18n));
    }
}
function _isOpeningComment(n) {
    return n instanceof HtmlCommentAst && isPresent(n.value) && n.value.startsWith("i18n:");
}
function _isClosingComment(n) {
    return n instanceof HtmlCommentAst && isPresent(n.value) && n.value == "/i18n";
}
function _findI18nAttr(p) {
    let i18n = p.attrs.filter(a => a.name == I18N_ATTR);
    return i18n.length == 0 ? null : i18n[0];
}
export function meaning(i18n) {
    if (isBlank(i18n) || i18n == "")
        return null;
    return i18n.split("|")[0];
}
export function description(i18n) {
    if (isBlank(i18n) || i18n == "")
        return null;
    let parts = i18n.split("|");
    return parts.length > 1 ? parts[1] : null;
}
export function messageFromAttribute(parser, p, attr) {
    let expectedName = attr.name.substring(5);
    let matching = p.attrs.filter(a => a.name == expectedName);
    if (matching.length > 0) {
        let value = removeInterpolation(matching[0].value, matching[0].sourceSpan, parser);
        return new Message(value, meaning(attr.value), description(attr.value));
    }
    else {
        throw new I18nError(p.sourceSpan, `Missing attribute '${expectedName}'.`);
    }
}
export function removeInterpolation(value, source, parser) {
    try {
        let parsed = parser.splitInterpolation(value, source.toString());
        if (isPresent(parsed)) {
            let res = "";
            for (let i = 0; i < parsed.strings.length; ++i) {
                res += parsed.strings[i];
                if (i != parsed.strings.length - 1) {
                    res += `<ph name="${i}"/>`;
                }
            }
            return res;
        }
        else {
            return value;
        }
    }
    catch (e) {
        return value;
    }
}
export function stringifyNodes(nodes, parser) {
    let visitor = new _StringifyVisitor(parser);
    return htmlVisitAll(visitor, nodes).join("");
}
class _StringifyVisitor {
    constructor(_parser) {
        this._parser = _parser;
        this._index = 0;
    }
    visitElement(ast, context) {
        let name = this._index++;
        let children = this._join(htmlVisitAll(this, ast.children), "");
        return `<ph name="e${name}">${children}</ph>`;
    }
    visitAttr(ast, context) { return null; }
    visitText(ast, context) {
        let index = this._index++;
        let noInterpolation = removeInterpolation(ast.value, ast.sourceSpan, this._parser);
        if (noInterpolation != ast.value) {
            return `<ph name="t${index}">${noInterpolation}</ph>`;
        }
        else {
            return ast.value;
        }
    }
    visitComment(ast, context) { return ""; }
    _join(strs, str) {
        return strs.filter(s => s.length > 0).join(str);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZmluZ19wbHVnaW5fd3JhcHBlci1vdXRwdXRfcGF0aC1leHhWdHNMUS50bXAvYW5ndWxhcjIvc3JjL2kxOG4vc2hhcmVkLnRzIl0sIm5hbWVzIjpbIkkxOG5FcnJvciIsIkkxOG5FcnJvci5jb25zdHJ1Y3RvciIsInBhcnRpdGlvbiIsIlBhcnQiLCJQYXJ0LmNvbnN0cnVjdG9yIiwiUGFydC5zb3VyY2VTcGFuIiwiUGFydC5jcmVhdGVNZXNzYWdlIiwiX2lzT3BlbmluZ0NvbW1lbnQiLCJfaXNDbG9zaW5nQ29tbWVudCIsIl9maW5kSTE4bkF0dHIiLCJtZWFuaW5nIiwiZGVzY3JpcHRpb24iLCJtZXNzYWdlRnJvbUF0dHJpYnV0ZSIsInJlbW92ZUludGVycG9sYXRpb24iLCJzdHJpbmdpZnlOb2RlcyIsIl9TdHJpbmdpZnlWaXNpdG9yIiwiX1N0cmluZ2lmeVZpc2l0b3IuY29uc3RydWN0b3IiLCJfU3RyaW5naWZ5VmlzaXRvci52aXNpdEVsZW1lbnQiLCJfU3RyaW5naWZ5VmlzaXRvci52aXNpdEF0dHIiLCJfU3RyaW5naWZ5VmlzaXRvci52aXNpdFRleHQiLCJfU3RyaW5naWZ5VmlzaXRvci52aXNpdENvbW1lbnQiLCJfU3RyaW5naWZ5VmlzaXRvci5fam9pbiJdLCJtYXBwaW5ncyI6Ik9BQU8sRUFBa0IsVUFBVSxFQUFDLE1BQU0sa0NBQWtDO09BQ3JFLEVBR0wsY0FBYyxFQUVkLFdBQVcsRUFDWCxjQUFjLEVBQ2QsWUFBWSxFQUNiLE1BQU0sZ0NBQWdDO09BQ2hDLEVBQUMsU0FBUyxFQUFFLE9BQU8sRUFBQyxNQUFNLDBCQUEwQjtPQUNwRCxFQUFDLE9BQU8sRUFBQyxNQUFNLFdBQVc7QUFHakMsYUFBYSxTQUFTLEdBQUcsTUFBTSxDQUFDO0FBQ2hDLGFBQWEsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDO0FBRXhDOztHQUVHO0FBQ0gsK0JBQStCLFVBQVU7SUFDdkNBLFlBQVlBLElBQXFC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O0lBQ25DQyxNQUFNQSxDQUFDQSxDQUFDQSxZQUFZQSxjQUFjQSxJQUFJQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxLQUFLQSxJQUFJQSxPQUFPQSxDQUFDQTtBQUNqRkEsQ0FBQ0E7QUFFRCx1QkFBdUIsQ0FBaUI7SUFDdENDLElBQUlBLElBQUlBLEdBQUdBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLElBQUlBLElBQUlBLFNBQVNBLENBQUNBLENBQUNBO0lBQ3BEQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxJQUFJQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtBQUMzQ0EsQ0FBQ0E7QUFFRCx3QkFBd0IsSUFBWTtJQUNsQ0MsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsSUFBSUEsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7SUFDN0NBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBQzVCQSxDQUFDQTtBQUVELDRCQUE0QixJQUFZO0lBQ3RDQyxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxJQUFJQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtJQUM3Q0EsSUFBSUEsS0FBS0EsR0FBR0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7SUFDNUJBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLEdBQUdBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBO0FBQzVDQSxDQUFDQTtB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QUVBLE9BQVlBLElBQVNLLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO0lBRTNETCxLQUFLQSxDQUFDQSxJQUFjQSxFQUFFQSxHQUFXQTtRQUN2Q00sTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7SUFDbERBLENBQUNBO0FBQ0hOLENBQUNBO0FBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1BhcnNlU291cmNlU3BhbiwgUGFyc2VFcnJvcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvbXBpbGVyL3BhcnNlX3V0aWwnO1xuaW1wb3J0IHtcbiAgSHRtbEFzdCxcbiAgSHRtbEFzdFZpc2l0b3IsXG4gIEh0bWxFbGVtZW50QXN0LFxuICBIdG1sQXR0ckFzdCxcbiAgSHRtbFRleHRBc3QsXG4gIEh0bWxDb21tZW50QXN0LFxuICBodG1sVmlzaXRBbGxcbn0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvbXBpbGVyL2h0bWxfYXN0JztcbmltcG9ydCB7aXNQcmVzZW50LCBpc0JsYW5rfSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2xhbmcnO1xuaW1wb3J0IHtNZXNzYWdlfSBmcm9tICcuL21lc3NhZ2UnO1xuaW1wb3J0IHtQYXJzZXJ9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL2NoYW5nZV9kZXRlY3Rpb24vcGFyc2VyL3BhcnNlcic7XG5cbmV4cG9ydCBjb25zdCBJMThOX0FUVFIgPSBcImkxOG5cIjtcbmV4cG9ydCBjb25zdCBJMThOX0FUVFJfUFJFRklYID0gXCJpMThuLVwiO1xuXG4vKipcbiAqIEFuIGkxOG4gZXJyb3IuXG4gKi9cbmV4cG9ydCBjbGFzcyBJMThuRXJyb3IgZXh0ZW5kcyBQYXJzZUVycm9yIHtcbiAgY29uc3RydWN0b3Ioc3BhbjogUGFyc2VTb3VyY2VTcGFuLCBtc2c6IHN0cmluZykgeyBzdXBlcihzcGFuLCBtc2cpOyB9XG59XG5cblxuLy8gTWFuLCB0aGlzIGlzIHNvIHVnbHkhXG5leHBvcnQgZnVuY3Rpb24gcGFydGl0aW9uKG5vZGVzOiBIdG1sQXN0W10sIGVycm9yczogUGFyc2VFcnJvcltdKTogUGFydFtdIHtcbiAgbGV0IHJlcyA9IFtdO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyArK2kpIHtcbiAgICBsZXQgbiA9IG5vZGVzW2ldO1xuICAgIGxldCB0ZW1wID0gW107XG4gICAgaWYgKF9pc09wZW5pbmdDb21tZW50KG4pKSB7XG4gICAgICBsZXQgaTE4biA9ICg8SHRtbENvbW1lbnRBc3Q+bikudmFsdWUuc3Vic3RyaW5nKDUpLnRyaW0oKTtcbiAgICAgIGkrKztcbiAgICAgIHdoaWxlICghX2lzQ2xvc2luZ0NvbW1lbnQobm9kZXNbaV0pKSB7XG4gICAgICAgIHRlbXAucHVzaChub2Rlc1tpKytdKTtcbiAgICAgICAgaWYgKGkgPT09IG5vZGVzLmxlbmd0aCkge1xuICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBJMThuRXJyb3Iobi5zb3VyY2VTcGFuLCBcIk1pc3NpbmcgY2xvc2luZyAnaTE4bicgY29tbWVudC5cIikpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXMucHVzaChuZXcgUGFydChudWxsLCBudWxsLCB0ZW1wLCBpMThuLCB0cnVlKSk7XG5cbiAgICB9IGVsc2UgaWYgKG4gaW5zdGFuY2VvZiBIdG1sRWxlbWVudEFzdCkge1xuICAgICAgbGV0IGkxOG4gPSBfZmluZEkxOG5BdHRyKG4pO1xuICAgICAgcmVzLnB1c2gobmV3IFBhcnQobiwgbnVsbCwgbi5jaGlsZHJlbiwgaXNQcmVzZW50KGkxOG4pID8gaTE4bi52YWx1ZSA6IG51bGwsIGlzUHJlc2VudChpMThuKSkpO1xuICAgIH0gZWxzZSBpZiAobiBpbnN0YW5jZW9mIEh0bWxUZXh0QXN0KSB7XG4gICAgICByZXMucHVzaChuZXcgUGFydChudWxsLCBuLCBudWxsLCBudWxsLCBmYWxzZSkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBjbGFzcyBQYXJ0IHtcbiAgY29uc3RydWN0b3IocHVibGljIHJvb3RFbGVtZW50OiBIdG1sRWxlbWVudEFzdCwgcHVibGljIHJvb3RUZXh0Tm9kZTogSHRtbFRleHRBc3QsXG4gICAgICAgICAgICAgIHB1YmxpYyBjaGlsZHJlbjogSHRtbEFzdFtdLCBwdWJsaWMgaTE4bjogc3RyaW5nLCBwdWJsaWMgaGFzSTE4bjogYm9vbGVhbikge31cblxuICBnZXQgc291cmNlU3BhbigpOiBQYXJzZVNvdXJjZVNwYW4ge1xuICAgIGlmIChpc1ByZXNlbnQodGhpcy5yb290RWxlbWVudCkpXG4gICAgICByZXR1cm4gdGhpcy5yb290RWxlbWVudC5zb3VyY2VTcGFuO1xuICAgIGVsc2UgaWYgKGlzUHJlc2VudCh0aGlzLnJvb3RUZXh0Tm9kZSkpXG4gICAgICByZXR1cm4gdGhpcy5yb290VGV4dE5vZGUuc291cmNlU3BhbjtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gdGhpcy5jaGlsZHJlblswXS5zb3VyY2VTcGFuO1xuICB9XG5cbiAgY3JlYXRlTWVzc2FnZShwYXJzZXI6IFBhcnNlcik6IE1lc3NhZ2Uge1xuICAgIHJldHVybiBuZXcgTWVzc2FnZShzdHJpbmdpZnlOb2Rlcyh0aGlzLmNoaWxkcmVuLCBwYXJzZXIpLCBtZWFuaW5nKHRoaXMuaTE4biksXG4gICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uKHRoaXMuaTE4bikpO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9pc09wZW5pbmdDb21tZW50KG46IEh0bWxBc3QpOiBib29sZWFuIHtcbiAgcmV0dXJuIG4gaW5zdGFuY2VvZiBIdG1sQ29tbWVudEFzdCAmJiBpc1ByZXNlbnQobi52YWx1ZSkgJiYgbi52YWx1ZS5zdGFydHNXaXRoKFwiaTE4bjpcIik7XG59XG5cbmZ1bmN0aW9uIF9pc0Nsb3NpbmdDb21tZW50KG46IEh0bWxBc3QpOiBib29sZWFuIHtcbiAgcmV0dXJuIG4gaW5zdGFuY2VvZiBIdG1sQ29tbWVudEFzdCAmJiBpc1ByZXNlbnQobi52YWx1ZSkgJiYgbi52YWx1ZSA9PSBcIi9pMThuXCI7XG59XG5cbmZ1bmN0aW9uIF9maW5kSTE4bkF0dHIocDogSHRtbEVsZW1lbnRBc3QpOiBIdG1sQXR0ckFzdCB7XG4gIGxldCBpMThuID0gcC5hdHRycy5maWx0ZXIoYSA9PiBhLm5hbWUgPT0gSTE4Tl9BVFRSKTtcbiAgcmV0dXJuIGkxOG4ubGVuZ3RoID09IDAgPyBudWxsIDogaTE4blswXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1lYW5pbmcoaTE4bjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGlzQmxhbmsoaTE4bikgfHwgaTE4biA9PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIGkxOG4uc3BsaXQoXCJ8XCIpWzBdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpcHRpb24oaTE4bjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGlzQmxhbmsoaTE4bikgfHwgaTE4biA9PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgbGV0IHBhcnRzID0gaTE4bi5zcGxpdChcInxcIik7XG4gIHJldHVybiBwYXJ0cy5sZW5ndGggPiAxID8gcGFydHNbMV0gOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWVzc2FnZUZyb21BdHRyaWJ1dGUocGFyc2VyOiBQYXJzZXIsIHA6IEh0bWxFbGVtZW50QXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHI6IEh0bWxBdHRyQXN0KTogTWVzc2FnZSB7XG4gIGxldCBleHBlY3RlZE5hbWUgPSBhdHRyLm5hbWUuc3Vic3RyaW5nKDUpO1xuICBsZXQgbWF0Y2hpbmcgPSBwLmF0dHJzLmZpbHRlcihhID0+IGEubmFtZSA9PSBleHBlY3RlZE5hbWUpO1xuXG4gIGlmIChtYXRjaGluZy5sZW5ndGggPiAwKSB7XG4gICAgbGV0IHZhbHVlID0gcmVtb3ZlSW50ZXJwb2xhdGlvbihtYXRjaGluZ1swXS52YWx1ZSwgbWF0Y2hpbmdbMF0uc291cmNlU3BhbiwgcGFyc2VyKTtcbiAgICByZXR1cm4gbmV3IE1lc3NhZ2UodmFsdWUsIG1lYW5pbmcoYXR0ci52YWx1ZSksIGRlc2NyaXB0aW9uKGF0dHIudmFsdWUpKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgSTE4bkVycm9yKHAuc291cmNlU3BhbiwgYE1pc3NpbmcgYXR0cmlidXRlICcke2V4cGVjdGVkTmFtZX0nLmApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVJbnRlcnBvbGF0aW9uKHZhbHVlOiBzdHJpbmcsIHNvdXJjZTogUGFyc2VTb3VyY2VTcGFuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyOiBQYXJzZXIpOiBzdHJpbmcge1xuICB0cnkge1xuICAgIGxldCBwYXJzZWQgPSBwYXJzZXIuc3BsaXRJbnRlcnBvbGF0aW9uKHZhbHVlLCBzb3VyY2UudG9TdHJpbmcoKSk7XG4gICAgaWYgKGlzUHJlc2VudChwYXJzZWQpKSB7XG4gICAgICBsZXQgcmVzID0gXCJcIjtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyc2VkLnN0cmluZ3MubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgcmVzICs9IHBhcnNlZC5zdHJpbmdzW2ldO1xuICAgICAgICBpZiAoaSAhPSBwYXJzZWQuc3RyaW5ncy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgcmVzICs9IGA8cGggbmFtZT1cIiR7aX1cIi8+YDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5Tm9kZXMobm9kZXM6IEh0bWxBc3RbXSwgcGFyc2VyOiBQYXJzZXIpOiBzdHJpbmcge1xuICBsZXQgdmlzaXRvciA9IG5ldyBfU3RyaW5naWZ5VmlzaXRvcihwYXJzZXIpO1xuICByZXR1cm4gaHRtbFZpc2l0QWxsKHZpc2l0b3IsIG5vZGVzKS5qb2luKFwiXCIpO1xufVxuXG5jbGFzcyBfU3RyaW5naWZ5VmlzaXRvciBpbXBsZW1lbnRzIEh0bWxBc3RWaXNpdG9yIHtcbiAgcHJpdmF0ZSBfaW5kZXg6IG51bWJlciA9IDA7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgX3BhcnNlcjogUGFyc2VyKSB7fVxuXG4gIHZpc2l0RWxlbWVudChhc3Q6IEh0bWxFbGVtZW50QXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIGxldCBuYW1lID0gdGhpcy5faW5kZXgrKztcbiAgICBsZXQgY2hpbGRyZW4gPSB0aGlzLl9qb2luKGh0bWxWaXNpdEFsbCh0aGlzLCBhc3QuY2hpbGRyZW4pLCBcIlwiKTtcbiAgICByZXR1cm4gYDxwaCBuYW1lPVwiZSR7bmFtZX1cIj4ke2NoaWxkcmVufTwvcGg+YDtcbiAgfVxuXG4gIHZpc2l0QXR0cihhc3Q6IEh0bWxBdHRyQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkgeyByZXR1cm4gbnVsbDsgfVxuXG4gIHZpc2l0VGV4dChhc3Q6IEh0bWxUZXh0QXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIGxldCBpbmRleCA9IHRoaXMuX2luZGV4Kys7XG4gICAgbGV0IG5vSW50ZXJwb2xhdGlvbiA9IHJlbW92ZUludGVycG9sYXRpb24oYXN0LnZhbHVlLCBhc3Quc291cmNlU3BhbiwgdGhpcy5fcGFyc2VyKTtcbiAgICBpZiAobm9JbnRlcnBvbGF0aW9uICE9IGFzdC52YWx1ZSkge1xuICAgICAgcmV0dXJuIGA8cGggbmFtZT1cInQke2luZGV4fVwiPiR7bm9JbnRlcnBvbGF0aW9ufTwvcGg+YDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGFzdC52YWx1ZTtcbiAgICB9XG4gIH1cblxuICB2aXNpdENvbW1lbnQoYXN0OiBIdG1sQ29tbWVudEFzdCwgY29udGV4dDogYW55KTogYW55IHsgcmV0dXJuIFwiXCI7IH1cblxuICBwcml2YXRlIF9qb2luKHN0cnM6IHN0cmluZ1tdLCBzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHN0cnMuZmlsdGVyKHMgPT4gcy5sZW5ndGggPiAwKS5qb2luKHN0cik7XG4gIH1cbn1cbiJdfQ==