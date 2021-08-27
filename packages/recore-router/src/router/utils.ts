import pathToRegexp from 'path-to-regexp';
import { Location } from '@recore/history';
import { shallowEqual } from '@recore/utils';
import { parseQuery } from '../utils';

const patternCache: any = {};
const cacheLimit = 10000;
let cacheCount = 0;

export interface Compiled {
  re: RegExp;
  keys: pathToRegexp.Key[];
}

function compilePath(pattern: string, options: any): Compiled {
  const cacheKey = `${options.end}${options.strict}${options.sensitive}`;
  const cache = patternCache[cacheKey] || (patternCache[cacheKey] = {});

  if (cache[pattern]) return cache[pattern];

  const keys: pathToRegexp.Key[] = [];
  const re = pathToRegexp(pattern, keys, options);
  const compiledPattern = { re, keys };

  if (cacheCount < cacheLimit) {
    cache[pattern] = compiledPattern;
    cacheCount++;
  }

  return compiledPattern;
}

function compileGenerator(pattern: string): pathToRegexp.PathFunction {
  const cacheKey = pattern;
  const cache = patternCache[cacheKey] || (patternCache[cacheKey] = {});

  if (cache.generator) return cache.generator;

  const compiledGenerator = pathToRegexp.compile(pattern);

  if (cacheCount < cacheLimit) {
    cache.generator = compiledGenerator;
    cacheCount++;
  }

  return compiledGenerator;
}

export class MatchResult {
  constructor(
    public path: string = '/',
    public url: string = '/',
    public isExact: boolean = false,
    public params: { [key: string]: any } = {},
  ) {}
}

/**
 * Public API for matching a URL pathname to a path pattern.
 */
export function matchPath(
  pathname: string,
  options: MatchOptions | string = {},
  parent?: MatchResult,
): MatchResult | null | undefined {
  if (typeof options === 'string') {
    options = { path: options };
  }

  let { path, exact = false, strict = false, sensitive = false } = options;

  if (path == null) {
    return parent;
  }

  if (path.slice(-3) === '/**' || path === '**') {
    path = path === '**' ? '' : path.slice(0, -3) || '/';
    exact = false;
  }

  path = resolve(path, parent ? parent.url : '/');

  const { re, keys } = compilePath(path, { end: exact, strict, sensitive });
  const match = re.exec(pathname);

  if (!match) {
    return null;
  }

  const [url, ...values] = match;
  const isExact = pathname === url;

  if (exact && !isExact) return null;

  return new MatchResult(
    path,
    path === '/' && url === '' ? '/' : url,
    isExact,
    keys.reduce<{ [k: string]: any }>((memo, key, index) => {
      memo[key.name] = values[index];
      return memo;
    }, {}),
  );
}

export interface MatchOptions {
  path?: string;
  exact?: boolean;
  strict?: boolean;
  sensitive?: boolean;
}

/**
 * Public API for generating a URL pathname from a pattern and parameters.
 */
export function generatePath(pattern = '/', params = {}): string {
  if (pattern === '/') {
    return pattern;
  }
  const generator = compileGenerator(pattern);
  return generator(params);
}

function normalizeArray(parts: string[], allowAboveRoot: boolean) {
  const res = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];

    // ignore empty parts
    if (!p || p === '.') {
      continue;
    }

    if (p === '..') {
      if (res.length && res[res.length - 1] !== '..') {
        res.pop();
      } else if (allowAboveRoot) {
        res.push('..');
      }
    } else {
      res.push(p);
    }
  }

  return res;
}
function normalize(path: string): string {
  const isAbsolute = path[0] === '/';

  const segments = normalizeArray(path.split('/'), !isAbsolute);
  if (isAbsolute) {
    segments.unshift('');
  } else if (segments.length < 1 || segments[0] !== '..') {
    segments.unshift('.');
  }

  return segments.join('/');
}

export function resolve(id: string, base?: string): string {
  id = id.replace(/\\/g, '/');
  if (id[0] !== '/' && base) {
    if (base.slice(-1) !== '/') {
      base += '/';
    }
    id = `${base}${id}`;
  }

  return normalize(id);
}

export function locationIs(loc1: any, loc2: any) {
  if (loc1 === loc2) {
    return true;
  }
  if (!loc1 || !loc2 || loc1.pathname + loc1.search !== loc2.pathname + loc2.search) {
    return false;
  }
  return shallowEqual(loc1.state, loc2.state);
}

export function generateCommonRouterProps(location: Location, match: MatchResult) {
  return {
    params: match?.params,
    path: location?.pathname,
    query: parseQuery(location?.search),
    uri: location?.pathname + location?.search,
    state: location?.state,
  };
}
