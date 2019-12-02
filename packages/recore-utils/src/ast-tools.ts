import { parseExpression, types, generate, GenerateOptions, traverse, Scope, transformFromAst } from 'my-babel';
import { hasOwnProperty } from './has-own-property';

// FIXME: move to recore adaptor

/**
 * Start VisionX related AST utils
 */
export function parseExpr(code: string) {
  if (!code) {
    return null;
  }

  const plugins = [
    'jsx',
    'optionalChaining',
    ['decorators', { decoratorsBeforeExport: true }],
    'objectRestSpread',
    ['pipelineOperator', { proposal: 'minimal' }],
  ];

  return parseExpression(code, {
    plugins,
  });
}

// multiline trim
export function mlTrim(str: string): string {
  const lines = str.split(/\r\n|\n|\r/);
  let lastNonEmptyLine = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/[^ \t]/)) {
      lastNonEmptyLine = i;
    }
  }

  let out = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const isFirstLine = i === 0;
    const isLastLine = i === lines.length - 1;
    const isLastNonEmptyLine = i === lastNonEmptyLine;

    // replace rendered whitespace tabs with spaces
    let trimmedLine = line.replace(/\t/g, ' ');

    // trim whitespace touching a newline
    if (!isFirstLine) {
      trimmedLine = trimmedLine.replace(/^[ ]+/, '');
    }

    // trim whitespace touching an endline
    if (!isLastLine) {
      trimmedLine = trimmedLine.replace(/[ ]+$/, '');
    }

    if (trimmedLine) {
      if (!isLastNonEmptyLine) {
        trimmedLine += ' ';
      }

      out += trimmedLine;
    }
  }
  return out;
}

export function tocode(ast: object, options: GenerateOptions = {}) {
  return generate(ast, options).code;
}

const origAddGlobal = Scope.prototype.addGlobal;
Scope.prototype.addGlobal = function addGlobal(node: any) {
  origAddGlobal.call(this, node);
  if (!this.xglobals) {
    this.xglobals = [];
  }
  this.xglobals.push(node);
};

function isGlobalScope(scope: any): boolean {
  if (types.isProgram(scope.block)) {
    return true;
  }

  if (types.isArrowFunctionExpression(scope.block)) {
    return isGlobalScope(scope.parent);
  }

  return false;
}

function cutOperator(operator: string): any {
  return operator.substr(0, operator.length - 1);
}

function replaceWithScope(path: any, property: any, computed: boolean) {
  if (types.isAssignmentExpression(path.parent) && path.key === 'left') {
    let right = path.parent.right;
    if (path.parent.operator !== '=') {
      right = types.binaryExpression(
        cutOperator(path.parent.operator),
        types.callExpression(types.memberExpression(types.identifier('$scope'), types.identifier('_get')), [
          computed ? property : types.stringLiteral(property.name),
        ]),
        right,
      );
    }
    path.parentPath.replaceWith(
      types.callExpression(types.memberExpression(types.identifier('$scope'), types.identifier('_set')), [
        computed ? property : types.stringLiteral(property.name),
        right,
      ]),
    );
    path.parentPath.skip();
  } else if (types.isUpdateExpression(path.parent)) {
    // error
  } else {
    path.replaceWith(
      types.callExpression(types.memberExpression(types.identifier('$scope'), types.identifier('_get')), [
        computed ? property : types.stringLiteral(property.name),
      ]),
    );
    path.skip();
  }
}

function replaceGlobals(file: types.File) {
  let globals: any[] | null;
  const bindings: any[] | null = null;

  function isGlobal(node: any) {
    return globals && globals.indexOf(node) > -1;
  }

  function isBinding(name: string) {
    return hasOwnProperty(bindings, name);
  }

  traverse(file, {
    enter(path: any) {
      if (path.isProgram()) {
        globals = path.scope.xglobals || [];
      } else if (path.isThisExpression()) {
        if (isGlobalScope(path.scope)) {
          if (types.isMemberExpression(path.parent)) {
            replaceWithScope(path.parentPath, path.parent.property, path.parent.computed);
          } else {
            path.replaceWith(types.identifier('$scope'));
            path.skip();
          }
        }
      } else if (path.isIdentifier()) {
        const name = path.node.name;
        if (isGlobal(path.node) && name !== '$scope' && name !== 'window' && name !== 'arguments' && !isBinding(name)) {
          replaceWithScope(path, types.identifier(name), false);
        }
      }
    },
  });
}

function transformAndGenerateCode(file: types.File): string {
  const { code } = transformFromAst(file, '', {
    filename: 'null', // required
    sourceType: 'script', // to avoid "strict"
    code: true,
    babelrc: false,
    presets: [
      [
        'stage-0',
        {
          decoratorsBeforeExport: true,
        },
      ],
      // 'react',
      'typescript',
    ],
  });

  return code;
}

export function transformExpr(expr: types.Expression) {
  const file = types.file(types.program([types.returnStatement(types.cloneDeep(expr))]), null, null);
  replaceGlobals(file);
  return transformAndGenerateCode(file);
}
