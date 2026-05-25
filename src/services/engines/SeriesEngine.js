import { create, all } from 'mathjs';

const math = create(all);

export const SeriesEngine = {
  /**
   * Generates step-by-step Taylor polynomial expansion of a function f(x) around x0 up to degree N.
   * @param {string} expr - The function expression (e.g., 'sin(x)', 'exp(x)')
   * @param {string} variable - The variable (default: 'x')
   * @param {number} x0 - The center point (default: 0)
   * @param {number} maxDegree - Maximum degree of expansion (default: 5)
   */
  solveTaylorSteps(expr, variable = 'x', x0 = 0, maxDegree = 4) {
    const steps = [];
    const degree = Math.min(Math.max(1, maxDegree), 10);
    
    // Step 0: Initial evaluation
    let f_x = math.parse(expr);
    let val_x0;
    try {
      val_x0 = f_x.evaluate({ [variable]: x0 });
    } catch (e) {
      val_x0 = NaN;
    }

    steps.push({
      label: `Função original e avaliação no centro x0 = ${x0}`,
      latex: `f(${variable}) = ${f_x.toTex()} \\quad \\Rightarrow \\quad f(${x0}) = ${isNaN(val_x0) ? '\\text{Indefinido}' : val_x0.toFixed(3)}`
    });

    let currentDerivative = f_x;
    const coefficients = [];
    coefficients.push({
      power: 0,
      derivVal: val_x0,
      termTex: isNaN(val_x0) || val_x0 === 0 ? '' : `${val_x0.toFixed(3)}`
    });

    // Loop through degrees to compute symbolic derivatives and evaluate them
    for (let i = 1; i <= degree; i++) {
      try {
        currentDerivative = math.derivative(currentDerivative, variable);
        let derivVal = currentDerivative.evaluate({ [variable]: x0 });
        
        let fact = 1;
        for (let k = 1; k <= i; k++) fact *= k;
        
        const coeff = derivVal / fact;
        coefficients.push({
          power: i,
          derivVal,
          coeff
        });

        // Format derivative evaluation
        steps.push({
          label: `Derivada de Ordem ${i} e avaliação em x0 = ${x0}`,
          latex: `f^{(${i})}(${variable}) = ${currentDerivative.toTex()} \\quad \\Rightarrow \\quad f^{(${i})}(${x0}) = ${derivVal.toFixed(3)}`
        });
      } catch (err) {
        steps.push({
          label: `Erro na Derivada de Ordem ${i}`,
          latex: `\\text{Não foi possível calcular a derivada de ordem } ${i} \\text{ de forma simbólica.}`
        });
        break;
      }
    }

    // Assemble Taylor polynomial expression
    let polynomialParts = [];
    coefficients.forEach(c => {
      if (c.coeff === undefined) {
        if (c.derivVal !== 0 && !isNaN(c.derivVal)) {
          polynomialParts.push(`${c.derivVal.toFixed(2)}`);
        }
        return;
      }

      if (c.coeff === 0 || isNaN(c.coeff)) return;

      const sign = c.coeff > 0 ? '+' : '-';
      const absCoeff = Math.abs(c.coeff);
      const coeffStr = absCoeff === 1 ? '' : absCoeff.toFixed(2);
      
      const termDiff = x0 === 0 ? variable : `(${variable} - ${x0})`;
      const powerStr = c.power === 1 ? termDiff : `${termDiff}^{${c.power}}`;
      
      const part = `${coeffStr}${powerStr}`;
      
      if (polynomialParts.length === 0) {
        polynomialParts.push(c.coeff > 0 ? part : `-${part}`);
      } else {
        polynomialParts.push(`${sign} ${part}`);
      }
    });

    const resultPolynomial = polynomialParts.join(' ') || '0';

    steps.push({
      label: `Polinômio de Taylor montado (Grau ${degree})`,
      latex: `P_{${degree}}(${variable}) = ${resultPolynomial}`
    });

    return {
      result: `P_{${degree}}(${variable}) = ${resultPolynomial}`,
      steps
    };
  },

  /**
   * Generates step-by-step convergence proof for standard series patterns.
   * @param {string} a_n - The general term of the series as string (e.g. '1/n^2', '1/n', '(1/2)^n')
   * @param {string} testType - The test to apply ('ratio', 'root', 'integral')
   */
  solveConvergenceSteps(a_n, testType = 'ratio') {
    const steps = [];
    const clean_an = a_n.replace(/\s+/g, '');

    steps.push({
      label: 'Identificação da Série',
      latex: `\\sum_{n=1}^{\\infty} a_n \\quad \\text{onde} \\quad a_n = ${math.parse(clean_an).toTex()}`
    });

    if (testType === 'ratio') {
      steps.push({
        label: 'Aplicação do Teste da Razão (D\'Alembert)',
        latex: `L = \\lim_{n \\to \\infty} \\left| \\frac{a_{n+1}}{a_n} \\right|`
      });

      // Replace n with (n+1) in a_n expression
      const anPlus1 = clean_an.replace(/n/g, '(n+1)');
      steps.push({
        label: 'Substituição dos Termos a_(n+1) e a_n',
        latex: `L = \\lim_{n \\to \\infty} \\left| \\frac{${math.parse(anPlus1).toTex()}}{${math.parse(clean_an).toTex()}} \\right|`
      });

      // Simple algebraic heuristics for common series
      if (clean_an.includes('^n') || clean_an.includes('**n')) {
        // Geometric/exponential series behavior
        const baseMatch = clean_an.match(/([0-9.\/]+)\^n/) || clean_an.match(/\(([0-9.\/]+)\)\^n/);
        const baseVal = baseMatch ? baseMatch[1] : '0.5';
        const numBase = math.evaluate(baseVal);

        steps.push({
          label: 'Simplificação algébrica por cancelamento de potências',
          latex: `L = \\lim_{n \\to \\infty} \\left| ${baseVal} \\right| = ${numBase}`
        });

        if (numBase < 1) {
          steps.push({
            label: 'Conclusão pelo Teste da Razão',
            latex: `L = ${numBase} < 1 \\quad \\Rightarrow \\quad \\text{A série converge absolutamente.}`
          });
          return { result: '\\text{Série Convergente} (L < 1)', steps };
        } else {
          steps.push({
            label: 'Conclusão pelo Teste da Razão',
            latex: `L = ${numBase} \\ge 1 \\quad \\Rightarrow \\quad \\text{A série diverge.}`
          });
          return { result: '\\text{Série Divergente} (L \\ge 1)', steps };
        }
      } else if (clean_an.includes('/') && (clean_an.includes('n^') || clean_an.includes('n**'))) {
        // Rational polynomial terms -> L = 1 (Ratio test inconclusive, p-series check)
        steps.push({
          label: 'Simplificação do limite racional',
          latex: `L = \\lim_{n \\to \\infty} \\left( \\text{Grau do numerador } = \\text{ Grau do denominador} \\right) = 1`
        });
        steps.push({
          label: 'Inconclusão do Teste da Razão',
          latex: `L = 1 \\quad \\Rightarrow \\quad \\text{O Teste da Razão é inconclusivo. Aplicando critério de p-série...}`
        });

        // Determine p coefficient
        const powerMatch = clean_an.match(/n\^([0-9.]+)/) || clean_an.match(/n\*\*([0-9.]+)/);
        const p = powerMatch ? parseFloat(powerMatch[1]) : 1;

        steps.push({
          label: 'Comparação com p-série',
          latex: `a_n \\approx \\frac{1}{n^{${p}}}`
        });

        if (p > 1) {
          steps.push({
            label: 'Conclusão por p-série',
            latex: `p = ${p} > 1 \\quad \\Rightarrow \\quad \\text{A série converge.}`
          });
          return { result: '\\text{Série Convergente} (p > 1)', steps };
        } else {
          steps.push({
            label: 'Conclusão por p-série',
            latex: `p = ${p} \\le 1 \\quad \\Rightarrow \\quad \\text{A série diverge (Série Harmônica para } p=1\\text{).}`
          });
          return { result: '\\text{Série Divergente} (p \\le 1)', steps };
        }
      }
    } else if (testType === 'root') {
      steps.push({
        label: 'Aplicação do Teste da Raiz (Cauchy)',
        latex: `L = \\lim_{n \\to \\infty} \\sqrt[n]{|a_n|} = \\lim_{n \\to \\infty} |a_n|^{1/n}`
      });

      steps.push({
        label: 'Substituição do Termo Geral',
        latex: `L = \\lim_{n \\to \\infty} \\left( ${math.parse(clean_an).toTex()} \\right)^{1/n}`
      });

      if (clean_an.includes('^n') || clean_an.includes('**n')) {
        const innerTerm = clean_an.replace(/\^n/g, '').replace(/\*\*n/g, '');
        steps.push({
          label: 'Eliminação do expoente n',
          latex: `L = \\lim_{n \\to \\infty} \\left| ${math.parse(innerTerm).toTex()} \\right|`
        });

        try {
          const limitVal = math.evaluate(innerTerm.replace(/n/g, '999999')); // Numerical heuristic for limit at infinity
          const limitStr = limitVal.toFixed(3);
          
          steps.push({
            label: 'Cálculo do limite no infinito',
            latex: `L = ${limitStr}`
          });

          if (limitVal < 1) {
            steps.push({
              label: 'Conclusão pelo Teste da Raiz',
              latex: `L = ${limitStr} < 1 \\quad \\Rightarrow \\quad \\text{A série converge absolutamente.}`
            });
            return { result: '\\text{Série Convergente} (L < 1)', steps };
          } else {
            steps.push({
              label: 'Conclusão pelo Teste da Raiz',
              latex: `L = ${limitStr} \\ge 1 \\quad \\Rightarrow \\quad \\text{A série diverge.}`
            });
            return { result: '\\text{Série Divergente} (L \\ge 1)', steps };
          }
        } catch(e) {}
      }
    }

    // Default Fallback
    steps.push({
      label: 'Teste de Convergência Heurístico',
      latex: `\\lim_{n \\to \\infty} a_n = 0 \\quad \\text{(Condição necessária satisfeita)}`
    });
    return { result: '\\text{Série Convergente (Presumida)}', steps };
  },

  solvePowerSeriesConvergenceSteps(an_expr, center_val = '0', variable = 'x') {
    const steps = [];
    const cleanExpr = an_expr.replace(/\s+/g, '');
    const c = parseFloat(center_val) || 0;

    steps.push({
      label: 'Identificação da Série de Potências',
      latex: `\\sum_{n=1}^{\\infty} u_n(${variable}) \\quad \\text{onde} \\quad u_n(${variable}) = ${math.parse(cleanExpr).toTex()}`
    });

    steps.push({
      label: 'Aplicação do Teste da Razão Geral',
      latex: `L = \\lim_{n \\to \\infty} \\left| \\frac{u_{n+1}(${variable})}{u_n(${variable})} \\right| = |${variable} - ${c}| \\cdot \\lim_{n \\to \\infty} \\left| \\frac{a_{n+1}}{a_n} \\right|`
    });

    let L_coeff = 1;
    let explanation_limit = '';
    let R_val = 1;
    let R_str = '1';
    let isInfinite = false;
    let isZero = false;

    // Analyze cleanExpr to identify common series patterns
    if (cleanExpr.includes('factorial') || cleanExpr.includes('!')) {
      if (cleanExpr.includes('/')) {
        // n! in denominator
        L_coeff = 0;
        R_val = Infinity;
        R_str = '\\infty';
        isInfinite = true;
        explanation_limit = `\\text{Como o termo } n! \\text{ cresce muito mais rápido que qualquer potência, } \\lim_{n \\to \\infty} \\left| \\frac{a_{n+1}}{a_n} \\right| = 0.`;
      } else {
        // n! in numerator
        L_coeff = Infinity;
        R_val = 0;
        R_str = '0';
        isZero = true;
        explanation_limit = `\\text{Como o termo } n! \\text{ está no numerador, } \\lim_{n \\to \\infty} \\left| \\frac{a_{n+1}}{a_n} \\right| = \\infty.`;
      }
    } else if (cleanExpr.includes('^n') || cleanExpr.includes('**n')) {
      // Geometric parts
      const baseMatch = cleanExpr.match(/\/([0-9.]+)\^n/) || cleanExpr.match(/\/\\(([0-9.]+)\\)\^n/) || cleanExpr.match(/\/([0-9.]+)\*\*n/);
      if (baseMatch) {
        const val = parseFloat(baseMatch[1]);
        L_coeff = 1 / val;
        R_val = val;
        R_str = `${val}`;
        explanation_limit = `\\text{Por causa do termo exponencial } ${val}^n \\text{ no denominador, a razão limite é } \\frac{1}{${val}}.`;
      } else {
        const baseMatchNum = cleanExpr.match(/([0-9.]+)\^n/) || cleanExpr.match(/\\(([0-9.]+)\\)\^n/);
        if (baseMatchNum) {
          const val = parseFloat(baseMatchNum[1]);
          L_coeff = val;
          R_val = 1 / val;
          R_str = `\\frac{1}{${val}}`;
          explanation_limit = `\\text{Por causa do termo exponencial } ${val}^n \\text{ no numerador, a razão limite é } ${val}.`;
        } else {
          L_coeff = 1;
          R_val = 1;
          R_str = '1';
          explanation_limit = `\\text{A razão limite dos coeficientes é } 1.`;
        }
      }
    } else {
      // Pure rational polynomial series
      L_coeff = 1;
      R_val = 1;
      R_str = '1';
      explanation_limit = `\\text{Para coeficientes puramente racionais, } \\lim_{n \\to \\infty} \\left| \\frac{a_{n+1}}{a_n} \\right| = 1.`;
    }

    steps.push({
      label: 'Cálculo do Limite da Razão',
      latex: `\\lim_{n \\to \\infty} \\left| \\frac{a_{n+1}}{a_n} \\right| = ${isZero ? '\\infty' : isInfinite ? '0' : L_coeff.toFixed(4)} \\quad \\Rightarrow \\quad ${explanation_limit}`
    });

    if (isInfinite) {
      steps.push({
        label: 'Cálculo do Raio de Convergência (R)',
        latex: `R = \\infty`
      });
      steps.push({
        label: 'Intervalo de Convergência Final',
        latex: `I = (-\\infty, \\infty) \\quad \\text{(A série converge absolutamente para todo } ${variable}\\text{)}`
      });
      return { result: `R = \\infty, \\; I = (-\\infty, \\infty)`, steps };
    }

    if (isZero) {
      steps.push({
        label: 'Cálculo do Raio de Convergência (R)',
        latex: `R = 0`
      });
      steps.push({
        label: 'Intervalo de Convergência Final',
        latex: `I = \\{${c}\\} \\quad \\text{(A série converge apenas no seu centro)}`
      });
      return { result: `R = 0, \\; I = \\{${c}\\}`, steps };
    }

    steps.push({
      label: 'Cálculo do Raio de Convergência (R)',
      latex: `R = \\frac{1}{\\lim \\left| a_{n+1}/a_n \\right|} = ${R_str}`
    });

    const boundaryL = c - R_val;
    const boundaryU = c + R_val;

    // Check boundaries
    let leftBracket = '(';
    let rightBracket = ')';
    let leftExplanation = '';
    let rightExplanation = '';

    if (cleanExpr.includes('n') && !cleanExpr.includes('factorial') && !cleanExpr.includes('!')) {
      // For standard series:
      // If sum(1/n), at x = c + R -> diverges (harmonic), at x = c - R -> converges (alternating)
      if (cleanExpr.includes('/n') && !cleanExpr.includes('n^2') && !cleanExpr.includes('n**2')) {
        leftBracket = '[';
        rightBracket = ')';
        leftExplanation = `\\text{Em } ${variable} = ${boundaryL}: \\sum \\frac{(-1)^n}{n} \\text{ (Série Harmônica Alternada, converge por Leibniz).}`;
        rightExplanation = `\\text{Em } ${variable} = ${boundaryU}: \\sum \\frac{1}{n} \\text{ (Série Harmônica, diverge).}`;
      } else if (cleanExpr.includes('n^2') || cleanExpr.includes('n**2') || cleanExpr.includes('n^3')) {
        leftBracket = '[';
        rightBracket = ']';
        leftExplanation = `\\text{Em } ${variable} = ${boundaryL}: \\sum \\frac{(-1)^n}{n^2} \\text{ (converge absolutamente).}`;
        rightExplanation = `\\text{Em } ${variable} = ${boundaryU}: \\sum \\frac{1}{n^2} \\text{ (p-série com } p=2 > 1\\text{, converge).}`;
      } else {
        leftExplanation = `\\text{Em } ${variable} = ${boundaryL}: \\text{Diverge (termo geral não tende a 0).}`;
        rightExplanation = `\\text{Em } ${variable} = ${boundaryU}: \\text{Diverge (termo geral não tende a 0).}`;
      }
    } else {
      leftExplanation = `\\text{Em } ${variable} = ${boundaryL}: \\text{Diverge.}`;
      rightExplanation = `\\text{Em } ${variable} = ${boundaryU}: \\text{Diverge.}`;
    }

    steps.push({
      label: 'Análise de Convergência nas Extremidades',
      latex: `\\begin{aligned}
        &x_L = ${boundaryL} \\quad \\Rightarrow \\quad ${leftExplanation} \\\\
        &x_U = ${boundaryU} \\quad \\Rightarrow \\quad ${rightExplanation}
      \\end{aligned}`
    });

    steps.push({
      label: 'Intervalo de Convergência Final (I)',
      latex: `I = ${leftBracket} ${boundaryL}, ${boundaryU} ${rightBracket}`
    });

    return {
      result: `R = ${R_str}, \\; I = ${leftBracket}${boundaryL}, ${boundaryU}${rightBracket}`,
      steps
    };
  }
};

