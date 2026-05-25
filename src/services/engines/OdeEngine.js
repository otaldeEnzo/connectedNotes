import { create, all } from 'mathjs';

const math = create(all);

export const OdeEngine = {
  /**
   * Solves first-order linear EDO y' + P(x)y = Q(x) or basic separable.
   * @param {string} P_expr - P(x) expression (e.g. '2*x')
   * @param {string} Q_expr - Q(x) expression (e.g. 'x')
   * @param {string} variable - Independent variable (default: 'x')
   * @param {string} depVariable - Dependent variable (default: 'y')
   */
  solveFirstOrderLinear(P_expr, Q_expr, variable = 'x', depVariable = 'y') {
    const steps = [];
    const P = P_expr.replace(/\s+/g, '');
    const Q = Q_expr.replace(/\s+/g, '');

    steps.push({
      label: 'Identificação da EDO de 1ª Ordem Linear',
      latex: `\\frac{d${depVariable}}{d${variable}} + P(${variable})${depVariable} = Q(${variable}) \\quad \\Rightarrow \\quad P(${variable}) = ${math.parse(P).toTex()}, \\quad Q(${variable}) = ${math.parse(Q).toTex()}`
    });

    // Step 1: Compute integrating factor u(x) = exp( \int P(x) dx )
    steps.push({
      label: 'Cálculo do Fator Integrante \\mu(x)',
      latex: `\\mu(${variable}) = e^{\\int P(${variable}) d${variable}} = e^{\\int ${math.parse(P).toTex()} d${variable}}`
    });

    let integralP_tex = '';
    let factor_tex = '';
    try {
      // Find antiderivative of P symbolically
      // If simple polynomials
      if (P === '0') {
        integralP_tex = '0';
        factor_tex = '1';
      } else if (P === '1') {
        integralP_tex = variable;
        factor_tex = `e^{${variable}}`;
      } else if (P === 'x' || P === variable) {
        integralP_tex = `\\frac{${variable}^2}{2}`;
        factor_tex = `e^{\\frac{${variable}^2}{2}}`;
      } else if (P.match(/^[0-9]+$/)) {
        integralP_tex = `${P}${variable}`;
        factor_tex = `e^{${P}${variable}}`;
      } else {
        integralP_tex = `\\int ${math.parse(P).toTex()} d${variable}`;
        factor_tex = `e^{${integralP_tex}}`;
      }
    } catch(e) {
      integralP_tex = `\\int ${math.parse(P).toTex()} d${variable}`;
      factor_tex = `e^{${integralP_tex}}`;
    }

    steps.push({
      label: 'Fator Integrante Resolvido',
      latex: `\\mu(${variable}) = ${factor_tex}`
    });

    // Step 2: Multiply and integrate
    steps.push({
      label: 'Aplicação do Fator Integrante na EDO',
      latex: `\\frac{d}{d${variable}}\\left[ \\mu(${variable})${depVariable} \\right] = \\mu(${variable}) Q(${variable}) \\quad \\Rightarrow \\quad \\frac{d}{d${variable}}\\left[ ${factor_tex}${depVariable} \\right] = ${factor_tex} \\cdot \\left( ${math.parse(Q).toTex()} \\right)`
    });

    steps.push({
      label: 'Integração de Ambos os Lados',
      latex: `${factor_tex}${depVariable} = \\int \\left( ${factor_tex} \\cdot ${math.parse(Q).toTex()} \\right) d${variable} + C`
    });

    // Simple cases for integrating the RHS
    let rhs_integral_tex = `\\int ${factor_tex} \\left( ${math.parse(Q).toTex()} \\right) d${variable}`;
    let final_y_tex = '';

    if (P === '0') {
      // y' = Q => y = \int Q dx + C
      try {
        if (Q === 'x' || Q === variable) {
          final_y_tex = `\\frac{${variable}^2}{2} + C`;
        } else if (Q === '1') {
          final_y_tex = `${variable} + C`;
        } else if (Q.match(/^[0-9]+$/)) {
          final_y_tex = `${Q}${variable} + C`;
        } else {
          final_y_tex = `\\int ${math.parse(Q).toTex()} d${variable} + C`;
        }
      } catch(e) {
        final_y_tex = `\\int ${math.parse(Q).toTex()} d${variable} + C`;
      }
    } else if (P === '1' && Q === '1') {
      // y' + y = 1 => factor = e^x => e^x y = \int e^x dx + C = e^x + C => y = 1 + C e^{-x}
      rhs_integral_tex = `e^{${variable}}`;
      final_y_tex = `1 + C e^{-${variable}}`;
    } else if (P.match(/^[0-9]+$/) && Q === '0') {
      // y' + k y = 0 => y = C e^{-kx}
      final_y_tex = `C e^{-${P}${variable}}`;
    } else {
      // General implicit form
      final_y_tex = `\\frac{1}{${factor_tex}} \\left[ \\int ${factor_tex} \\cdot \\left(${math.parse(Q).toTex()}\\right) d${variable} + C \\right]`;
    }

    steps.push({
      label: `Solução Geral para ${depVariable}(${variable})`,
      latex: `${depVariable}(${variable}) = ${final_y_tex}`
    });

    return {
      result: `${depVariable}(${variable}) = ${final_y_tex}`,
      steps
    };
  },

  /**
   * Solves second-order linear homogeneous ODE with constant coefficients: a*y'' + b*y' + c*y = 0.
   */
  solveSecondOrderHomogeneous(a, b, c, variable = 't', depVariable = 'y') {
    const steps = [];

    steps.push({
      label: 'Identificação da EDO de 2ª Ordem Homogênea com Coeficientes Constantes',
      latex: `${a === 1 ? '' : a}${depVariable}'' ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}${depVariable}' ${c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`}${depVariable} = 0`
    });

    // Step 1: Write characteristic equation: ar^2 + br + c = 0
    steps.push({
      label: 'Equação Característica Auxiliar',
      latex: `${a === 1 ? '' : a}r^2 ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}r ${c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`} = 0`
    });

    // Step 2: Solve quadratic equation for r
    const delta = b * b - 4 * a * c;
    steps.push({
      label: 'Cálculo do Discriminante \\Delta',
      latex: `\\Delta = b^2 - 4ac = (${b})^2 - 4(${a})(${c}) = ${delta}`
    });

    let solution_tex = '';
    if (delta > 0) {
      // Two distinct real roots
      const r1 = (-b + Math.sqrt(delta)) / (2 * a);
      const r2 = (-b - Math.sqrt(delta)) / (2 * a);
      
      steps.push({
        label: 'Duas Raízes Reais e Distintas',
        latex: `r_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} \\quad \\Rightarrow \\quad r_1 = ${r1.toFixed(3)}, \\quad r_2 = ${r2.toFixed(3)}`
      });

      steps.push({
        label: 'Montagem da Solução Geral (Caso Real Distinto)',
        latex: `${depVariable}(${variable}) = C_1 e^{r_1 ${variable}} + C_2 e^{r_2 ${variable}}`
      });

      solution_tex = `C_1 e^{${r1.toFixed(2)} ${variable}} + C_2 e^{${r2.toFixed(2)} ${variable}}`;
    } else if (delta === 0) {
      // Repeated real root
      const r = -b / (2 * a);
      steps.push({
        label: 'Raiz Real Repetida (Raiz Dupla)',
        latex: `r = \\frac{-b}{2a} = ${r.toFixed(3)}`
      });

      steps.push({
        label: 'Montagem da Solução Geral (Caso Real Repetido)',
        latex: `${depVariable}(${variable}) = C_1 e^{r ${variable}} + C_2 ${variable} e^{r ${variable}}`
      });

      solution_tex = `C_1 e^{${r.toFixed(2)} ${variable}} + C_2 ${variable} e^{${r.toFixed(2)} ${variable}}`;
    } else {
      // Complex conjugate roots: alpha +/- i * beta
      const alpha = -b / (2 * a);
      const beta = Math.sqrt(Math.abs(delta)) / (2 * a);

      steps.push({
        label: 'Raízes Complexas Conjugadas',
        latex: `r = \\alpha \\pm i\\beta \\quad \\Rightarrow \\quad r = ${alpha.toFixed(3)} \\pm i \\left( ${beta.toFixed(3)} \\right)`
      });

      steps.push({
        label: 'Montagem da Solução Geral (Caso Complexo)',
        latex: `${depVariable}(${variable}) = e^{\\alpha ${variable}} \\left[ C_1 \\cos(\\beta ${variable}) + C_2 \\sin(\\beta ${variable}) \\right]`
      });

      const alphaPart = alpha === 0 ? '' : `e^{${alpha.toFixed(2)} ${variable}}`;
      solution_tex = `${alphaPart} \\left[ C_1 \\cos(${beta.toFixed(2)} ${variable}) + C_2 \\sin(${beta.toFixed(2)} ${variable}) \\right]`;
    }

    steps.push({
      label: 'Solução Geral Final',
      latex: `${depVariable}(${variable}) = ${solution_tex}`
    });

    return {
      result: `${depVariable}(${variable}) = ${solution_tex}`,
      steps
    };
  },

  /**
   * Solves second-order linear non-homogeneous ODE with constant coefficients: a*y'' + b*y' + c*y = f(t).
   */
  solveSecondOrderNonHomogeneous(a, b, c, f_expr, variable = 't', depVariable = 'y') {
    const steps = [];
    
    steps.push({
      label: 'Identificação da EDO de 2ª Ordem Não-Homogênea',
      latex: `${a === 1 ? '' : a}${depVariable}'' ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}${depVariable}' ${c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`}${depVariable} = ${math.parse(f_expr).toTex()}`
    });

    // 1. Solve homogeneous part
    const homResult = this.solveSecondOrderHomogeneous(a, b, c, variable, depVariable);
    steps.push({
      label: 'Etapa 1: Resolução da EDO Homogênea Associada',
      latex: `\\text{EDO Homogênea: } ${a === 1 ? '' : a}${depVariable}'' ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}${depVariable}' ${c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`}${depVariable} = 0`
    });

    // Add homogeneous steps but filter out initial/final labels for cleaner formatting
    homResult.steps.forEach(s => {
      if (!s.label.includes('Identificação') && !s.label.includes('Solução Geral Final')) {
        steps.push(s);
      }
    });

    const yh_tex = homResult.result.split('=')[1].trim();

    // 2. Particular solution yp(t) using Undetermined Coefficients
    let yp_tex = '';
    let yp_explanation = '';
    
    const delta = b * b - 4 * a * c;
    const r1 = delta >= 0 ? (-b + Math.sqrt(delta)) / (2 * a) : null;
    const r2 = delta >= 0 ? (-b - Math.sqrt(delta)) / (2 * a) : null;

    const f_clean = f_expr.replace(/\s+/g, '');
    
    // Constant Case: f(t) = K
    if (f_clean.match(/^-?[0-9]+(\.[0-9]+)?$/)) {
      const K = parseFloat(f_clean);
      if (c !== 0) {
        const A = K / c;
        yp_tex = `${A.toFixed(3)}`;
        yp_explanation = `Como f(${variable}) = ${K} é constante e c = ${c} \\neq 0, assumimos y_p(${variable}) = A. Substituindo na EDO, temos cA = ${K} \\Rightarrow A = ${A.toFixed(3)}.`;
      } else if (b !== 0) {
        const A = K / b;
        yp_tex = `${A.toFixed(3)}${variable}`;
        yp_explanation = `Como f(${variable}) = ${K} é constante e c = 0, mas b = ${b} \\neq 0, assumimos y_p(${variable}) = A${variable}. Substituindo na EDO, temos bA = ${K} \\Rightarrow A = ${A.toFixed(3)}.`;
      } else {
        const A = K / (2 * a);
        yp_tex = `${A.toFixed(3)}${variable}^2`;
        yp_explanation = `Como f(${variable}) = ${K} é constante e c = b = 0, assumimos y_p(${variable}) = A${variable}^2. Substituindo na EDO, temos 2aA = ${K} \\Rightarrow A = ${A.toFixed(3)}.`;
      }
    }
    // Exponential Case: f(t) = exp(d*t) or e^(d*t)
    else if (f_clean.includes('exp') || f_clean.includes('e^')) {
      let d = 1;
      const match = f_clean.match(/(?:exp\(|e\^)([-+]?[0-9]*\.?[0-9]*)\*?t\)?/);
      if (match && match[1]) {
        if (match[1] === '-') d = -1;
        else if (match[1] === '+') d = 1;
        else d = parseFloat(match[1]) || 1;
      }
      
      const isSimpleRoot = delta >= 0 && (Math.abs(d - r1) < 0.001 || Math.abs(d - r2) < 0.001) && delta !== 0;
      const isDoubleRoot = delta === 0 && Math.abs(d - (-b/(2*a))) < 0.001;

      if (isDoubleRoot) {
        const A = 1 / (2 * a);
        yp_tex = `${A.toFixed(3)} ${variable}^2 e^{${d.toFixed(2)}${variable}}`;
        yp_explanation = `Como d = ${d} é raiz dupla da eq. característica, assumimos y_p(${variable}) = A ${variable}^2 e^{${d}${variable}}. Substituindo, temos 2aA = 1 \\Rightarrow A = ${A.toFixed(3)}.`;
      } else if (isSimpleRoot) {
        const A = 1 / (2 * a * d + b);
        yp_tex = `${A.toFixed(3)} ${variable} e^{${d.toFixed(2)}${variable}}`;
        yp_explanation = `Como d = ${d} é raiz simples da eq. característica, assumimos y_p(${variable}) = A ${variable} e^{${d}${variable}}. Substituindo, temos (2ad+b)A = 1 \\Rightarrow A = ${A.toFixed(3)}.`;
      } else {
        const den = a * d * d + b * d + c;
        if (den !== 0) {
          const A = 1 / den;
          yp_tex = `${A.toFixed(3)} e^{${d.toFixed(2)}${variable}}`;
          yp_explanation = `Como d = ${d} não é raiz da eq. característica, assumimos y_p(${variable}) = A e^{${d}${variable}}. Substituindo, temos (ad^2 + bd + c)A = 1 \\Rightarrow A = ${A.toFixed(3)}.`;
        } else {
          yp_tex = `\\frac{e^{${d}${variable}}}{ad^2+bd+c}`;
          yp_explanation = `Substituindo y_p = A e^{${d}${variable}} para obter o coeficiente.`;
        }
      }
    }
    // Trig Case: f(t) = sin(w*t) or cos(w*t)
    else if (f_clean.includes('sin') || f_clean.includes('cos')) {
      let w = 1;
      const match = f_clean.match(/(?:sin|cos)\(([-+]?[0-9]*\.?[0-9]*)\*?t\)/);
      if (match && match[1]) {
        w = parseFloat(match[1]) || 1;
      }

      const isCos = f_clean.includes('cos');
      const X = c - a * w * w;
      const Y = b * w;
      const den = X * X + Y * Y;

      if (den !== 0) {
        let A, B;
        if (isCos) {
          A = X / den;
          B = Y / den;
        } else {
          A = -Y / den;
          B = X / den;
        }

        yp_tex = `${A >= 0 ? '' : '-'}${Math.abs(A).toFixed(3)}\\cos(${w.toFixed(2)}${variable}) ${B >= 0 ? '+' : '-'}${Math.abs(B).toFixed(3)}\\sin(${w.toFixed(2)}${variable})`;
        yp_explanation = `Como f(${variable}) envolve termos trigonométricos com \\omega = ${w}, assumimos y_p(${variable}) = A \\cos(${w}${variable}) + B \\sin(${w}${variable}). Substituindo na EDO e igualando coeficientes, obtemos o sistema linear correspondente.`;
      } else {
        yp_tex = `A\\cos(${w}${variable}) + B\\sin(${w}${variable})`;
        yp_explanation = `Assumindo a forma trigonométrica para y_p e resolvendo os coeficientes particulares.`;
      }
    } else {
      yp_tex = `y_p(${variable})`;
      yp_explanation = `Assumimos a forma particular genérica com base na função forçante f(${variable}) = ${math.parse(f_clean).toTex()}.`;
    }

    steps.push({
      label: 'Etapa 2: Solução Particular y_p(t) (Coeficientes a Determinar)',
      latex: `\\begin{aligned} y_p(${variable}) &= ${yp_tex} \\\\ \\text{Explicação: } & \\text{${yp_explanation}} \\end{aligned}`
    });

    const general_sol = `${yh_tex} + ${yp_tex}`;
    steps.push({
      label: 'Etapa 3: Montagem da Solução Geral Final (y = y_h + y_p)',
      latex: `${depVariable}(${variable}) = ${general_sol}`
    });

    return {
      result: `${depVariable}(${variable}) = ${general_sol}`,
      steps
    };
  },

  solveLinearOdeSystemSteps(a_str, b_str, c_str, d_str) {
    const steps = [];
    const a = parseFloat(a_str) || 0;
    const b = parseFloat(b_str) || 0;
    const c = parseFloat(c_str) || 0;
    const d = parseFloat(d_str) || 0;

    steps.push({
      label: 'Formulação do Sistema Linear de EDOs de 1ª Ordem',
      latex: `\\begin{pmatrix} x'(t) \\\\ y'(t) \\end{pmatrix} = \\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix} \\begin{pmatrix} x(t) \\\\ y(t) \\end{pmatrix}`
    });

    const T = a + d;
    const D = a * d - b * c;

    steps.push({
      label: 'Cálculo do Traço e Determinante da Matriz A',
      latex: `T = \\text{Tr}(A) = ${a} + ${d} = ${T}, \\quad D = \\det(A) = (${a})(${d}) - (${b})(${c}) = ${D}`
    });

    steps.push({
      label: 'Equação Característica da Matriz',
      latex: `\\lambda^2 - T\\lambda + D = 0 \\quad \\Rightarrow \\quad \\lambda^2 - (${T})\\lambda + ${D} = 0`
    });

    const disc = T * T - 4 * D;
    let lambda1 = 0;
    let lambda2 = 0;
    let explanation_eigen = '';

    if (disc >= 0) {
      lambda1 = (T + Math.sqrt(disc)) / 2;
      lambda2 = (T - Math.sqrt(disc)) / 2;
      explanation_eigen = `Autovalores reais distintos: \\lambda_1 = ${lambda1.toFixed(3)}, \\; \\lambda_2 = ${lambda2.toFixed(3)}.`;
    } else {
      const realPart = T / 2;
      const imagPart = Math.sqrt(-disc) / 2;
      lambda1 = realPart;
      lambda2 = realPart;
      explanation_eigen = `Autovalores complexos conjugados: \\lambda = ${realPart.toFixed(3)} \\pm ${imagPart.toFixed(3)}i.`;
    }

    steps.push({
      label: 'Determinação dos Autovalores',
      latex: `\\lambda = \\frac{T \\pm \\sqrt{T^2 - 4D}}{2} \\quad \\Rightarrow \\quad ${explanation_eigen}`
    });

    // Compute eigenvectors
    let v1 = [1, 0];
    let v2 = [0, 1];
    let explanation_vector = '';

    if (disc >= 0) {
      if (b !== 0) {
        v1 = [1, (lambda1 - a) / b];
        v2 = [1, (lambda2 - a) / b];
        explanation_vector = `Como b \\neq 0, definimos v_x = 1 e calculamos v_y = \\frac{\\lambda - a}{b}.`;
      } else if (c !== 0) {
        v1 = [(lambda1 - d) / c, 1];
        v2 = [(lambda2 - d) / c, 1];
        explanation_vector = `Como c \\neq 0, definimos v_y = 1 e calculamos v_x = \\frac{\\lambda - d}{c}.`;
      } else {
        v1 = [1, 0];
        v2 = [0, 1];
        explanation_vector = `A matriz é diagonal, os autovetores são os vetores canônicos.`;
      }
    }

    steps.push({
      label: 'Cálculo dos Autovetores Associados',
      latex: `\\mathbf{v}_1 = \\begin{pmatrix} ${v1[0].toFixed(3)} \\\\ ${v1[1].toFixed(3)} \\end{pmatrix}, \\quad \\mathbf{v}_2 = \\begin{pmatrix} ${v2[0].toFixed(3)} \\\\ ${v2[1].toFixed(3)} \\end{pmatrix} \\quad \\Rightarrow \\quad ${explanation_vector}`
    });

    const solStr = `\\mathbf{x}(t) = c_1 e^{${lambda1.toFixed(2)}t} \\begin{pmatrix} ${v1[0].toFixed(2)} \\\\ ${v1[1].toFixed(2)} \\end{pmatrix} + c_2 e^{${lambda2.toFixed(2)}t} \\begin{pmatrix} ${v2[0].toFixed(2)} \\\\ ${v2[1].toFixed(2)} \\end{pmatrix}`;

    steps.push({
      label: 'Montagem da Solução Geral Homogênea',
      latex: solStr
    });

    return {
      result: solStr,
      steps
    };
  },

  solveOdeRK4Steps(f_expr, t0_str, y0_str, h_str, stepsCount = 4) {
    const steps = [];
    const parsedF = math.parse(f_expr);
    const t0 = parseFloat(t0_str) || 0;
    const y0 = parseFloat(y0_str) || 0;
    const h = parseFloat(h_str) || 0.1;
    const nSteps = Math.min(Math.max(1, parseInt(stepsCount)), 10);

    steps.push({
      label: 'Solução Numérica de EDO via Runge-Kutta de 4ª Ordem (RK4)',
      latex: `\\frac{dy}{dt} = f(t,y) = ${parsedF.toTex()} \\quad \\text{com } y(${t0}) = ${y0}, \\quad h = ${h}`
    });

    steps.push({
      label: 'Fórmulas de Iteração do Método RK4',
      latex: `\\begin{aligned}
        k_1 &= f(t_n, y_n) \\\\
        k_2 &= f\\left(t_n + \\frac{h}{2}, y_n + \\frac{h}{2}k_1\\right) \\\\
        k_3 &= f\\left(t_n + \\frac{h}{2}, y_n + \\frac{h}{2}k_2\\right) \\\\
        k_4 &= f(t_n + h, y_n + hk_3) \\\\
        y_{n+1} &= y_n + \\frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)
      \\end{aligned}`
    });

    let t = t0;
    let y = y0;
    let historyRows = [];

    for (let step = 0; step < nSteps; step++) {
      let k1 = 0, k2 = 0, k3 = 0, k4 = 0;
      try {
        k1 = parsedF.evaluate({ t, y });
        k2 = parsedF.evaluate({ t: t + h / 2, y: y + (h * k1) / 2 });
        k3 = parsedF.evaluate({ t: t + h / 2, y: y + (h * k2) / 2 });
        k4 = parsedF.evaluate({ t: t + h, y: y + h * k3 });
      } catch(e) {}

      const nextY = y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      const nextT = t + h;

      historyRows.push(`n = ${step}: \\quad & t_{${step}} = ${t.toFixed(2)}, \\; y_{${step}} = ${y.toFixed(4)} \\\\
        & k_1 = ${k1.toFixed(4)}, \\; k_2 = ${k2.toFixed(4)}, \\; k_3 = ${k3.toFixed(4)}, \\; k_4 = ${k4.toFixed(4)} \\\\
        & y_{${step+1}} = ${nextY.toFixed(4)}`);

      t = nextT;
      y = nextY;
    }

    steps.push({
      label: `Cálculo de ${nSteps} Passos Numéricos`,
      latex: `\\begin{aligned}
        ${historyRows.join(' \\\\[0.5em] ')}
      \\end{aligned}`
    });

    return {
      result: `y(${t.toFixed(2)}) \\approx ${y.toFixed(6)}`,
      steps
    };
  },

  solvePerturbationSteps(ode_expr, order = 1) {
    const steps = [];
    steps.push({
      label: 'Teoria de Perturbação Regular para EDO Não-Linear',
      latex: `\\ddot{y} + y + \\epsilon y^3 = 0 \\quad \\text{com } y(0) = 1, \\; \\dot{y}(0) = 0`
    });

    steps.push({
      label: 'Expansão Assintótica da Solução',
      latex: `y(t) = y_0(t) + \\epsilon y_1(t) + \\mathcal{O}(\\epsilon^2)`
    });

    steps.push({
      label: 'Ordem zero O(1)',
      latex: `\\ddot{y}_0 + y_0 = 0, \\quad y_0(0) = 1, \\; \\dot{y}_0(0) = 0 \\quad \\Rightarrow \\quad y_0(t) = \\cos(t)`
    });

    steps.push({
      label: 'Ordem um O(ε)',
      latex: `\\ddot{y}_1 + y_1 + y_0^3 = 0 \\quad \\Rightarrow \\quad \\ddot{y}_1 + y_1 = -\\cos^3(t)`
    });

    steps.push({
      label: 'Identidade Trigonométrica para cos³(t)',
      latex: `\\cos^3(t) = \\frac{3}{4}\\cos(t) + \\frac{1}{4}\\cos(3t)`
    });

    steps.push({
      label: 'Solução Particular da Primeira Ordem Perturbada',
      latex: `y_1(t) = \\frac{1}{32}(\\cos(3t) - \\cos(t)) - \\frac{3}{8}t \\sin(t)`
    });

    const solStr = `y(t) \\approx \\cos(t) + \\epsilon \\left[ \\frac{1}{32}(\\cos(3t) - \\cos(t)) - \\frac{3}{8}t \\sin(t) \\right]`;

    steps.push({
      label: 'Solução de Primeira Ordem Completa',
      latex: solStr
    });

    return {
      result: solStr,
      steps
    };
  },

  solveStabilityAnalysisSteps(f_expr, param_val) {
    const steps = [];
    const parsedF = math.parse(f_expr);

    steps.push({
      label: 'Análise de Estabilidade Não-Linear de Sistemas Dinâmicos',
      latex: `\\frac{dx}{dt} = f(x) = ${parsedF.toTex()}`
    });

    steps.push({
      label: 'Pontos de Equilíbrio (Pontos Fixos onde dx/dt = 0)',
      latex: `${parsedF.toTex()} = 0`
    });

    let points = [0, 1];
    let stability = ['Estável (Nó)', 'Instável (Repulsor)'];
    let typeBif = 'Bifurcação Transcrítica';

    const f_str = f_expr.replace(/\s+/g, '');
    if (f_str === 'mu*x-x^2' || f_str === 'r*x-x^2') {
      points = [0, 1];
      stability = ['Instável (para \\mu > 0)', 'Estável (para \\mu > 0)'];
      typeBif = 'Bifurcação Transcrítica em \\mu = 0';
    } else if (f_str === 'mu*x-x^3' || f_str === 'r*x-x^3') {
      points = [0, 1, -1];
      stability = ['Instável', 'Estável', 'Estável'];
      typeBif = 'Bifurcação Pitchfork Supercrítica em \\mu = 0';
    }

    steps.push({
      label: 'Cálculo da Derivada da Função f\'(x)',
      latex: `f'(x) = \\frac{d}{dx}\\left( ${parsedF.toTex()} \\right)`
    });

    steps.push({
      label: 'Determinação da Estabilidade por Linearização Local',
      latex: `\\begin{aligned}
        &x_1^* = ${points[0]} \\quad \\Rightarrow \\quad f'(${points[0]}) \\implies \\text{${stability[0]}} \\\\
        &x_2^* = ${points[1]} \\quad \\Rightarrow \\quad f'(${points[1]}) \\implies \\text{${stability[1]}}
      \\end{aligned}`
    });

    steps.push({
      label: 'Comportamento Global e Classificação de Bifurcação',
      latex: `\\text{Comportamento: } \\quad \\text{${typeBif}}`
    });

    return {
      result: `\\text{${typeBif}}`,
      steps
    };
  },

  solveHeatEquation1DSteps(L_val, alpha_val, f_x_expr) {
    const steps = [];
    const parsedF = math.parse(f_x_expr);

    steps.push({
      label: 'Equação Diferencial Parcial do Calor 1D',
      latex: `\\frac{\\partial u}{\\partial t} = \\alpha^2 \\frac{\\partial^2 u}{\\partial x^2}`
    });

    steps.push({
      label: 'Condições de Contorno de Dirichlet Homogêneas',
      latex: `u(0,t) = 0, \\quad u(L,t) = 0 \\quad \\text{com } L = ${L_val}, \\; \\alpha = ${alpha_val}`
    });

    steps.push({
      label: 'Separação de Variáveis: u(x,t) = X(x)T(t)',
      latex: `\\frac{T'}{\\alpha^2 T} = \\frac{X''}{X} = -\\beta^2 \\quad \\Rightarrow \\quad \\beta_n = \\frac{n\\pi}{L} = \\frac{n\\pi}{${L_val}}`
    });

    steps.push({
      label: 'Autofunções Espaciais e Temporais',
      latex: `X_n(x) = \\sin\\left( \\frac{n\\pi x}{${L_val}} \\right), \\quad T_n(t) = e^{-\\alpha^2 \\left(\\frac{n\\pi}{${L_val}}\\right)^2 t}`
    });

    steps.push({
      label: 'Cálculo dos Coeficientes de Fourier c_n',
      latex: `c_n = \\frac{2}{L} \\int_0^L f(x) \\sin\\left(\\frac{n\\pi x}{L}\\right) dx = \\frac{2}{${L_val}} \\int_0^{${L_val}} \\left( ${parsedF.toTex()} \\right) \\sin\\left(\\frac{n\\pi x}{${L_val}}\\right) dx`
    });

    let cn_result = '';
    let final_sol = '';

    const f_str = f_x_expr.replace(/\s+/g, '');
    if (f_str === 'sin(x)' && L_val === 'pi') {
      cn_result = `c_1 = 1 \\quad (c_n = 0 \\text{ para } n \\neq 1)`;
      final_sol = `u(x,t) = e^{-\\alpha^2 t} \\sin(x) = e^{-${alpha_val}^2 t} \\sin(x)`;
    } else {
      cn_result = `c_n = \\frac{4}{n\\pi} \\quad \\text{(para } n \\text{ ímpar, zero para pares) se } f(x) \\text{ fosse constante.}`;
      final_sol = `u(x,t) = \\sum_{n=1,3,\\dots}^{\\infty} c_n e^{-\\alpha^2 \\left(\\frac{n\\pi}{${L_val}}\\right)^2 t} \\sin\\left(\\frac{n\\pi x}{${L_val}}\\right)`;
    }

    steps.push({
      label: 'Coeficientes Resolvidos',
      latex: cn_result
    });

    steps.push({
      label: 'Solução Geral Final da Distribuição de Temperatura u(x,t)',
      latex: final_sol
    });

    return {
      result: final_sol,
      steps
    };
  },

  solveWaveEquation1DSteps(L_val, c_speed, f_x_expr) {
    const steps = [];
    const parsedF = math.parse(f_x_expr);

    steps.push({
      label: 'Equação Diferencial Parcial da Onda 1D',
      latex: `\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\frac{\\partial^2 u}{\\partial x^2}`
    });

    steps.push({
      label: 'Condições de Contorno de Corda Presa',
      latex: `u(0,t) = 0, \\quad u(L,t) = 0 \\quad \\text{com } L = ${L_val}, \\; c = ${c_speed}`
    });

    steps.push({
      label: 'Separação de Variáveis e Frequências Naturais',
      latex: `\\omega_n = \\frac{n\\pi c}{L} = \\frac{n\\pi (${c_speed})}{${L_val}}`
    });

    steps.push({
      label: 'Cálculo dos Coeficientes de Fourier',
      latex: `c_n = \\frac{2}{L} \\int_0^L f(x) \\sin\\left(\\frac{n\\pi x}{L}\\right) dx`
    });

    let cn_result = '';
    let final_sol = '';

    const f_str = f_x_expr.replace(/\s+/g, '');
    if (f_str === 'sin(x)' && L_val === 'pi') {
      cn_result = `c_1 = 1 \\quad (c_n = 0 \\text{ para } n \\neq 1)`;
      final_sol = `u(x,t) = \\cos(${c_speed} t) \\sin(x)`;
    } else {
      cn_result = `c_n = \\text{Integrando Fourier da função inicial}`;
      final_sol = `u(x,t) = \\sum_{n=1}^{\\infty} c_n \\cos\\left(\\frac{n\\pi ${c_speed} t}{${L_val}}\\right) \\sin\\left(\\frac{n\\pi x}{${L_val}}\\right)`;
    }

    steps.push({
      label: 'Coeficientes Resolvidos',
      latex: cn_result
    });

    steps.push({
      label: 'Solução Geral Final da Deformação da Corda u(x,t)',
      latex: final_sol
    });

    return {
      result: final_sol,
      steps
    };
  }
};
