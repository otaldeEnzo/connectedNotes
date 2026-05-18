import * as math from 'mathjs';
import nerdamer from 'nerdamer';
import 'nerdamer/Algebra.js';
import 'nerdamer/Calculus.js';
import 'nerdamer/Solve.js';
import NATIVE_CONSTANTS from '../data/constants.json';
import { MathService } from './MathService.js';

class CalculatorEngine {
  constructor() {
    this.formulas = this.loadFormulas();
    this.variables = this.loadVariables();
    this.ans = "0";
    this.preAns = "0";
    this.history = [];

    // Pre-calculate constants scope to avoid repeated processing
    this.constantsScope = {};
    NATIVE_CONSTANTS.forEach(c => {
      // Use symbol without backslash as key (since latexToMathJS removes them)
      const cleanKey = c.s.replace(/\\/g, '');
      this.constantsScope[cleanKey] = parseFloat(c.v);
    });

    // STARTUP REPLAY: Re-teach both engines the saved formulas
    Object.values(this.formulas).forEach(fDef => {
      try {
        // 1. Numerics (mathjs expects =)
        let mathClean = fDef.replace(/sen\(/g, 'sin(').replace(/tg\(/g, 'tan(').replace(/²/g, '^2').replace(/³/g, '^3');
        math.evaluate(mathClean, { ...this.constantsScope, ...this.variables });

        // 2. Symbolic (nerdamer expects :=)
        let ndClean = mathClean.replace(/=/g, ':=');
        nerdamer(ndClean);
      } catch (e) { console.error("Startup Sync Error:", e); }
    });
  }

  loadVariables() {
    const saved = localStorage.getItem('stem-pro-vars');
    const defaultVars = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, M: 0, X: 0, Y: 0 };
    return saved ? JSON.parse(saved) : defaultVars;
  }

  loadFormulas() {
    const saved = localStorage.getItem('stem-pro-formulas');
    return saved ? JSON.parse(saved) : {};
  }

  saveVariables() {
    localStorage.setItem('stem-pro-vars', JSON.stringify(this.variables));
    localStorage.setItem('stem-pro-formulas', JSON.stringify(this.formulas));
  }

  evaluate(expression, mode = 'calculate', isSymbolic = true, unitMode = 'deg') {
    if (!expression || expression.trim() === '') return { text: "0", value: 0 };
    let processed = expression;
    try {
      processed = processed
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, 'pi')
        .replace(/\be\b/g, 'e')
        .replace(/sen\(/g, 'sin(')
        .replace(/tg\(/g, 'tan(')
        .replace(/arcsen\(/g, 'asin(')
        .replace(/arctg\(/g, 'atan(')
        .replace(/²/g, '^2')
        .replace(/³/g, '^3')
        .replace(/\bans\b/g, this.ans)
        .replace(/\bpreans\b/g, this.preAns)
        .replace(/\brand\b/g, 'random()');

      // 0. Assignment vs Equation Solver Logic
      if (processed.includes('=') && !['==', '<=', '>='].some(op => processed.includes(op))) {
        const sides = processed.split('=');
        if (sides.length !== 2) return { text: "\\text{Erro de sintaxe}", value: null, isTex: true };

        const lhs = sides[0].trim();
        const rhs = sides[1].trim();
        const isAssignment = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(lhs) || /^[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*\)$/.test(lhs);

        if (isAssignment) {
          try {
            if (!this.variables) this.variables = {};

            // 1. Numerics
            math.evaluate(processed, this.variables);

            // 2. Symbols & Persistence
            const nameMatch = lhs.match(/^([a-zA-Z0-9_]+)/);
            if (nameMatch) {
              const varName = nameMatch[1];
              // If it's a function definition like f(x)
              if (lhs.includes('(')) {
                this.formulas[varName] = processed;
              } else {
                // Regular variable
                if (this.variables[varName] !== undefined) {
                  delete this.formulas[varName]; // Clear if it was a formula
                }
              }
            }

            // Teach Nerdamer
            try {
              let ndDef = processed.replace(/=/g, ':=');
              nerdamer(ndDef);
            } catch (ne) { console.warn("Nerdamer assignment warn:", ne); }

            this.saveVariables();
            return { text: "\\text{Definido.}", value: null, isTex: true };
          } catch (err) {
            console.error("Assignment Error:", err);
            return { text: "\\text{Erro: } " + (err.message || "inválido").slice(0, 20), value: null, isTex: true };
          }
        } else {
          // GENERAL EQUATION SOLVER (Item 3)
          try {
            const varsFound = processed.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
            const solveVar = varsFound.find(v => v === 'x') || varsFound[0] || 'x';

            // Textual Substitution (more robust than symbolic .sub() for equations)
            let eqStr = processed;
            const fullScope = { ...this.constantsScope, ...this.variables };
            if (fullScope) {
              Object.entries(fullScope).forEach(([v, val]) => {
                if (v !== solveVar && typeof val === 'number') {
                  const regex = new RegExp(`\\b${v}\\b`, 'g');
                  eqStr = eqStr.replace(regex, val);
                }
              });
            }

            // Normalize: A + x = 100 -> (A + x) - (100)
            if (eqStr.includes('=')) {
              const sides = eqStr.split('=');
              eqStr = `(${sides[0]}) - (${sides[1]})`;
            }

            const solutions = nerdamer.solve(eqStr, solveVar);
            const tex = `${solveVar} = ${solutions.toTeX()}`;
            this.ans = solutions.toString();
            return { text: tex, value: solutions.toString(), isTex: true };
          } catch (solveErr) {
            console.error("Solve Error:", solveErr);
            return { text: "\\text{Erro ao resolver}", value: null, isTex: true };
          }
        }
      }

      // 2. Pre-process Symbolic Expressions: Replace user functions with their definitions
      // Example: If f(x)=sin(x), then diff(f(x)) -> diff(sin(x))
      // Skip this if we are CURRENTLY defining a function
      if (!processed.includes('=') && !processed.includes(':=')) {
        Object.entries(this.formulas).forEach(([name, formula]) => {
          const defMatch = formula.match(/^([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9_]+)\)\s*[:=]\s*(.*)$/);
          if (defMatch) {
            const [_, fName, fVar, fBody] = defMatch;

            // Only replace if it's the exact function name
            const callRegex = new RegExp(`\\b${fName}\\s*\\(([^)]+)\\)`, 'g');
            processed = processed.replace(callRegex, (match, arg) => {
              // Simple substitution: replace only isolated occurrences of the variable
              const varRegex = new RegExp(`\\b${fVar}\\b`, 'g');
              const expanded = fBody.replace(varRegex, `(${arg})`);
              return `(${expanded})`;
            });
          }
        });
      }

      // 3. Symbolic Calculus Guard (Nerdamer)
      const symbolicOps = ['integral', 'diff', 'taylor', 'subst', 'limit', 'sum', 'product', 'solve'];
      const isSymbolicLogic = symbolicOps.some(op => processed.includes(op + '('));

      if (isSymbolicLogic) {
        try {
          const processSymbolicArgs = (str, targetFunc, replacer) => {
            let result = str;
            let searchIdx = 0;
            let target = targetFunc + '(';
            while ((searchIdx = result.indexOf(target, searchIdx)) !== -1) {
              let start = searchIdx + targetFunc.length;
              let d = 0;
              let end = -1;
              for (let i = start; i < result.length; i++) {
                if (result[i] === '(') d++;
                else if (result[i] === ')') {
                  d--;
                  if (d === 0) { end = i; break; }
                }
              }
              if (end !== -1) {
                let inner = result.substring(start + 1, end);
                let args = [];
                let currentArg = '';
                let argD = 0;
                for (let i = 0; i < inner.length; i++) {
                  if (inner[i] === '(') argD++;
                  else if (inner[i] === ')') argD--;
                  if (inner[i] === ',' && argD === 0) {
                    args.push(currentArg);
                    currentArg = '';
                  } else {
                    currentArg += inner[i];
                  }
                }
                args.push(currentArg);

                let replaced = replacer(args);
                result = result.substring(0, searchIdx) + replaced + result.substring(end + 1);
                searchIdx += replaced.length;
              } else {
                searchIdx += target.length;
              }
            }
            return result;
          };

          let ndExpr = processed;

          ndExpr = processSymbolicArgs(ndExpr, 'integral', (args) => {
            const f = args[0] || '0';
            const v = (args.length >= 4) ? args[1] : 'x';
            const a = (args.length >= 4) ? args[2] : (args[1] || '');
            const b = (args.length >= 4) ? args[3] : (args[2] || '');
            
            if (!a.trim() || !b.trim()) return `integrate(${f}, ${v})`;
            return `defint(${f}, ${a}, ${b}, ${v})`;
          });

          ndExpr = processSymbolicArgs(ndExpr, 'subst', (args) => {
            const f = args[0] || '0';
            const v = args[1] || 'x';
            const val = args[2] || '0';
            return `sub(${v}, ${val}, ${f})`;
          });

          ndExpr = processSymbolicArgs(ndExpr, 'diff', (args) => {
            const f = args[0] || '0';
            const v = args[1] || 'x';
            return `diff(${f}, ${v})`;
          });

          let sol = nerdamer(ndExpr);
          // Forçar avaliação se for cálculo (integrais definidas, limites, derivadas e subst) para obter valor final
          if (ndExpr.includes('defint') || ndExpr.includes('diff') || ndExpr.includes('limit') || ndExpr.includes('sub(')) {
            sol = sol.evaluate();
          }

          const val = sol.toString();
          const tex = sol.toTeX();
          this.preAns = this.ans;
          this.ans = val;
          this.ansTex = tex;

          // Se o resultado for um número ou fração simbólica, tenta formatar como fração latex para consistência
          let numericVal = NaN;
          try {
            numericVal = math.evaluate(val);
          } catch(e) {}

          if (!isNaN(numericVal) && isFinite(numericVal)) {
            try {
              // Only try fraction if it's not a huge/tiny decimal
              if (Math.abs(numericVal) > 1e-6 && Math.abs(numericVal) < 1e6) {
                const frac = math.fraction(numericVal);
                if (frac.d !== 1 && frac.d < 10000) {
                  const fracTex = `\\frac{${frac.s === -1 ? '-' : ''}${frac.n}}{${frac.d}}`;
                  return { text: fracTex, value: numericVal, isTex: true };
                }
              }
            } catch (e) {}
          }

          return { text: tex, value: val, isTex: true };
        } catch (e) {
          return { text: "Erro Simbólico", value: 0 };
        }
      }

      // 2. Standard Evaluation (MathJS)
      const openParens = (processed.match(/\(/g) || []).length;
      const closeParens = (processed.match(/\)/g) || []).length;
      if (openParens > closeParens) processed += ')'.repeat(openParens - closeParens);

      const isDeg = unitMode === 'deg';
      let mathjsInput = processed;
      if (isDeg) {
        // Enforce input for trig functions to be treated as degrees
        mathjsInput = mathjsInput.replace(/\b(sin|cos|tan|sec|csc|cot)\(([^)]+)\)/g, '$1(($2) deg)');
        // Enforce output for inverse trig and complex arg to be converted to degrees
        mathjsInput = mathjsInput.replace(/\b(asin|acos|atan|atan2|arg)\(([^)]+)\)/g, 'unit($1($2), "rad") to "deg"');
      }

      // Merge user variables with STEM constants
      const evaluationScope = { ...this.constantsScope, ...this.variables };

      let result = math.evaluate(mathjsInput, evaluationScope);

      if (isDeg && result && result.units && result.units[0]?.unit.name === 'rad') {
        result = result.toNumber('deg');
      }

      // 3. Unit Handling (Item 5)
      const isUnit = math.typeOf(result) === 'Unit';
      if (isUnit) {
        this.ans = result.toString();
        const formatted = math.format(result, { precision: 14 });
        const unitPart = result.formatUnits();
        const valPart = math.format(math.number(result, unitPart), { precision: 14 });
        
        // Formatação profissional: Trocar 'deg' por símbolo de grau, outros por \text
        let texUnit = `\\text{ ${unitPart}}`;
        if (unitPart === 'deg') texUnit = '^{\\circ}';
        
        return {
          text: `${valPart}${texUnit}`,
          value: result.toString(),
          isTex: true
        };
      }

      this.preAns = this.ans;
      this.ans = result;
      this.ansTex = MathService.toLaTeX(result);
      this.history.push({ input: expression, output: result, text: this.ansTex });

      // Matrix/Array handling: return LaTeX immediately to avoid symbolic bypass
      if ((result && result.isMatrix) || Array.isArray(result)) {
        return { text: this.ansTex, value: result, isTex: true };
      }

      // 6. Symbolic vs Numeric Formatting
      if (isSymbolic) {
        if (typeof result === 'number' && !isNaN(result)) {
          const EPSILON = 1e-10;
          const exactValues = [
            { v: Math.sqrt(2) / 2, text: '√2 / 2' },
            { v: Math.sqrt(3) / 2, text: '√3 / 2' },
            { v: Math.sqrt(3) / 3, text: '√3 / 3' },
            { v: Math.sqrt(3), text: '√3' },
            { v: Math.SQRT2, text: '√2' }
          ];

          for (const exact of exactValues) {
            if (Math.abs(result - exact.v) < EPSILON) return { text: exact.text, value: result };
            if (Math.abs(result + exact.v) < EPSILON) return { text: '-' + exact.text, value: result };
          }

          try {
            // Only try fraction if it's not a tiny/huge number that should be scientific
            if (Math.abs(result) > 1e-4 && Math.abs(result) < 1e6) {
              const frac = math.fraction(result);
              if (frac.d !== 1 && frac.d < 10000) {
                return { text: math.format(frac, { fraction: 'ratio' }), value: result };
              }
            }
          } catch (e) { }
        }

        try {
          let symbolicText = math.simplify(processed, this.variables).toString();
          if (symbolicText.includes('(') || symbolicText === processed) {
            let finalStr = math.format(result, { precision: 14 });
            if (/[0-9]e[+-]?[0-9]/.test(finalStr)) {
              finalStr = finalStr.replace(/([0-9.]+)e([+-]?\d+)/g, '$1 \\cdot 10^{$2}');
            }
            return { text: finalStr, value: result, isTex: finalStr.includes('\\') };
          }
          return { text: symbolicText, value: result };
        } catch (e) { }
      }

      let displayText = math.format(result, { precision: 14 });

      // Convert scientific notation (e.g., 6.626e-34) to elegant LaTeX (\cdot 10^{-34})
      if (/[0-9]e[+-]?[0-9]/.test(displayText)) {
        displayText = displayText.replace(/([0-9.]+)e([+-]?\d+)/g, '$1 \\cdot 10^{$2}');
      }

      return { text: displayText, value: result, isTex: displayText.includes('\\') };
    } catch (error) {
      console.error("Evaluation Error with input:", expression, error);
      return { text: `\\text{Erro: } ${error.message.substring(0, 30)}`, value: null };
    }
  }

  // Specialized Solvers
  solveEquation(expr) {
    try {
      // Newton-Raphson approximation or math.solve if linear
      return math.simplify(expr).toString();
    } catch (e) { return "Error"; }
  }

  generateTable(expr, start, end, step) {
    const results = [];
    for (let x = start; x <= end; x += step) {
      results.push({ x, y: math.evaluate(expr, { x }) });
    }
    return results;
  }
  clearVariables() {
    this.variables = {};
  }

  reset() {
    this.history = [];
    this.variables = {};
    this.formulas = {};
    this.ans = 0;
  }
}

export const stemEngine = new CalculatorEngine();
