import { isBlank, isPresent, isFunction } from 'angular2/src/facade/lang';
import { BaseException } from 'angular2/src/facade/exceptions';
import { Map } from 'angular2/src/facade/collection';
import { PromiseWrapper } from 'angular2/src/facade/async';
import { RouteRule, RedirectRule, PathMatch } from './rules';
import { Route, AsyncRoute, AuxRoute, Redirect } from '../route_config/route_config_impl';
import { AsyncRouteHandler } from './route_handlers/async_route_handler';
import { SyncRouteHandler } from './route_handlers/sync_route_handler';
import { ParamRoutePath } from './route_paths/param_route_path';
import { RegexRoutePath } from './route_paths/regex_route_path';
/**
 * A `RuleSet` is responsible for recognizing routes for a particular component.
 * It is consumed by `RouteRegistry`, which knows how to recognize an entire hierarchy of
 * components.
 */
export class RuleSet {
    constructor() {
        this.rulesByName = new Map();
        // map from name to rule
        this.auxRulesByName = new Map();
        // map from starting path to rule
        this.auxRulesByPath = new Map();
        // TODO: optimize this into a trie
        this.rules = [];
        // the rule to use automatically when recognizing or generating from this rule set
        this.defaultRule = null;
    }
    /**
     * Configure additional rules in this rule set from a route definition
     * @returns {boolean} true if the config is terminal
     */
    config(config) {
        let handler;
        if (isPresent(config.name) && config.name[0].toUpperCase() != config.name[0]) {
            let suggestedName = config.name[0].toUpperCase() + config.name.substring(1);
            throw new BaseException(`Route "${config.path}" with name "${config.name}" does not begin with an uppercase letter. Route names should be CamelCase like "${suggestedName}".`);
        }
        if (config instanceof AuxRoute) {
            handler = new SyncRouteHandler(config.component, config.data);
            let routePath = this._getRoutePath(config);
            let auxRule = new RouteRule(routePath, handler, config.name);
            this.auxRulesByPath.set(routePath.toString(), auxRule);
            if (isPresent(config.name)) {
                this.auxRulesByName.set(config.name, auxRule);
            }
            return auxRule.terminal;
        }
        let useAsDefault = false;
        if (config instanceof Redirect) {
            let routePath = this._getRoutePath(config);
            let redirector = new RedirectRule(routePath, config.redirectTo);
            this._assertNoHashCollision(redirector.hash, config.path);
            this.rules.push(redirector);
            return true;
        }
        if (config instanceof Route) {
            handler = new SyncRouteHandler(config.component, config.data);
            useAsDefault = isPresent(config.useAsDefault) && config.useAsDefault;
        }
        else if (config instanceof AsyncRoute) {
            handler = new AsyncRouteHandler(config.loader, config.data);
            useAsDefault = isPresent(config.useAsDefault) && config.useAsDefault;
        }
        let routePath = this._getRoutePath(config);
        let newRule = new RouteRule(routePath, handler, config.name);
        this._assertNoHashCollision(newRule.hash, config.path);
        if (useAsDefault) {
            if (isPresent(this.defaultRule)) {
                throw new BaseException(`Only one route can be default`);
            }
            this.defaultRule = newRule;
        }
        this.rules.push(newRule);
        if (isPresent(config.name)) {
            this.rulesByName.set(config.name, newRule);
        }
        return newRule.terminal;
    }
    /**
     * Given a URL, returns a list of `RouteMatch`es, which are partial recognitions for some route.
     */
    recognize(urlParse) {
        var solutions = [];
        this.rules.forEach((routeRecognizer) => {
            var pathMatch = routeRecognizer.recognize(urlParse);
            if (isPresent(pathMatch)) {
                solutions.push(pathMatch);
            }
        });
        // handle cases where we are routing just to an aux route
        if (solutions.length == 0 && isPresent(urlParse) && urlParse.auxiliary.length > 0) {
            return [PromiseWrapper.resolve(new PathMatch(null, null, urlParse.auxiliary))];
        }
        return solutions;
    }
    recognizeAuxiliary(urlParse) {
        var routeRecognizer = this.auxRulesByPath.get(urlParse.path);
        if (isPresent(routeRecognizer)) {
            return [routeRecognizer.recognize(urlParse)];
        }
        return [PromiseWrapper.resolve(null)];
    }
    hasRoute(name) { return this.rulesByName.has(name); }
    componentLoaded(name) {
        return this.hasRoute(name) && isPresent(this.rulesByName.get(name).handler.componentType);
    }
    loadComponent(name) {
        return this.rulesByName.get(name).handler.resolveComponentType();
    }
    generate(name, params) {
        var rule = this.rulesByName.get(name);
        if (isBlank(rule)) {
            return null;
        }
        return rule.generate(params);
    }
    generateAuxiliary(name, params) {
        var rule = this.auxRulesByName.get(name);
        if (isBlank(rule)) {
            return null;
        }
        return rule.generate(params);
    }
    _assertNoHashCollision(hash, path) {
        this.rules.forEach((rule) => {
            if (hash == rule.hash) {
                throw new BaseException(`Configuration '${path}' conflicts with existing route '${rule.path}'`);
            }
        });
    }
    _getRoutePath(config) {
        if (isPresent(config.regex)) {
            if (isFunction(config.serializer)) {
                return new RegexRoutePath(config.regex, config.serializer);
            }
            else {
                throw new BaseException(`Route provides a regex property, '${config.regex}', but no serializer property`);
            }
        }
        if (isPresent(config.path)) {
            // Auxiliary routes do not have a slash at the start
            let path = (config instanceof AuxRoute && config.path.startsWith('/')) ?
                config.path.substring(1) :
                config.path;
            return new ParamRoutePath(path);
        }
        throw new BaseException('Route must provide either a path or regex property');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZV9zZXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkaWZmaW5nX3BsdWdpbl93cmFwcGVyLW91dHB1dF9wYXRoLWV4eFZ0c0xRLnRtcC9hbmd1bGFyMi9zcmMvcm91dGVyL3J1bGVzL3J1bGVfc2V0LnRzIl0sIm5hbWVzIjpbIlJ1bGVTZXQiLCJSdWxlU2V0LmNvbnN0cnVjdG9yIiwiUnVsZVNldC5jb25maWciLCJSdWxlU2V0LnJlY29nbml6ZSIsIlJ1bGVTZXQucmVjb2duaXplQXV4aWxpYXJ5IiwiUnVsZVNldC5oYXNSb3V0ZSIsIlJ1bGVTZXQuY29tcG9uZW50TG9hZGVkIiwiUnVsZVNldC5sb2FkQ29tcG9uZW50IiwiUnVsZVNldC5nZW5lcmF0ZSIsIlJ1bGVTZXQuZ2VuZXJhdGVBdXhpbGlhcnkiLCJSdWxlU2V0Ll9hc3NlcnROb0hhc2hDb2xsaXNpb24iLCJSdWxlU2V0Ll9nZXRSb3V0ZVBhdGgiXSwibWFwcGluZ3MiOiJPQUFPLEVBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUMsTUFBTSwwQkFBMEI7T0FDaEUsRUFBQyxhQUFhLEVBQW1CLE1BQU0sZ0NBQWdDO09BQ3ZFLEVBQUMsR0FBRyxFQUE0QyxNQUFNLGdDQUFnQztPQUN0RixFQUFDLGNBQWMsRUFBQyxNQUFNLDJCQUEyQjtPQUVqRCxFQUFlLFNBQVMsRUFBRSxZQUFZLEVBQWMsU0FBUyxFQUFDLE1BQU0sU0FBUztPQUM3RSxFQUNMLEtBQUssRUFDTCxVQUFVLEVBQ1YsUUFBUSxFQUNSLFFBQVEsRUFFVCxNQUFNLG1DQUFtQztPQUVuQyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sc0NBQXNDO09BQy9ELEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxxQ0FBcUM7T0FHN0QsRUFBQyxjQUFjLEVBQUMsTUFBTSxnQ0FBZ0M7T0FDdEQsRUFBQyxjQUFjLEVBQUMsTUFBTSxnQ0FBZ0M7QUFNN0Q7Ozs7R0FJRztBQUNIO0lBQUFBO1FBQ0VDLGdCQUFXQSxHQUFHQSxJQUFJQSxHQUFHQSxFQUFxQkEsQ0FBQ0E7UUFFM0NBLHdCQUF3QkE7UUFDeEJBLG1CQUFjQSxHQUFHQSxJQUFJQSxHQUFHQSxFQUFxQkEsQ0FBQ0E7UUFFOUNBLGlDQUFpQ0E7UUFDakNBLG1CQUFjQSxHQUFHQSxJQUFJQSxHQUFHQSxFQUFxQkEsQ0FBQ0E7UUFFOUNBLGtDQUFrQ0E7UUFDbENBLFVBQUtBLEdBQW1CQSxFQUFFQSxDQUFDQTtRQUUzQkEsa0ZBQWtGQTtRQUNsRkEsZ0JBQVdBLEdBQWNBLElBQUlBLENBQUNBO0lBbUpoQ0EsQ0FBQ0E7SUFqSkNEOzs7T0FHR0E7SUFDSEEsTUFBTUEsQ0FBQ0EsTUFBdUJBO1FBQzVCRSxJQUFJQSxPQUFPQSxDQUFDQTtRQUVaQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxJQUFJQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUM3RUEsSUFBSUEsYUFBYUEsR0FBR0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsV0FBV0EsRUFBRUEsR0FBR0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDNUVBLE1BQU1BLElBQUlBLGFBQWFBLENBQ25CQSxVQUFVQSxNQUFNQSxDQUFDQSxJQUFJQSxnQkFBZ0JBLE1BQU1BLENBQUNBLElBQUlBLG9GQUFvRkEsYUFBYUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7UUFDN0pBLENBQUNBO1FBRURBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLFlBQVlBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO1lBQy9CQSxPQUFPQSxHQUFHQSxJQUFJQSxnQkFBZ0JBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLEVBQUVBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQzlEQSxJQUFJQSxTQUFTQSxHQUFHQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUMzQ0EsSUFBSUEsT0FBT0EsR0FBR0EsSUFBSUEsU0FBU0EsQ0FBQ0EsU0FBU0EsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDN0RBLElBQUlBLENBQUNBLGNBQWNBLENBQUNBLEdBQUdBLENBQUNBLFNBQVNBLENBQUNBLFFBQVFBLEVBQUVBLEVBQUVBLE9BQU9BLENBQUNBLENBQUNBO1lBQ3ZEQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDM0JBLElBQUlBLENBQUNBLGNBQWNBLENBQUNBLEdBQUdBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLEVBQUVBLE9BQU9BLENBQUNBLENBQUNBO1lBQ2hEQSxDQUFDQTtZQUNEQSxNQUFNQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQTtRQUMxQkEsQ0FBQ0E7UUFFREEsSUFBSUEsWUFBWUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFFekJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLFlBQVlBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO1lBQy9CQSxJQUFJQSxTQUFTQSxHQUFHQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUMzQ0EsSUFBSUEsVUFBVUEsR0FBR0EsSUFBSUEsWUFBWUEsQ0FBQ0EsU0FBU0EsRUFBRUEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7WUFDaEVBLElBQUlBLENBQUNBLHNCQUFzQkEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDMURBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO1lBQzVCQSxN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QSxDQUFDQTtRQUNsQ0EsQ0FBQ0E7UUFDREEsTUFBTUEsSUFBSUEsYUFBYUEsQ0FBQ0Esb0RBQW9EQSxDQUFDQSxDQUFDQTtJQUNoRkEsQ0FBQ0E7QUFDSFgsQ0FBQ0E7QUFBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7aXNCbGFuaywgaXNQcmVzZW50LCBpc0Z1bmN0aW9ufSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2xhbmcnO1xuaW1wb3J0IHtCYXNlRXhjZXB0aW9uLCBXcmFwcGVkRXhjZXB0aW9ufSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2V4Y2VwdGlvbnMnO1xuaW1wb3J0IHtNYXAsIE1hcFdyYXBwZXIsIExpc3RXcmFwcGVyLCBTdHJpbmdNYXBXcmFwcGVyfSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtQcm9taXNlV3JhcHBlcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9hc3luYyc7XG5cbmltcG9ydCB7QWJzdHJhY3RSdWxlLCBSb3V0ZVJ1bGUsIFJlZGlyZWN0UnVsZSwgUm91dGVNYXRjaCwgUGF0aE1hdGNofSBmcm9tICcuL3J1bGVzJztcbmltcG9ydCB7XG4gIFJvdXRlLFxuICBBc3luY1JvdXRlLFxuICBBdXhSb3V0ZSxcbiAgUmVkaXJlY3QsXG4gIFJvdXRlRGVmaW5pdGlvblxufSBmcm9tICcuLi9yb3V0ZV9jb25maWcvcm91dGVfY29uZmlnX2ltcGwnO1xuXG5pbXBvcnQge0FzeW5jUm91dGVIYW5kbGVyfSBmcm9tICcuL3JvdXRlX2hhbmRsZXJzL2FzeW5jX3JvdXRlX2hhbmRsZXInO1xuaW1wb3J0IHtTeW5jUm91dGVIYW5kbGVyfSBmcm9tICcuL3JvdXRlX2hhbmRsZXJzL3N5bmNfcm91dGVfaGFuZGxlcic7XG5cbmltcG9ydCB7Um91dGVQYXRofSBmcm9tICcuL3JvdXRlX3BhdGhzL3JvdXRlX3BhdGgnO1xuaW1wb3J0IHtQYXJhbVJvdXRlUGF0aH0gZnJvbSAnLi9yb3V0ZV9wYXRocy9wYXJhbV9yb3V0ZV9wYXRoJztcbmltcG9ydCB7UmVnZXhSb3V0ZVBhdGh9IGZyb20gJy4vcm91dGVfcGF0aHMvcmVnZXhfcm91dGVfcGF0aCc7XG5cbmltcG9ydCB7VXJsfSBmcm9tICcuLi91cmxfcGFyc2VyJztcbmltcG9ydCB7Q29tcG9uZW50SW5zdHJ1Y3Rpb259IGZyb20gJy4uL2luc3RydWN0aW9uJztcblxuXG4vKipcbiAqIEEgYFJ1bGVTZXRgIGlzIHJlc3BvbnNpYmxlIGZvciByZWNvZ25pemluZyByb3V0ZXMgZm9yIGEgcGFydGljdWxhciBjb21wb25lbnQuXG4gKiBJdCBpcyBjb25zdW1lZCBieSBgUm91dGVSZWdpc3RyeWAsIHdoaWNoIGtub3dzIGhvdyB0byByZWNvZ25pemUgYW4gZW50aXJlIGhpZXJhcmNoeSBvZlxuICogY29tcG9uZW50cy5cbiAqL1xuZXhwb3J0IGNsYXNzIFJ1bGVTZXQge1xuICBydWxlc0J5TmFtZSA9IG5ldyBNYXA8c3RyaW5nLCBSb3V0ZVJ1bGU+KCk7XG5cbiAgLy8gbWFwIGZyb20gbmFtZSB0byBydWxlXG4gIGF1eFJ1bGVzQnlOYW1lID0gbmV3IE1hcDxzdHJpbmcsIFJvdXRlUnVsZT4oKTtcblxuICAvLyBtYXAgZnJvbSBzdGFydGluZyBwYXRoIHRvIHJ1bGVcbiAgYXV4UnVsZXNCeVBhdGggPSBuZXcgTWFwPHN0cmluZywgUm91dGVSdWxlPigpO1xuXG4gIC8vIFRPRE86IG9wdGltaXplIHRoaXMgaW50byBhIHRyaWVcbiAgcnVsZXM6IEFic3RyYWN0UnVsZVtdID0gW107XG5cbiAgLy8gdGhlIHJ1bGUgdG8gdXNlIGF1dG9tYXRpY2FsbHkgd2hlbiByZWNvZ25pemluZyBvciBnZW5lcmF0aW5nIGZyb20gdGhpcyBydWxlIHNldFxuICBkZWZhdWx0UnVsZTogUm91dGVSdWxlID0gbnVsbDtcblxuICAvKipcbiAgICogQ29uZmlndXJlIGFkZGl0aW9uYWwgcnVsZXMgaW4gdGhpcyBydWxlIHNldCBmcm9tIGEgcm91dGUgZGVmaW5pdGlvblxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgY29uZmlnIGlzIHRlcm1pbmFsXG4gICAqL1xuICBjb25maWcoY29uZmlnOiBSb3V0ZURlZmluaXRpb24pOiBib29sZWFuIHtcbiAgICBsZXQgaGFuZGxlcjtcblxuICAgIGlmIChpc1ByZXNlbnQoY29uZmlnLm5hbWUpICYmIGNvbmZpZy5uYW1lWzBdLnRvVXBwZXJDYXNlKCkgIT0gY29uZmlnLm5hbWVbMF0pIHtcbiAgICAgIGxldCBzdWdnZXN0ZWROYW1lID0gY29uZmlnLm5hbWVbMF0udG9VcHBlckNhc2UoKSArIGNvbmZpZy5uYW1lLnN1YnN0cmluZygxKTtcbiAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFxuICAgICAgICAgIGBSb3V0ZSBcIiR7Y29uZmlnLnBhdGh9XCIgd2l0aCBuYW1lIFwiJHtjb25maWcubmFtZX1cIiBkb2VzIG5vdCBiZWdpbiB3aXRoIGFuIHVwcGVyY2FzZSBsZXR0ZXIuIFJvdXRlIG5hbWVzIHNob3VsZCBiZSBDYW1lbENhc2UgbGlrZSBcIiR7c3VnZ2VzdGVkTmFtZX1cIi5gKTtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnIGluc3RhbmNlb2YgQXV4Um91dGUpIHtcbiAgICAgIGhhbmRsZXIgPSBuZXcgU3luY1JvdXRlSGFuZGxlcihjb25maWcuY29tcG9uZW50LCBjb25maWcuZGF0YSk7XG4gICAgICBsZXQgcm91dGVQYXRoID0gdGhpcy5fZ2V0Um91dGVQYXRoKGNvbmZpZyk7XG4gICAgICBsZXQgYXV4UnVsZSA9IG5ldyBSb3V0ZVJ1bGUocm91dGVQYXRoLCBoYW5kbGVyLCBjb25maWcubmFtZSk7XG4gICAgICB0aGlzLmF1eFJ1bGVzQnlQYXRoLnNldChyb3V0ZVBhdGgudG9TdHJpbmcoKSwgYXV4UnVsZSk7XG4gICAgICBpZiAoaXNQcmVzZW50KGNvbmZpZy5uYW1lKSkge1xuICAgICAgICB0aGlzLmF1eFJ1bGVzQnlOYW1lLnNldChjb25maWcubmFtZSwgYXV4UnVsZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYXV4UnVsZS50ZXJtaW5hbDtcbiAgICB9XG5cbiAgICBsZXQgdXNlQXNEZWZhdWx0ID0gZmFsc2U7XG5cbiAgICBpZiAoY29uZmlnIGluc3RhbmNlb2YgUmVkaXJlY3QpIHtcbiAgICAgIGxldCByb3V0ZVBhdGggPSB0aGlzLl9nZXRSb3V0ZVBhdGgoY29uZmlnKTtcbiAgICAgIGxldCByZWRpcmVjdG9yID0gbmV3IFJlZGlyZWN0UnVsZShyb3V0ZVBhdGgsIGNvbmZpZy5yZWRpcmVjdFRvKTtcbiAgICAgIHRoaXMuX2Fzc2VydE5vSGFzaENvbGxpc2lvbihyZWRpcmVjdG9yLmhhc2gsIGNvbmZpZy5wYXRoKTtcbiAgICAgIHRoaXMucnVsZXMucHVzaChyZWRpcmVjdG9yKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmIChjb25maWcgaW5zdGFuY2VvZiBSb3V0ZSkge1xuICAgICAgaGFuZGxlciA9IG5ldyBTeW5jUm91dGVIYW5kbGVyKGNvbmZpZy5jb21wb25lbnQsIGNvbmZpZy5kYXRhKTtcbiAgICAgIHVzZUFzRGVmYXVsdCA9IGlzUHJlc2VudChjb25maWcudXNlQXNEZWZhdWx0KSAmJiBjb25maWcudXNlQXNEZWZhdWx0O1xuICAgIH0gZWxzZSBpZiAoY29uZmlnIGluc3RhbmNlb2YgQXN5bmNSb3V0ZSkge1xuICAgICAgaGFuZGxlciA9IG5ldyBBc3luY1JvdXRlSGFuZGxlcihjb25maWcubG9hZGVyLCBjb25maWcuZGF0YSk7XG4gICAgICB1c2VBc0RlZmF1bHQgPSBpc1ByZXNlbnQoY29uZmlnLnVzZUFzRGVmYXVsdCkgJiYgY29uZmlnLnVzZUFzRGVmYXVsdDtcbiAgICB9XG4gICAgbGV0IHJvdXRlUGF0aCA9IHRoaXMuX2dldFJvdXRlUGF0aChjb25maWcpO1xuICAgIGxldCBuZXdSdWxlID0gbmV3IFJvdXRlUnVsZShyb3V0ZVBhdGgsIGhhbmRsZXIsIGNvbmZpZy5uYW1lKTtcblxuICAgIHRoaXMuX2Fzc2VydE5vSGFzaENvbGxpc2lvbihuZXdSdWxlLmhhc2gsIGNvbmZpZy5wYXRoKTtcblxuICAgIGlmICh1c2VBc0RlZmF1bHQpIHtcbiAgICAgIGlmIChpc1ByZXNlbnQodGhpcy5kZWZhdWx0UnVsZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oYE9ubHkgb25lIHJvdXRlIGNhbiBiZSBkZWZhdWx0YCk7XG4gICAgICB9XG4gICAgICB0aGlzLmRlZmF1bHRSdWxlID0gbmV3UnVsZTtcbiAgICB9XG5cbiAgICB0aGlzLnJ1bGVzLnB1c2gobmV3UnVsZSk7XG4gICAgaWYgKGlzUHJlc2VudChjb25maWcubmFtZSkpIHtcbiAgICAgIHRoaXMucnVsZXNCeU5hbWUuc2V0KGNvbmZpZy5uYW1lLCBuZXdSdWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ld1J1bGUudGVybWluYWw7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIFVSTCwgcmV0dXJucyBhIGxpc3Qgb2YgYFJvdXRlTWF0Y2hgZXMsIHdoaWNoIGFyZSBwYXJ0aWFsIHJlY29nbml0aW9ucyBmb3Igc29tZSByb3V0ZS5cbiAgICovXG4gIHJlY29nbml6ZSh1cmxQYXJzZTogVXJsKTogUHJvbWlzZTxSb3V0ZU1hdGNoPltdIHtcbiAgICB2YXIgc29sdXRpb25zID0gW107XG5cbiAgICB0aGlzLnJ1bGVzLmZvckVhY2goKHJvdXRlUmVjb2duaXplcjogQWJzdHJhY3RSdWxlKSA9PiB7XG4gICAgICB2YXIgcGF0aE1hdGNoID0gcm91dGVSZWNvZ25pemVyLnJlY29nbml6ZSh1cmxQYXJzZSk7XG5cbiAgICAgIGlmIChpc1ByZXNlbnQocGF0aE1hdGNoKSkge1xuICAgICAgICBzb2x1dGlvbnMucHVzaChwYXRoTWF0Y2gpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gaGFuZGxlIGNhc2VzIHdoZXJlIHdlIGFyZSByb3V0aW5nIGp1c3QgdG8gYW4gYXV4IHJvdXRlXG4gICAgaWYgKHNvbHV0aW9ucy5sZW5ndGggPT0gMCAmJiBpc1ByZXNlbnQodXJsUGFyc2UpICYmIHVybFBhcnNlLmF1eGlsaWFyeS5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gW1Byb21pc2VXcmFwcGVyLnJlc29sdmUobmV3IFBhdGhNYXRjaChudWxsLCBudWxsLCB1cmxQYXJzZS5hdXhpbGlhcnkpKV07XG4gICAgfVxuXG4gICAgcmV0dXJuIHNvbHV0aW9ucztcbiAgfVxuXG4gIHJlY29nbml6ZUF1eGlsaWFyeSh1cmxQYXJzZTogVXJsKTogUHJvbWlzZTxSb3V0ZU1hdGNoPltdIHtcbiAgICB2YXIgcm91dGVSZWNvZ25pemVyOiBSb3V0ZVJ1bGUgPSB0aGlzLmF1eFJ1bGVzQnlQYXRoLmdldCh1cmxQYXJzZS5wYXRoKTtcbiAgICBpZiAoaXNQcmVzZW50KHJvdXRlUmVjb2duaXplcikpIHtcbiAgICAgIHJldHVybiBbcm91dGVSZWNvZ25pemVyLnJlY29nbml6ZSh1cmxQYXJzZSldO1xuICAgIH1cblxuICAgIHJldHVybiBbUHJvbWlzZVdyYXBwZXIucmVzb2x2ZShudWxsKV07XG4gIH1cblxuICBoYXNSb3V0ZShuYW1lOiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMucnVsZXNCeU5hbWUuaGFzKG5hbWUpOyB9XG5cbiAgY29tcG9uZW50TG9hZGVkKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmhhc1JvdXRlKG5hbWUpICYmIGlzUHJlc2VudCh0aGlzLnJ1bGVzQnlOYW1lLmdldChuYW1lKS5oYW5kbGVyLmNvbXBvbmVudFR5cGUpO1xuICB9XG5cbiAgbG9hZENvbXBvbmVudChuYW1lOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybiB0aGlzLnJ1bGVzQnlOYW1lLmdldChuYW1lKS5oYW5kbGVyLnJlc29sdmVDb21wb25lbnRUeXBlKCk7XG4gIH1cblxuICBnZW5lcmF0ZShuYW1lOiBzdHJpbmcsIHBhcmFtczogYW55KTogQ29tcG9uZW50SW5zdHJ1Y3Rpb24ge1xuICAgIHZhciBydWxlOiBSb3V0ZVJ1bGUgPSB0aGlzLnJ1bGVzQnlOYW1lLmdldChuYW1lKTtcbiAgICBpZiAoaXNCbGFuayhydWxlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBydWxlLmdlbmVyYXRlKHBhcmFtcyk7XG4gIH1cblxuICBnZW5lcmF0ZUF1eGlsaWFyeShuYW1lOiBzdHJpbmcsIHBhcmFtczogYW55KTogQ29tcG9uZW50SW5zdHJ1Y3Rpb24ge1xuICAgIHZhciBydWxlOiBSb3V0ZVJ1bGUgPSB0aGlzLmF1eFJ1bGVzQnlOYW1lLmdldChuYW1lKTtcbiAgICBpZiAoaXNCbGFuayhydWxlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBydWxlLmdlbmVyYXRlKHBhcmFtcyk7XG4gIH1cblxuICBwcml2YXRlIF9hc3NlcnROb0hhc2hDb2xsaXNpb24oaGFzaDogc3RyaW5nLCBwYXRoKSB7XG4gICAgdGhpcy5ydWxlcy5mb3JFYWNoKChydWxlKSA9PiB7XG4gICAgICBpZiAoaGFzaCA9PSBydWxlLmhhc2gpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXG4gICAgICAgICAgICBgQ29uZmlndXJhdGlvbiAnJHtwYXRofScgY29uZmxpY3RzIHdpdGggZXhpc3Rpbmcgcm91dGUgJyR7cnVsZS5wYXRofSdgKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX2dldFJvdXRlUGF0aChjb25maWc6IFJvdXRlRGVmaW5pdGlvbik6IFJvdXRlUGF0aCB7XG4gICAgaWYgKGlzUHJlc2VudChjb25maWcucmVnZXgpKSB7XG4gICAgICBpZiAoaXNGdW5jdGlvbihjb25maWcuc2VyaWFsaXplcikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWdleFJvdXRlUGF0aChjb25maWcucmVnZXgsIGNvbmZpZy5zZXJpYWxpemVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFxuICAgICAgICAgICAgYFJvdXRlIHByb3ZpZGVzIGEgcmVnZXggcHJvcGVydHksICcke2NvbmZpZy5yZWdleH0nLCBidXQgbm8gc2VyaWFsaXplciBwcm9wZXJ0eWApO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNQcmVzZW50KGNvbmZpZy5wYXRoKSkge1xuICAgICAgLy8gQXV4aWxpYXJ5IHJvdXRlcyBkbyBub3QgaGF2ZSBhIHNsYXNoIGF0IHRoZSBzdGFydFxuICAgICAgbGV0IHBhdGggPSAoY29uZmlnIGluc3RhbmNlb2YgQXV4Um91dGUgJiYgY29uZmlnLnBhdGguc3RhcnRzV2l0aCgnLycpKSA/XG4gICAgICAgICAgICAgICAgICAgICBjb25maWcucGF0aC5zdWJzdHJpbmcoMSkgOlxuICAgICAgICAgICAgICAgICAgICAgY29uZmlnLnBhdGg7XG4gICAgICByZXR1cm4gbmV3IFBhcmFtUm91dGVQYXRoKHBhdGgpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbignUm91dGUgbXVzdCBwcm92aWRlIGVpdGhlciBhIHBhdGggb3IgcmVnZXggcHJvcGVydHknKTtcbiAgfVxufVxuIl19