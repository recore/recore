import VisionTypes, { primitiveTypeMaps } from './vision-types';
import { isReactComponent } from './is-react';
import { ComponentClass, isValidElement } from 'react';
import { isElement } from './dom';

(window as any).PropTypes = VisionTypes;
(window as any).React.PropTypes = VisionTypes;

export function describeComponent(view: any, uri?: string) {
  if (!view || typeof view === 'string') {
    return {};
  }
  if (view.prototypeConfig) {
    return view.prototypeConfig;
  }

  try {
    view.prototypeConfig = {};
  } catch (ex) {
    return {};
  }

  const visionTypes = parseVisionTypes(view);
  const componentName = view.displayName || 'UnknownComponent';
  const configure = generatePrototypeConfigure(visionTypes);
  const prototypeConfig: any =
    configure.length < 1
      ? {}
      : {
          uri,
          title: componentName,
          configure,
          isContainer: Object.keys(view.propTypes || {}).some((propType) => propType === 'children'),
        };
  const sub = getSubComponent(view);
  // view.Item view.Node view.Option  set subcontrolling: true, childWhiteList
  if (sub) {
    prototypeConfig.subControlling = true;
    if (uri) {
      prototypeConfig.nesting = {
        childWhitelist: [`${uri}.${sub}`],
      };
    }
  } else if (uri) {
    let m;
    // uri match xx.Group set subcontrolling: true, childWhiteList
    if ((m = /^(.+)\.Group$/.exec(uri))) {
      prototypeConfig.subControlling = true;
      prototypeConfig.nesting = {
        childWhitelist: [`${m[1]}`],
      };
    }
    // uri match xx.Node set selfControlled: false, parentWhiteList
    else if ((m = /^(.+)\.Node$/.exec(uri))) {
      prototypeConfig.selfControlled = false;
      prototypeConfig.nesting = {
        parentWhitelist: [`${m[1]}`, uri],
      };
    }
    // uri match .Item .Node .Option set parentWhiteList
    else if ((m = /^(.+)\.(Item|Node|Option)$/.exec(uri))) {
      prototypeConfig.nesting = {
        parentWhitelist: [`${m[1]}`],
      };
    }
  }

  view.prototypeConfig = prototypeConfig;
  return prototypeConfig;
}

const subComponentPattern = ['Item', 'Node', 'Option'];
function getSubComponent(view: any) {
  let i = subComponentPattern.length;
  while (i-- > 0) {
    const sub = subComponentPattern[i];
    if (isReactComponent(view[sub])) {
      return sub;
    }
  }
  return false;
}

const primitiveTypeKeys = Object.keys(primitiveTypeMaps);

const BasicTypes = ['string', 'number', 'object'];
function parseVisionTypes(view: ComponentClass) {
  const propTypes = view.propTypes || ({} as any);
  const defaultProps = view.defaultProps || ({} as any);
  const result: any = {};
  if (!propTypes) return {};
  Object.keys(propTypes).forEach((key) => {
    const propTypeItem = propTypes[key];
    const defaultValue = defaultProps[key];
    let visionType = propTypeItem.visionType;
    if (visionType) {
      result[key] = {
        ...visionType,
      };
      if (defaultValue != null) {
        result[key].defaultValue = defaultValue;
      }
      return;
    }

    let i = primitiveTypeKeys.length;
    while (i-- > 0) {
      const k = primitiveTypeKeys[i];
      if ((VisionTypes as any)[k] === propTypeItem) {
        result[key] = {
          ...(primitiveTypeMaps as any)[k],
          defaultValue,
        };
        if (defaultValue != null) {
          result[key].defaultValue = defaultValue;
        }
        return;
      }
    }
    result[key] = {
      ...primitiveTypeMaps.any,
      defaultValue,
    };
  });

  Object.keys(defaultProps).forEach((key) => {
    if (result[key]) return;
    const defaultValue = defaultProps[key];
    let type: string = typeof defaultValue;
    if (type === 'boolean') {
      type = 'bool';
    } else if (type === 'function') {
      type = 'func';
    } else if (type === 'object' && Array.isArray(defaultValue)) {
      type = 'array';
    } else if (defaultValue && isValidElement(defaultValue)) {
      type = 'node';
    } else if (defaultValue && isElement(defaultValue)) {
      type = 'element';
    } else if (!BasicTypes.includes(type)) {
      type = 'any';
    }

    result[key] = {
      ...((primitiveTypeMaps as any)[type] || primitiveTypeMaps.any),
      defaultValue,
    };
  });

  return result;
}

function generatePrototypeConfigure(visionTypes: any = {}) {
  const configure: any[] = [];

  Object.keys(visionTypes).forEach((key) => {
    if (key === 'children') {
      return;
    }

    // TODO: process visionTypes[key] itemType & props

    configure.push({
      title: key,
      name: key,
      ...visionTypes[key],
    });
  });

  return configure;
}
