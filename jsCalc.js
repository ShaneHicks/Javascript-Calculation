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

    for (let i = 0; i < output.length; i++) {
      const token = output[i];

      if (typeof token === "number") {
        evalStack.push(token);
      } else if (token in operators) {
        const b = evalStack.pop();
        const a = evalStack.pop();
        evalStack.push(operators[token].exec(a, b));
      }
    }

    return evalStack[0];
  }

  function formatValue(value, opts) {
    let formattedValue = value.toFixed(opts.decimalPlaces);

    if (opts.thousandOpts.includes(",")) {
      formattedValue = formattedValue.replace(/\B(?=(\d{3})+(?!\d))/g, opts.thousandOpts[0]);
    }

    if (opts.decimalOpts.includes(",")) {
      formattedValue = formattedValue.replace(".", opts.decimalOpts[0]);
    }

    return formattedValue;
  }

  function init(equation, opts, vars, funcs) {
    const attribute = opts.attribute;
    const context = this;

    $(`[${attribute}]:not([${d}])`, context).each(function () {
      const result = $(this);
      const equationString = result.attr(attribute);
      const equationFields = parseEquationFields(equationString);
      if (equationFields.length === 0) {
        return;
      }

      if (keyEventsFire) {
        p += " keyup keydown keypress";
      }

      for (let i = 0; i < equationFields.length; i++) {
        const field = equationFields[i];
        if (i === 0 && initFire) {
          $(`[name="${field.fieldName}"]`, context).on(p, { equation: equationString, equationFields: equationFields, result: result, context: context, opts: opts, vars: vars, funcs: funcs }, function (e) {
            calculate(e.data.equation, e.data.equationFields, e.data.result, e.data.context, e.data.opts, e.data.vars, e.data.funcs);
          });
        } else {
          const fieldSelector = `[name="${field.fieldName}"]`;
          if ($(fieldSelector, context).length === 0) {
            return;
          }
        }
      }

      if (readOnlyResults) {
        result.attr("readonly", "readonly");
      }

      result.attr(d, d);

      if (initFire) {
        $(`[name="${equationFields[0].fieldName}"]`, context).trigger("change");
      }
    });
  }

  function parseEquationFields(equation) {
    const regex = /{([^}]+)}/gi;
    const equationFields = [];
    let match;

    while ((match = regex.exec(equation)) !== null) {
      const fieldName = match[1];
      equationFields.push({ eqName: fieldName, fieldName: fieldName, reactive: true });
    }

    return equationFields;
  }

  function destroy(attribute) {
    const context = this;

    $(`[${attribute}][${d}]`, context).each(function () {
      const result = $(this);
      const equationString = result.attr(attribute);
      const equationFields = parseEquationFields(equationString);

      if (equationFields.length === 0) {
        return;
      }

      for (let i = 0; i < equationFields.length; i++) {
        const field = equationFields[i];
        $(`[name="${field.fieldName}"]`, context).off(".jautocalc");
      }

      if (readOnlyResults) {
        result.removeAttr("readonly");
      }

      result.removeAttr(d);
    });
  }

  r().fn.jAutoCalc = function () {
    let action = "init";
    let options = r().extend({}, r().fn.jAutoCalc.defaults);
    const funcs = {};
    const vars = {};

    for (let i = 0; i < arguments.length; i++) {
      const arg = arguments[i];

      if (typeof arg === "string") {
        action = arg.toString();
      } else if (typeof arg === "object") {
        options = r().extend(options, arg);
      }
    }

    const methods = {
      init: init,
      destroy: destroy
    };

    if (methods[action]) {
      methods[action].apply(this, [options, vars, funcs]);
    } else {
      init.apply(this, [options, vars, funcs]);
    }
  };

  r().fn.jAutoCalc.defaults = {
    attribute: "jAutoCalc",
    thousandOpts: [",", ".", " "],
    decimalOpts: [".", ","],
    decimalPlaces: decimalPlaces,
    initFire: initFire,
    chainFire: chainFire,
    keyEventsFire: keyEventsFire,
    readOnlyResults: readOnlyResults,
    showParseError: showParseError,
    emptyAsZero: emptyAsZero,
    smartIntegers: smartIntegers,
    onShowResult: onShowResult,
    funcs: funcs,
    vars: vars
  };
})();
