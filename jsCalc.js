(() => {
  "use strict";

  const decimalPlaces = -1;
  const thousandOpts = [",", ".", " "];
  const decimalOpts = [".", ","];
  const initFire = true;
  const chainFire = true;
  const keyEventsFire = false;
  const readOnlyResults = true;
  const showParseError = true;
  const emptyAsZero = false;
  const smartIntegers = false;
  const onShowResult = null;

  const funcs = {};

  const vars = {};

  const sumFunc = {
    rgx: "sum\\({([^}]+)}\\)",
    exec: function (equation, equationFields, result, context) {
      let sum = 0;
      equationFields.forEach((fieldName) => {
        const value = parseFloat(parseValue($(`[name="${fieldName}"]`, context).val()));
        if (!isNaN(value)) {
          sum += value;
        }
      });
      return sum;
    }
  };

  const avgFunc = {
    rgx: "avg\\({([^}]+)}\\)",
    exec: function (equation, equationFields, result, context) {
      let sum = 0;
      let count = 0;
      equationFields.forEach((fieldName) => {
        const value = parseFloat(parseValue($(`[name="${fieldName}"]`, context).val()));
        if (!isNaN(value)) {
          sum += value;
          count++;
        }
      });
      return count > 0 ? sum / count : 0;
    }
  };

  const minFunc = {
    rgx: "min\\({([^}]+)}\\)",
    exec: function (equation, equationFields, result, context) {
      const values = equationFields.map((fieldName) => parseFloat(parseValue($(`[name="${fieldName}"]`, context).val())));
      return Math.min(...values);
    }
  };

  const maxFunc = {
    rgx: "max\\({([^}]+)}\\)",
    exec: function (equation, equationFields, result, context) {
      const values = equationFields.map((fieldName) => parseFloat(parseValue($(`[name="${fieldName}"]`, context).val())));
      return Math.max(...values);
    }
  };

  const countFunc = {
    rgx: "count\\({([^}]+)}\\)",
    exec: function (equation, equationFields, result, context) {
      return equationFields.length;
    }
  };

  const countNotEmptyFunc = {
    rgx: "countNotEmpty\\({([^}]+)}\\)",
    exec: function (equation, equationFields, result, context) {
      const nonEmptyFields = equationFields.filter(fieldName => $(`[name="${fieldName}"]`, context).val().trim() !== "");
      return nonEmptyFields.length;
    }
  };

  funcs.sum = sumFunc;
  funcs.avg = avgFunc;
  funcs.min = minFunc;
  funcs.max = maxFunc;
  funcs.count = countFunc;
  funcs.countNotEmpty = countNotEmptyFunc;

  function parseValue(value) {
    value = value.replace(/\s/g, ""); // Remove spaces
    value = value.replace(thousandOpts.join("|"), ""); // Remove thousand separators
    value = value.replace(decimalOpts.join("|"), "."); // Replace decimal separators with "."
    return value;
  }

  function calculate(equation, equationFields, result, context, opts, vars, funcs) {
    let expression = equation;

    equationFields.forEach((fieldName) => {
      const fieldSelector = `[name="${fieldName}"]`;
      const fieldValue = parseValue($(fieldSelector, context).val(), opts);
      expression = expression.replace(new RegExp(`{${fieldName}}`, "g"), fieldValue);
    });

    expression = expression.replace(/ /g, ""); // Remove spaces

    if (expression.includes(",")) {
      expression = expression.replace(/,/g, ""); // Remove commas
    }

    const parsedValue = parseExpression(expression, opts, vars, funcs);
    const formattedValue = formatValue(parsedValue, opts);

    result.val(formattedValue);

    if (chainFire) {
      const current = result.data("current");
      if (current !== undefined && current === formattedValue) {
        result.trigger("change");
      } else {
        result.data("current", formattedValue);
      }
    }
  }

  function parseExpression(expression, opts, vars, funcs) {
    const tokens = [];
    let offset = 0;

    while (offset < expression.length) {
      const char = expression.charAt(offset);

      if (char.match(/\d/)) {
        // If the character is a digit, parse the number
        const start = offset;
        while (char.match(/\d/)) {
          offset++;
          char = expression.charAt(offset);
        }
        const number = parseFloat(expression.substring(start, offset));
        tokens.push(number);
      } else if (char.match(/[-+*/]/)) {
        // If the character is an operator, parse the operator
        tokens.push(char);
        offset++;
      } else if (char === "(") {
        // If the character is an opening parenthesis, parse the subexpression
        offset++;
        const subexpression = parseExpression(expression.substring(offset), opts, vars, funcs);
        tokens.push(subexpression.result);
        offset += subexpression.offset;
      } else if (char === ")") {
        // If the character is a closing parenthesis, return the parsed result
        offset++;
        return { result: evaluate(tokens, opts, vars, funcs), offset: offset };
      } else {
        // If the character is not recognized, throw an error
        throw new Error("Parsing error: unrecognized character");
      }
    }

    return { result: evaluate(tokens, opts, vars, funcs), offset: offset };
  }

  function evaluate(tokens, opts, vars, funcs) {
    const operators = {
      "+": { precedence: 10, assoc: "L", exec: (a, b) => a + b },
      "-": { precedence: 10, assoc: "L", exec: (a, b) => a - b },
      "*": { precedence: 20, assoc: "L", exec: (a, b) => a * b },
      "/": { precedence: 20, assoc: "L", exec: (a, b) => a / b }
    };

    const stack = [];
    const output = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (typeof token === "number") {
        output.push(token);
      } else if (token in operators) {
        while (stack.length > 0 && stack[stack.length - 1] in operators &&
          ((operators[token].assoc === "L" && operators[token].precedence <= operators[stack[stack.length - 1]].precedence) ||
            (operators[token].assoc === "R" && operators[token].precedence < operators[stack[stack.length - 1]].precedence))) {
          output.push(stack.pop());
        }
        stack.push(token);
      }
    }

    while (stack.length > 0) {
      output.push(stack.pop());
    }

    const evalStack = [];

    for (let i =
