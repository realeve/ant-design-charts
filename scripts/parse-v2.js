const esprima = require('esprima');
const estraverse = require('estraverse');
const escodegen = require('escodegen');
const { get } = require('loadsh');

let blcokBody = '';
let fetchUrl = '';
let chartName = '';
const filterParams = ['then'];

/**
 * import语句
 * @param {*} node
 */
const isImport = (node) => {
  return node.type === 'ImportDeclaration';
};

/**
 * render
 * @param {*} node
 */
const isRender = (node) => {
  return node.type === 'CallExpression' && get(node, 'callee.property.name') === 'render';
};

/**
 * nullExpression
 * @param {*} node
 */
const isNullExpression = (node) => {
  return node.type === 'ExpressionStatement' && !node.expression;
};

/**
 * isFetch
 * @param {*} node
 */
const isFetch = (node) => {
  return node.type === 'MemberExpression' && get(node, 'object.callee.name') === 'fetch';
};

/**
 * new表达式
 * @param {*} node
 */
const isNewExpression = (node) => {
  return node.type === 'VariableDeclarator' && get(node, 'init.type') === 'NewExpression';
};

// 状态重置
const reset = () => {
  blcokBody = '';
  fetchUrl = '';
  chartName = '';
};

// 提取核心信息
const getOptions = (ast) => {
  estraverse.replace(ast, {
    enter: (node) => {
      if (isFetch(node)) {
        fetchUrl = node.object.arguments[0].value;
      }
      if (node.type === 'ArrowFunctionExpression' && get(node, ['params', 0, 'name']) === 'data') {
        const block = get(node, 'body.body', []);
        block.forEach((item) => {
          blcokBody += escodegen.generate(item);
        });
        return estraverse.VisitorOption.Remove;
      }
      if (isNewExpression(node)) {
        chartName = get(node, 'init.callee.name');
        node.id.name = 'config';
        node.init = node.init.arguments[1];
      }
    },
  });
};

// 独立处理body
const generateBody = (body) => {
  const bodyCode = esprima.parseModule(body, { loc: true, tokens: true });
  estraverse.replace(bodyCode, {
    enter: (node) => {
      if (isNewExpression(node)) {
        node.id.name = 'config';
        node.init = node.init.arguments[1];
      }
      if (isRender(node)) {
        return esprima.parseScript('');
      }
    },
  });
  return escodegen.generate(bodyCode);
};

/**
 * 过滤多余信息
 */
const generateFile = (ast) => {
  estraverse.replace(ast, {
    enter: (node) => {
      if (isImport(node)) {
        return estraverse.VisitorOption.Remove;
      }
      if (node.type === 'CallExpression' && filterParams.includes(get(node, 'callee.property.name'))) {
        return esprima.parseScript('CONSTANTCODE');
      }
    },
    leave: (node) => {
      if (node.type === 'Identifier' && get(node, 'name') === 'CONSTANTCODE') {
        const code = `
        const [data, setData] = useState([]);

        useEffect(() => {
          asyncFetch();
        }, []);

        const asyncFetch = () => {
          fetch("${fetchUrl}")
            .then((response) => response.json())
            .then((json) => setData(json))
            .catch((error) => {
              console.log("fetch data failed", error);
            });
        };
        ${generateBody(blcokBody)}
        `;
        return esprima.parseScript(code);
      }
      if (isRender(node) || isNullExpression(node)) {
        return estraverse.VisitorOption.Remove;
      }
      if (isNewExpression(node)) {
        node.id.name = 'config';
        node.init = node.init.arguments[1];
      }
    },
    fallback: (node) => {
      console.log('fallback: ', node.type);
    },
  });
};

const parseFile = (jsCode) => {
  reset();
  const parseCode = esprima.parseModule(jsCode, { loc: true, tokens: true });
  getOptions(parseCode);
  generateFile(parseCode);
  return {
    chartContent: escodegen.generate(parseCode),
    chartName,
  };
};

module.exports = parseFile;
