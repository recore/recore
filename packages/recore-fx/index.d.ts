import { ReactType, Component, ComponentClass, ReactNode, ReactInstance, StatelessComponent, ClassicElement, AnchorHTMLAttributes, ComponentType } from 'react';
import {
  History,
  HashHistoryBuildOptions,
  BrowserHistoryBuildOptions,
  MemoryHistoryBuildOptions,
  LocationState,
  LocationDescriptor,
} from '@recore/history';

export as namespace Recore;
export = Recore;

declare namespace Recore {
  const version: string;
  const prerendering: boolean;
  const navigator: Navigator;

  interface ActionExecuteContext {
    readonly previousResult: any;
    [property: string]: any;
  }

  interface PageRequest {
    readonly uri: string;
    readonly path: string;
    readonly query: { [key: string]: any };
    readonly params: { [key: string]: any };
    readonly state: any;
  }

  abstract class ViewController<T extends Object = PageRequest> {
    readonly $props: T;
    readonly $refs: { readonly [key: string]: ReactInstance & { [api: string]: any } };
    readonly $prerendering: boolean;
    readonly $root: ReactInstance & { [api: string]: any };
    readonly $top: ViewController<T>;
    readonly $utils: UtilsMap;
    /**
     * same as .$utils
     */
    readonly utils: UtilsMap;

    static components?: ComponentsMap;
    /**
     * @deprecated use *utils* instead
     */
    static helpers?: UtilsMap;
    static utils?: UtilsMap;

    constructor(props: T);

    /**
     * 通过 x-id 获得节点引用
     */
    $(xid: string): object | null;

    /**
     * 初始化, times: 1
     */
    $init(params: T): void;

    /**
     * 再次接受参数，times: 0+
     */
    $receive(params: T): void;

    /**
     * 页面进入时（初始化 + 再次进入页面）, times: 1+
     */
    $enter(firstEnter: boolean): void;

    /**
     * 页面挂载 times: 1
     */
    $didMount(): void;

    /**
     * 页面卸载 times: 1
     */
    $destroy(): void;
  }

  type HistoryMode = 'browser' | 'hash' | 'memory';

  type HistoryOptions = {
    mode?: HistoryMode;
  } & (HashHistoryBuildOptions | BrowserHistoryBuildOptions | MemoryHistoryBuildOptions);

  interface Navigator {
    history: History;
    goto(path: string, state?: LocationState, reload?: true): void;
    goBack(): void;
  }

  /** helpers */

  function $get(target: any, key: string): any;
  function $set(target: any, key: string, val: any): void;
  function $del(target: any, key: string): void;
  function $extend(target: any, properties: object): void;
  function $raw(target: any): any;

  function nextTick(callback?: () => void): Promise<any>;

  class Reaction {
    readonly id: string;
    readonly scheduled: boolean;
    readonly caughtException: any;

    constructor(
      name: string,
      check: () => void,
      level: number,
      throttleWait: number
    );
    schedule(): void;
    isDirty(): boolean;
    run(): void;
    track(fn: () => void): void;
    sleep(): void;
    wakeup(sync?: boolean): void;
  }

  interface Disposer {
    (): void;
    name?: string;
    $obx: Reaction;
  }

  interface RunContext {
    dispose: Disposer;
    firstRun: boolean;
  }

  interface Action {
    (this: RunContext, context: RunContext): any;
    name?: string;
  }

  type AutorunOptions = number | boolean | {
    throttle?: number;
    sync?: boolean;
    level?: number;
    name?: string;
  }

  function autorun(action: Action, options?: AutorunOptions): Disposer;

  function untracked<T>(action: () => T): T;

  function reportChange(obj: any, force?: boolean): void;
  function asNewValue<T extends object>(obj: T): T;

  function getGlobalLocale(): string;
  function setGlobalLocale(locale: string): void;

  interface CorpusQueryer {
    (k: string, ...vars: any[]): string;
    setLocale(locale: string): void;
    locale: string;
  }

  function createI18n(key: string, locale?: string): CorpusQueryer;

  interface Mockable<T> {
    mock?: T;
  }

  function mockable<T extends Function>(fn: T): T & Mockable<T>;

  interface MatchResult {
    readonly path: string;
    readonly url: string;
    readonly isExact: boolean;
    readonly params: { [key: string]: any };
  }

  interface MatchOptions {
    path?: string;
    exact?: boolean;
    strict?: boolean;
    sensitive?: boolean;
  }

  function matchPath(
    pathname: string,
    options: MatchOptions | string,
    parent?: MatchResult
  ): MatchResult | null | undefined;

  /** decorators */

  interface DecoratorObservable {
    // observable overloads
    (value: number | string | null | undefined | boolean): never; // Nope, not supported, use box
    (target: any, prop: string | symbol, descriptor?: PropertyDescriptor): any; // decorator
    <T extends Object>(value: T): T;
  }

  interface DecoratorObservableNamespace extends DecoratorObservable {
    ref: DecoratorObservable;
    val: DecoratorObservable;
    shallow: DecoratorObservable;
    deep: DecoratorObservable;
  }

  const observable: DecoratorObservableNamespace;
  const obx: DecoratorObservableNamespace;

  interface DecoratorComputed extends DecoratorObservable {
    (value: () => any): { value: any };
  }

  const computed: DecoratorComputed;

  enum ObxFlag {
    REF = 0,
    VAL = 1,
    SHALLOW = 2,
    DEEP = 3,
  }

  function obxProperty(target: any, prop: string, flag?: ObxFlag): void;

  /**
   * decorator for receive one prop
   */
  function prop(target: any, prop: string | symbol, descriptor?: PropertyDescriptor): any;

  interface ComponentsMap {
    [key: string]: ReactType;
  }

  interface UtilsMap {
    [key: string]: any;
  }

  interface VisionXOptions {
    components?: ComponentsMap;
    utils?: UtilsMap;
  }

  function withRouter(Component: ComponentClass): void;

  function observer<T extends ComponentType<any>>(target: T): T;

  /** router components */

  interface RouteProps {
    path: string;
    exact?: boolean;
    strict?: boolean;
    sensitive?: boolean;
    children: StatelessComponent<any>;
  }

  interface RouterProps {
    routes: RouteProps[];
    fixed?: boolean;
  }

  class Router extends Component<RouterProps>{}

  type LinkProps = {
    replace?: boolean;
    to: LocationDescriptor;
  } & AnchorHTMLAttributes<HTMLAnchorElement>;

  class Link extends Component<LinkProps>{}

  type NavLinkProps = LinkProps & {
    exact?: boolean;
    strict?: boolean;
    activeClassName?: string;
    activeStyle?: object;
    isActive?: (match: MatchResult, location: Location) => boolean;
  }

  class NavLink extends Component<NavLinkProps>{}

  /** bootstrap */

  interface AppConfig {
    history?: HistoryMode | HistoryOptions;
    globalComponents?: ComponentsMap;
    globalUtils?: UtilsMap;
    containerId?: string;
    renderError?: (err: any) => ReactNode;
    reportError?: (err: any) => void;
  }

  function runApp(config?: AppConfig | (() => AppConfig), exposeModule?: boolean): any;
  function runApp(Component: any, config?: AppConfig | (() => AppConfig), exposeModule?: boolean): any;

  function destroy(): void;

  // TODO: add types
  function compose(renderFactory: any, ControllerType?: any, routerView?: any): any;
  function createRouter(config: any, pagesMap: any, hooks: any, page?: any): any;
}
