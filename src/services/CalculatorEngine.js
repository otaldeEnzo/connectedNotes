import * as math from 'mathjs';
import nerdamer from 'nerdamer';
import 'nerdamer/Algebra.js';
import 'nerdamer/Calculus.js';
import 'nerdamer/Solve.js';

class CalculatorEngine {
  constructor() {
    this.formulas = this.loadFormulas();
    this.variables = this.loadVariables();
    this.ans = "0";
    this.history = [];
    
    // STARTUP REPLAY: Re-teach both engines the saved formulas
    Object.values(this.formulas).forEach(fDef => {
       try {
         // 1. Numerics (mathjs expects =)
         let mathClean = fDef.replace(/sen\(/g, 'sin(').replace(/tg\(/g, 'tan(').replace(/²/g, '^2').replace(/³/g, '^3');
         math.evaluate(mathClean, this.variables);
         
         // 2. Symbolic (nerdamer expects :=)
         let ndClean = mathClean.replace(/=/g, ':=');
         nerdamer(ndClean);
       } catch(e) { console.error("Startup Sync Error:", e); }
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
    try {
      let processed = expression
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
        .replace(/\bAns\b/g, this.ans);

      // 0. Assignment & Function Definition Guard
      if (processed.includes('=') && !['==', '<=', '>='].some(op => processed.includes(op))) {
        try {
          // ENSURE scope is clean for the assignment
          if (!this.variables || typeof this.variables !== 'object') {
            this.variables = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, M: 0, X: 0, Y: 0 };
          }
          
          math.evaluate(processed, this.variables);
          
          // SYNC & STORE FORMULA (Raw for Persistence)
          try {
            const nameMatch = processed.match(/^([a-zA-Z0-9_]+)\s*\(/);
            if (nameMatch) {
               this.formulas[nameMatch[1]] = processed; // Store raw assignment
            }
            
            // Teach Nerdamer (needs := and sin/tan)
            let ndDef = processed
               .replace(/=/g, ':=')
               .replace(/sen\(/g, 'sin(')
               .replace(/tg\(/g, 'tan(')
               .replace(/²/g, '^2')
               .replace(/³/g, '^3');
            nerdamer(ndDef); 
          } catch(ne) { console.error("Nerdamer Sync Error:", ne); }

          this.saveVariables();
          return { text: "\\text{Definido.}", value: null, isTex: true };
        } catch (err) {
          console.log("MathJS Assignment Error:", err.message);
          return { text: "\\text{Erro: } " + err.message.slice(0, 20), value: null, isTex: true };
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
      const symbolicOps = ['integral', 'diff', 'taylor', 'subst', 'limit'];
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
            const a = args[1] || '';
            const b = args[2] || '';
            if (!a.trim() || !b.trim()) return `integrate(${f}, x)`;
            return `defint(${f}, ${a}, ${b}, x)`;
          });
          
          ndExpr = processSymbolicArgs(ndExpr, 'subst', (args) => {
            const f = args[0] || '0';
            const v = args[1] || 'x';
            const val = args[2] || '0';
            return `sub(${v}, ${val}, ${f})`;
          });
          
          ndExpr = processSymbolicArgs(ndExpr, 'diff', (args) => {
            const f = args[0] || '0';
            const val = args[1] || '';
            if (!val.trim()) return `diff(${f}, x)`;
            return `sub(x, ${val}, diff(${f}, x))`;
          });

          let sol = nerdamer(ndExpr);
          const val = sol.toString();
          this.ans = val;
          return { text: sol.toTeX(), value: val, isTex: true };
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
        mathjsInput = mathjsInput.replace(/(sin|cos|tan|sec|csc|cot)\(([^)]+)\)/g, '$1(($2) deg)');
      }

      let result = math.evaluate(mathjsInput, this.variables);
      
      if (isDeg && result && result.units && result.units[0]?.unit.name === 'rad') {
        result = result.toNumber('deg');
      }

      this.ans = result;
      this.history.push({ input: expression, output: result });

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
            const frac = math.fraction(result);
            if (frac.d !== 1 && frac.d < 10000) {
              return { text: math.format(frac, { fraction: 'ratio' }), value: result };
            }
          } catch (e) { }
        }

        try {
          let symbolicText = math.simplify(processed, this.variables).toString();
          if (symbolicText.includes('(') || symbolicText === processed) {
            return { text: math.format(result, { precision: 14 }), value: result };
          }
          return { text: symbolicText, value: result };
        } catch (e) { }
      }

      return { text: math.format(result, { precision: 14 }), value: result };
    } catch (error) {
      console.error("Evaluation Error:", error);
      return { text: "Math Error", value: null };
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
}

export const stemEngine = new CalculatorEngine();
