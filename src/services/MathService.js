import { create, all } from 'mathjs';

const math = create(all);
export { math };

/**
 * MathService provides local mathematical utilities using mathjs.
 */
export const MathService = {
    /**
     * Converts a raw error into a friendly Portuguese message.
     */
    getFriendlyError(err) {
        if (!err) return 'Erro desconhecido';
        const msg = err.message || String(err);
        if (msg.includes('Undefined symbol')) {
            const symbol = msg.match(/Undefined symbol (\w+)/)?.[1] || '';
            return `Símbolo '${symbol}' não definido`;
        }
        if (msg.includes('Unexpected type') || msg.includes('cannot be converted to')) {
            return 'Tipo de dado incompatível';
        }
        if (msg.includes('Unexpected end of expression') || msg.includes('Unexpected Part')) {
            return 'Expressão incompleta ou erro de sintaxe';
        }
        if (msg.includes('Value expected')) {
            return 'Esperava-se um valor/número';
        }
        return 'Erro de sintaxe ou operação inválida';
    },
    /**
     * Converts a MathJS expression or numeric result into a LaTeX string.
     */
    toLaTeX(expression) {
        if (expression === null || expression === undefined) return '0';

        try {
            // Se for matriz ou array, lidamos com formatação estrutural
            if ((expression && expression.isMatrix) || Array.isArray(expression)) {
                try {
                    const formatted = math.format(expression);
                    let tex = math.parse(formatted).toTex();
                    return tex.replace(/bmatrix/g, 'pmatrix');
                } catch (err) {
                    // Fallback manual para reconstruir a matriz em LaTeX
                    const rows = (expression.isMatrix) ? expression.toArray() : expression;
                    if (Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0])) {
                        const texRows = rows.map(r => r.join(' & ')).join(' \\\\ ');
                        return `\\begin{pmatrix} ${texRows} \\end{pmatrix}`;
                    }
                }
            }

            let exprToParse = expression;
            if (typeof expression !== 'string') {
                exprToParse = String(expression);
            }

            // Handle "x = value" string from solver
            if (typeof exprToParse === 'string' && exprToParse.startsWith('x = ')) {
                const val = exprToParse.replace('x = ', '');
                return `x = ${val}`;
            }

            let tex = math.parse(exprToParse).toTex();
            // mathjs generates \begin{bmatrix}, replace with pmatrix to match our input system
            return tex.replace(/bmatrix/g, 'pmatrix');
        } catch (e) {
            return String(expression);
        }
    },

    /**
     * Evaluates a mathematical expression and returns the result.
     * @param {string} expression - The math expression (e.g., '2 + 2', 'sqrt(16)').
     * @returns {string|number} - The result.
     */
    evaluate(expression) {
        try {
            // Handle equations (e.g., "x - 2 = 3x + 6")
            if (expression.includes('=')) {
                const parts = expression.split('=');
                if (parts.length === 2) {
                    const lhs = parts[0].trim();
                    const rhs = parts[1].trim();

                    // Transform to: lhs - (rhs) = 0
                    const eqToSolve = `${lhs} - (${rhs})`;

                    // Find x (simple numerical attempt or symbolic)
                    try {
                        // Attempt to solve for x if present
                        if (eqToSolve.includes('x')) {
                            // Basic linear solver attempt: 
                            // We can use a simplification trick or search for roots
                            // For simplicity, we'll try to simplify the expression first
                            const simplified = math.simplify(eqToSolve).toString();

                            // If simplified to something like "a*x + b", we can solve x = -b/a
                            // But mathjs doesn't have a direct "solve" for general eq.
                            // We return the simplified result for now, or use a numeric solver.
                            const roots = this.findRoot(eqToSolve, 'x');
                            if (roots !== null) return `x = ${roots}`;

                            return simplified;
                        }
                        const result = math.evaluate(eqToSolve);
                        return typeof result === 'number' ? Number(result.toFixed(4)) : String(result);
                    } catch (e) {
                        return `Erro: ${this.getFriendlyError(e)}`;
                    }
                }
            }

            const result = math.evaluate(expression);
            return typeof result === 'number' ? Number(result.toFixed(4)) : String(result);
        } catch (err) {
            if (!err.message.includes('Undefined symbol')) {
                console.error('MathService Error (evaluate):', err);
            }
            return `Erro: ${this.getFriendlyError(err)}`;
        }
    },

    /**
     * Finds a numerical root for an expression f(x) = 0
     */
    findRoot(expr, variable = 'x') {
        try {
            // Very basic Newton-ish or Bisection approach for simple linear/quadratic
            // For now, let's keep it simple: try a few values or use mathjs logic if possible
            // Actually, for a MVP, let's just use simplify and see if it yields a constant or linear
            const simplified = math.simplify(expr);
            const node = simplified;

            // Check if it's in the form a*x + b
            // We can check the derivative
            const d = math.derivative(expr, variable);
            const slope = d.evaluate({ [variable]: 0 }); // If constant, it's linear
            const yIntercept = math.evaluate(expr, { [variable]: 0 });

            if (typeof slope === 'number' && typeof yIntercept === 'number' && slope !== 0) {
                const root = -yIntercept / slope;
                return Number(root.toFixed(4));
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Simplifies a mathematical expression.
     * @param {string} expression - The expression to simplify.
     * @returns {string} - The simplified expression.
     */
    simplify(expression) {
        try {
            return math.simplify(expression).toString();
        } catch (err) {
            console.error('MathService Error (simplify):', err);
            return expression;
        }
    },

    /**
     * Attempts to provide intermediate simplification steps.
     * Note: Pure mathjs doesn't provide "human steps" directly, 
     * but we can simulate a few by progressive simplification 
     * or rule application.
     */
    getSimplificationSteps(expression) {
        const steps = [];
        try {
            let current = expression;
            steps.push({ label: 'Expressão Original', expr: current });

            // Detect equation
            let processExpr = current;
            if (current.includes('=')) {
                const parts = current.split('=');
                if (parts.length === 2) {
                    processExpr = `(${parts[0].trim()}) - (${parts[1].trim()})`;
                    steps.push({ label: 'Normalização (lado esquerdo)', expr: `${math.simplify(processExpr).toString()} = 0` });
                    current = processExpr;
                }
            }

            // Basic simplification
            const simplified = this.simplify(current);
            if (simplified !== current && simplified !== expression && simplified !== processExpr) {
                steps.push({ label: 'Simplificação', expr: simplified + (expression.includes('=') ? ' = 0' : '') });
                current = simplified;
            }

            // Rationalization (can help expand/combine)
            try {
                const rationalized = math.rationalize(current).toString();
                if (rationalized !== current && rationalized !== expression && rationalized !== simplified) {
                    steps.push({ label: 'Forma Racional', expr: rationalized });
                    current = rationalized;
                }
            } catch (e) { }

            // Derivada (Análise)
            try {
                const deriv = math.derivative(expression, 'x').toString();
                if (deriv !== '0') {
                    steps.push({ label: 'Derivada (d/dx)', expr: deriv });
                }
            } catch (e) { }

            // Numerical result
            const evaluated = this.evaluate(current);
            if (evaluated !== null && String(evaluated) !== current && String(evaluated) !== expression && String(evaluated) !== simplified) {
                steps.push({ label: 'Resultado Final', expr: String(evaluated) });
            }

            return steps;
        } catch (err) {
            return [{ label: 'Erro', expr: `\\text{${this.getFriendlyError(err)}}` }];
        }
    },

    /**
     * Converts a 2D array or mathjs matrix into a LaTeX \begin{pmatrix} ... \end{pmatrix} string.
     */
    matrixToLaTeX(matrix) {
        if (!matrix) return '0';
        const arr = (matrix && matrix.isMatrix) ? matrix.toArray() : matrix;
        if (!Array.isArray(arr) || arr.length === 0) return '0';
        if (!Array.isArray(arr[0])) {
            const cols = arr.map(val => {
                if (typeof val === 'number') return Number(val.toFixed(4));
                return String(val);
            }).join(' \\\\ ');
            return `\\begin{pmatrix} ${cols} \\end{pmatrix}`;
        }
        const rows = arr.map(r => r.map(val => {
            if (typeof val === 'number') return Number(val.toFixed(4));
            return String(val);
        }).join(' & ')).join(' \\\\ ');
        return `\\begin{pmatrix} ${rows} \\end{pmatrix}`;
    },

    /**
     * Computes step-by-step Gaussian Elimination (RREF) for a numeric matrix.
     */
    computeRREFSteps(matrixData) {
        if (!Array.isArray(matrixData) || matrixData.length === 0) return [];
        
        let M = matrixData.map(row => row.map(val => {
            if (val === '' || val === undefined) return 0;
            try {
                const evaluated = math.evaluate(String(val));
                return typeof evaluated === 'number' ? evaluated : parseFloat(evaluated) || 0;
            } catch(e) {
                const parsed = parseFloat(val);
                return isNaN(parsed) ? 0 : parsed;
            }
        }));

        const numRows = M.length;
        const numCols = M[0].length;
        const steps = [];

        steps.push({
            label: "Matriz Inicial",
            matrix: M.map(row => [...row])
        });

        let lead = 0;
        for (let r = 0; r < numRows; r++) {
            if (lead >= numCols) break;
            let i = r;
            while (M[i][lead] === 0) {
                i++;
                if (i === numRows) {
                    i = r;
                    lead++;
                    if (lead === numCols) return steps;
                }
            }

            if (i !== r) {
                let temp = M[i];
                M[i] = M[r];
                M[r] = temp;
                steps.push({
                    label: `Trocar Linha ${i + 1} e Linha ${r + 1} ($L_{${i+1}} \\leftrightarrow L_{${r+1}}$)`,
                    matrix: M.map(row => [...row])
                });
            }

            let val = M[r][lead];
            if (val !== 0 && Math.abs(val - 1) > 1e-9) {
                M[r] = M[r].map(x => x / val);
                steps.push({
                    label: `Multiplicar Linha ${r + 1} por $\\frac{1}{${Number(val.toFixed(4))}}$ ($L_{${r+1}} \\leftarrow \\frac{1}{${Number(val.toFixed(4))}} \\cdot L_{${r+1}}$)`,
                    matrix: M.map(row => [...row])
                });
            }

            for (let i = 0; i < numRows; i++) {
                if (i !== r) {
                    let factor = M[i][lead];
                    if (Math.abs(factor) > 1e-9) {
                        M[i] = M[i].map((x, colIdx) => x - factor * M[r][colIdx]);
                        steps.push({
                            label: `Subtrair ${Number(factor.toFixed(4))} vezes a Linha ${r + 1} da Linha ${i + 1} ($L_{${i+1}} \\leftarrow L_{${i+1}} - ${Number(factor.toFixed(4))} \\cdot L_{${r+1}}$)`,
                            matrix: M.map(row => [...row])
                        });
                    }
                }
            }
            lead++;
        }

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                if (Math.abs(M[i][j]) < 1e-9) M[i][j] = 0;
                else M[i][j] = Number(M[i][j].toFixed(4));
            }
        }

        steps.push({
            label: "Forma Escalonada Reduzida Final (RREF)",
            matrix: M.map(row => [...row])
        });

        return steps;
    },

    /**
     * Converts a LaTeX string from MathLive back to a mathjs compatible string.
     */
    latexToMathJS(latex) {
        if (!latex) return '';
        
        let clean = latex
            // Clean up LaTeX spacing commands first (using negative lookbehind to avoid matching the second backslash of \\)
            .replace(/(?<!\\)\\(,|:|;|!| )/g, '')
            // Fractions: \frac{num}{den} -> (num)/(den) (suporta até 3 níveis de aninhamento)
            .replace(/\\frac\s*({(?:[^{}]|{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*)*?}|.)\s*({(?:[^{}]|{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*)*?}|.)/g, (match, n, d) => {
                const num = n.startsWith('{') ? n.slice(1, -1) : n;
                const den = d.startsWith('{') ? d.slice(1, -1) : d;
                return `(${num})/(${den})`;
            })
            
            // 2. Roots: \sqrt{arg} -> sqrt(arg), \sqrt[n]{arg} -> nthRoot(arg, n)
            .replace(/\\sqrt\[([^\]]*)\]{((?:[^{}]|{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*})*)}/g, 'nthRoot($2, $1)')
            .replace(/\\sqrt{((?:[^{}]|{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*})*)}/g, 'sqrt($1)')

            // 3. Matrices: \begin{pmatrix} a & b \\ c & d \end{pmatrix} -> [[a, b], [c, d]]
            .replace(/\\begin{(?:p|b)?matrix}(.*?)\\end{(?:p|b)?matrix}/gs, (match, content) => {
                const rows = content.split('\\\\');
                const cleanRows = rows.map(row => {
                    const cols = row.split('&').map(c => c.trim()).filter(c => c !== '');
                    return '[' + cols.join(',') + ']';
                }).filter(r => r !== '[]');
                return '[' + cleanRows.join(',') + ']';
            })

            // 4. Transpose: (...)^T -> transpose(...)
            .replace(/\\left\((.*?)\\right\)\^{T}/g, 'transpose($1)')
            .replace(/((?:[^{}]|{[^{}]*})*)\^{T}/g, 'transpose($1)')
            
            // 5. Differential: \frac{d}{dx}(expr) -> diff(expr, x)
            .replace(/\\frac\s*{d}\s*{d([a-z])}\s*(?:\\left\(|\\\(|\()?(.*?)(?:\\right\)|\\\)|)?/g, 'diff($2, $1)')
            
            // Integral: \int_{a}^{b} expr dx -> integral(expr, x, a, b)
            .replace(/\\int(?:_{((?:[^{}]|{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*})*)}|_([a-zA-Z0-9]))?(?:\^{((?:[^{}]|{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*})*)}|\^([a-zA-Z0-9]))?\s*(.*?)\s*d([a-z])/g, (match, a1, a2, b1, b2, expr, v) => {
                const a = a1 || a2 || '';
                const b = b1 || b2 || '';
                const cleanExpr = expr.replace(/(?<!\\)\\(,|:|;|!| )/g, ''); 
                if (!a && !b) return `integral(${cleanExpr}, ${v})`;
                return `integral(${cleanExpr}, ${v}, ${a}, ${b})`;
            })

            // Limit: \lim_{x \to a} f(x) -> limit(f(x), x, a)
            .replace(/\\lim_{((?:[^{}]|{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*})*)\s*\\(?:to|rightarrow)\s*((?:[^{}]|{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*})*)}/g, 'limit_header($1,$2)')
            // Caso com \left( ... \right) ou ( ... ) - Suporta aninhamento de chaves na função
            .replace(/limit_header\(([^,]*),([^)]*)\)\s*(?:\\left\(|\()((?:[^{}]|{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*})*?)(?:\\right\)|\)|$)/g, 'limit($3, $1, $2)')
            // Caso sem parênteses (captura até o fim ou próximo delimitador lógico)
            .replace(/limit_header\(([^,]*),([^)]*)\)\s*((?:[^{}]|{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*})+)/g, 'limit($3, $1, $2)')

            // Summation: \sum_{i=1}^{10} {i^2} -> sum(i^2, i, 1, 10)
            .replace(/\\sum(?:\s|\\limits)*_{([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^}]+)}\^{([^}]+)}\s*({(?:[^{}]|{[^{}]*})*}|(?:\([^)]*\)|[a-zA-Z0-9_^]+)+|[^+\-*\/= ]+)/g, (match, v, start, end, expr) => {
                let cleanExpr = expr.trim();
                if (cleanExpr.startsWith('{') && cleanExpr.endsWith('}')) {
                    cleanExpr = cleanExpr.slice(1, -1);
                }
                return `sum(${cleanExpr}, ${v}, ${start}, ${end})`;
            })
            // Product: \prod_{i=1}^{10} {i} -> product(i, i, 1, 10)
            .replace(/\\prod(?:\s|\\limits)*_{([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^}]+)}\^{([^}]+)}\s*({(?:[^{}]|{[^{}]*})*}|(?:\([^)]*\)|[a-zA-Z0-9_^]+)+|[^+\-*\/= ]+)/g, (match, v, start, end, expr) => {
                let cleanExpr = expr.trim();
                if (cleanExpr.startsWith('{') && cleanExpr.endsWith('}')) {
                    cleanExpr = cleanExpr.slice(1, -1);
                }
                return `product(${cleanExpr}, ${v}, ${start}, ${end})`;
            })

            // Operators and constants
            .replace(/\\cdot/g, '*')
            .replace(/\\times/g, '*')
            .replace(/\\div/g, '/')
            .replace(/\\pi/g, 'pi')
            .replace(/\\tau/g, 'tau')
            .replace(/\\text{ans}/g, "ans")
            .replace(/\\text{preAns}/g, "preAns")
            .replace(/\\rightarrow/g, "=")
            .replace(/\\exp/g, "exp")
            
            // Advanced STEM Functions
            .replace(/\\infty/g, 'Infinity')
            .replace(/\\text{conj}/g, 'conj')
            .replace(/\\text{arg}/g, 'arg')
            .replace(/\\text{Re}/g, 're')
            .replace(/\\text{Im}/g, 'im')
            // Infix Vector Operators (captured between parentheses/brackets or words)
            .replace(/((?:[^+\-*/=,()]|\([^)]*\)|\[[^\]]*\])+)\\times_{vec}((?:[^+\-*/=,()]|\([^)]*\)|\[[^\]]*\])+)/g, 'cross($1,$2)')
            .replace(/((?:[^+\-*/=,()]|\([^)]*\)|\[[^\]]*\])+)\\cdot_{vec}((?:[^+\-*/=,()]|\([^)]*\)|\[[^\]]*\])+)/g, 'dot($1,$2)')
            .replace(/\\\|(.*?)\\\|/g, 'norm($1)')
            .replace(/\\hat{(.*?)}/g, '($1)/norm($1)')
            .replace(/\\text{media}/g, 'mean')
            .replace(/\\sigma\^2/g, 'var')
            .replace(/\\text{round}/g, 'round')
            .replace(/\\text{lcm}/g, 'lcm')
            .replace(/\\text{solve}/g, 'solve')
            .replace(/\\text{taylor}/g, 'taylor')
            .replace(/\\text{subst}/g, 'subst')
            .replace(/\\%/g, '/100')
            .replace(/\\gcd/g, 'gcd')

            // Combinations & Permutations
            .replace(/({[^{}]+}|[a-zA-Z0-9_]+)\\text{C}_({[^{}]+}|[a-zA-Z0-9_]+)/g, (match, n, k) => {
                const cleanN = n.startsWith('{') ? n.slice(1, -1) : n;
                const cleanK = k.startsWith('{') ? k.slice(1, -1) : k;
                return `combinations(${cleanN}, ${cleanK})`;
            })
            .replace(/({[^{}]+}|[a-zA-Z0-9_]+)\\text{P}_({[^{}]+}|[a-zA-Z0-9_]+)/g, (match, n, k) => {
                const cleanN = n.startsWith('{') ? n.slice(1, -1) : n;
                const cleanK = k.startsWith('{') ? k.slice(1, -1) : k;
                return `permutations(${cleanN}, ${cleanK})`;
            })

            // Brackets: \left( ... \right) -> ( ... )
            .replace(/\\left\(/g, '(')
            .replace(/\\right\)/g, ')')
            .replace(/\\left\[/g, '[')
            .replace(/\\right\]/g, ']')
            .replace(/\\left\\{/g, '{')
            .replace(/\\right\\}/g, '}')
            
            // Functions
            .replace(/\\sin/g, 'sin')
            .replace(/\\cos/g, 'cos')
            .replace(/\\tan/g, 'tan')
            .replace(/\\sinh/g, 'sinh')
            .replace(/\\cosh/g, 'cosh')
            .replace(/\\tanh/g, 'tanh')
            .replace(/sen\(/g, 'sin(') 
            .replace(/tg\(/g, 'tan(')
            .replace(/\\arcsin/g, 'asin')
            .replace(/\\arccos/g, 'acos')
            .replace(/\\arctan/g, 'atan')
            .replace(/\\log_{([^}]*)}\(([^)]*)\)/g, 'log($2, $1)')
            .replace(/\\log/g, 'log')
            .replace(/\\ln/g, 'ln')
            
            // Cleanup: MathLive sometimes adds \placeholder{}
            .replace(/\\placeholder{[^{}]*}/g, "")
            .replace(/{/g, '(')
            .replace(/}/g, ')')
            .replace(/\\/g, '') // Remove remaining backslashes
            .replace(/\s/g, ''); // Remove spaces

        return clean;
    },

    /**
     * Helper to evaluate a dynamic matrix cell values into a purely numeric matrix.
     */
    evaluateNumericMatrix(matrixData) {
        if (!Array.isArray(matrixData)) return [];
        return matrixData.map(row => row.map(val => {
            if (val === '' || val === undefined || val === null) return 0;
            try {
                const evaluated = math.evaluate(String(val));
                if (typeof evaluated === 'number') return evaluated;
                if (evaluated && evaluated.isComplex) return evaluated.re;
                if (evaluated && evaluated.isFraction) return evaluated.valueOf();
                const parsed = parseFloat(evaluated);
                return isNaN(parsed) ? 0 : parsed;
            } catch(e) {
                const parsed = parseFloat(val);
                return isNaN(parsed) ? 0 : parsed;
            }
        }));
    },

    /**
     * Solves a linear system Ax = b using RREF and determines solution parameters.
     */
    solveLinearSystem(matrixA, vectorB) {
        const A = this.evaluateNumericMatrix(matrixA);
        const m = A.length;
        const n = A[0].length;
        
        const b = vectorB.map(val => {
            if (val === '' || val === undefined || val === null) return 0;
            try {
                const evaluated = math.evaluate(String(val));
                if (typeof evaluated === 'number') return evaluated;
                if (evaluated && evaluated.isFraction) return evaluated.valueOf();
                return parseFloat(evaluated) || 0;
            } catch(e) {
                return parseFloat(val) || 0;
            }
        });
        
        const augmented = A.map((row, idx) => [...row, b[idx]]);
        
        const rrefSteps = this.computeRREFSteps(augmented);
        if (rrefSteps.length === 0) {
            return { status: 'none', solutionTex: '\\text{Erro ao calcular RREF.}', steps: [] };
        }
        
        const R = rrefSteps[rrefSteps.length - 1].matrix;
        
        let isInconsistent = false;
        for (let r = 0; r < m; r++) {
            let coeffAllZero = true;
            for (let c = 0; c < n; c++) {
                if (Math.abs(R[r][c]) > 1e-9) {
                    coeffAllZero = false;
                    break;
                }
            }
            if (coeffAllZero && Math.abs(R[r][n]) > 1e-9) {
                isInconsistent = true;
                break;
            }
        }
        
        if (isInconsistent) {
            return {
                status: 'none',
                solutionTex: '\\text{Sem Solução (Sistema Inconsistente)}',
                steps: rrefSteps,
                augmentedRREF: R
            };
        }
        
        const pivotCols = [];
        const rowOfPivot = [];
        for (let r = 0; r < m; r++) {
            let lead = -1;
            for (let c = 0; c < n; c++) {
                if (Math.abs(R[r][c] - 1) < 1e-9) {
                    let allZerosBefore = true;
                    for (let prev = 0; prev < c; prev++) {
                        if (Math.abs(R[r][prev]) > 1e-9) allZerosBefore = false;
                    }
                    if (allZerosBefore) {
                        lead = c;
                        break;
                    }
                }
            }
            if (lead !== -1) {
                pivotCols.push(lead);
                rowOfPivot[lead] = r;
            }
        }
        
        const freeCols = Array.from({ length: n }, (_, idx) => idx).filter(c => !pivotCols.includes(c));
        
        if (freeCols.length === 0) {
            const solVec = Array(n).fill(0);
            const details = [];
            for (let j = 0; j < n; j++) {
                const r = rowOfPivot[j];
                const val = r !== undefined ? R[r][n] : 0;
                solVec[j] = Number(val.toFixed(4));
                details.push(`x_{${j + 1}} = ${solVec[j]}`);
            }
            const tex = `\\begin{pmatrix} ${solVec.join(' \\\\ ')} \\end{pmatrix}`;
            
            return {
                status: 'unique',
                solutionTex: `\\mathbf{x} = ${tex} \\quad \\left( ${details.join(', ')} \\right)`,
                steps: rrefSteps,
                augmentedRREF: R,
                solutionVector: solVec
            };
        } else {
            const paramMap = {};
            freeCols.forEach((f, idx) => {
                paramMap[f] = `t_{${idx + 1}}`;
            });
            
            const equations = [];
            for (let j = 0; j < n; j++) {
                if (pivotCols.includes(j)) {
                    const r = rowOfPivot[j];
                    const constantVal = R[r][n];
                    let eq = '';
                    if (Math.abs(constantVal) > 1e-9 || freeCols.length === 0) {
                        eq += Number(constantVal.toFixed(4));
                    }
                    
                    freeCols.forEach(f => {
                        const coef = -R[r][f];
                        if (Math.abs(coef) > 1e-9) {
                            const sign = coef > 0 ? (eq ? ' + ' : '') : ' - ';
                            const absCoef = Math.abs(coef);
                            const coefStr = Math.abs(absCoef - 1) < 1e-9 ? '' : Number(absCoef.toFixed(4));
                            eq += `${sign}${coefStr}${paramMap[f]}`;
                        }
                    });
                    
                    if (!eq) eq = '0';
                    equations.push(`x_{${j + 1}} = ${eq}`);
                } else {
                    equations.push(`x_{${j + 1}} = ${paramMap[j]} \\quad (\\text{livre})`);
                }
            }
            
            const xpVec = Array(n).fill(0);
            pivotCols.forEach(p => {
                const r = rowOfPivot[p];
                xpVec[p] = Number(R[r][n].toFixed(4));
            });
            
            let tex = `\\mathbf{x} = ${this.matrixToLaTeX(xpVec)}`;
            
            freeCols.forEach((f, idx) => {
                const v = Array(n).fill(0);
                v[f] = 1;
                pivotCols.forEach(p => {
                    const r = rowOfPivot[p];
                    v[p] = Number((-R[r][f]).toFixed(4));
                });
                
                tex += ` + ${paramMap[f]} ${this.matrixToLaTeX(v)}`;
            });
            
            return {
                status: 'infinite',
                solutionTex: `\\begin{aligned} &${tex} \\\\[8pt] &\\text{Soluções: } \\begin{cases} ${equations.join(' \\\\ ')} \\end{cases} \\end{aligned}`,
                steps: rrefSteps,
                augmentedRREF: R,
                freeVariables: freeCols.length
            };
        }
    },

    /**
     * Computes LU Decomposition A = P^T L U.
     */
    decomposeLU(matrixA) {
        const A = this.evaluateNumericMatrix(matrixA);
        const n = A.length;
        if (n !== A[0].length) {
            throw new Error("A decomposição LU exige uma matriz quadrada.");
        }
        
        const res = math.lup(A);
        const L_arr = res.L.isMatrix ? res.L.toArray() : res.L;
        const U_arr = res.U.isMatrix ? res.U.toArray() : res.U;
        const p_arr = res.p;
        
        const P_arr = Array.from({ length: n }, () => Array(n).fill(0));
        p_arr.forEach((pVal, idx) => {
            P_arr[idx][pVal] = 1;
        });
        
        const cleanMatrix = (mat) => mat.map(row => row.map(val => Math.abs(val) < 1e-9 ? 0 : Number(val.toFixed(4))));
        
        return {
            P: P_arr,
            L: cleanMatrix(L_arr),
            U: cleanMatrix(U_arr)
        };
    },

    /**
     * Computes QR Decomposition A = Q R.
     */
    decomposeQR(matrixA) {
        const A = this.evaluateNumericMatrix(matrixA);
        const m = A.length;
        const n = A[0].length;
        
        const Q = Array.from({ length: m }, () => Array(n).fill(0));
        const R = Array.from({ length: n }, () => Array(n).fill(0));
        
        for (let j = 0; j < n; j++) {
            let v = Array.from({ length: m }, (_, i) => A[i][j]);
            for (let i = 0; i < j; i++) {
                let qi = Array.from({ length: m }, (_, r) => Q[r][i]);
                let dot = qi.reduce((sum, qval, r) => sum + qval * A[r][j], 0);
                R[i][j] = dot;
                for (let r = 0; r < m; r++) {
                    v[r] -= dot * qi[r];
                }
            }
            let norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
            if (norm < 1e-9) {
                R[j][j] = 0;
                for (let r = 0; r < m; r++) Q[r][j] = 0;
            } else {
                R[j][j] = norm;
                for (let r = 0; r < m; r++) {
                    Q[r][j] = v[r] / norm;
                }
            }
        }
        
        const cleanMatrix = (mat) => mat.map(row => row.map(val => Math.abs(val) < 1e-9 ? 0 : Number(val.toFixed(4))));
        return { Q: cleanMatrix(Q), R: cleanMatrix(R) };
    },

    /**
     * Computes Cholesky Decomposition A = L L^T.
     */
    decomposeCholesky(matrixA) {
        const A = this.evaluateNumericMatrix(matrixA);
        const n = A.length;
        if (n !== A[0].length) {
            throw new Error("A decomposição de Cholesky exige uma matriz quadrada.");
        }
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (Math.abs(A[i][j] - A[j][i]) > 1e-9) {
                    throw new Error("A matriz de Cholesky deve ser simétrica.");
                }
            }
        }
        
        const L = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                let sum = 0;
                for (let k = 0; k < j; k++) {
                    sum += L[i][k] * L[j][k];
                }
                
                if (i === j) {
                    const val = A[i][i] - sum;
                    if (val <= 0) {
                        throw new Error("A matriz de Cholesky deve ser definida positiva.");
                    }
                    L[i][j] = Math.sqrt(val);
                } else {
                    L[i][j] = (A[i][j] - sum) / L[j][j];
                }
            }
        }
        
        const cleanMatrix = (mat) => mat.map(row => row.map(val => Math.abs(val) < 1e-9 ? 0 : Number(val.toFixed(4))));
        return { L: cleanMatrix(L) };
    },

    /**
     * Computes Rank, Nullity, Column Space Basis and Null Space Basis (Kernel).
     */
    analyzeVectorSpace(matrixA) {
        const A = this.evaluateNumericMatrix(matrixA);
        const m = A.length;
        const n = A[0].length;
        
        const rrefSteps = this.computeRREFSteps(A);
        if (rrefSteps.length === 0) {
            return { rank: 0, nullity: n, colSpaceBasis: [], nullSpaceBasis: [] };
        }
        
        const R = rrefSteps[rrefSteps.length - 1].matrix;
        
        const pivotCols = [];
        const rowOfPivot = [];
        for (let r = 0; r < m; r++) {
            let lead = -1;
            for (let c = 0; c < n; c++) {
                if (Math.abs(R[r][c] - 1) < 1e-9) {
                    let allZerosBefore = true;
                    for (let prev = 0; prev < c; prev++) {
                        if (Math.abs(R[r][prev]) > 1e-9) allZerosBefore = false;
                    }
                    if (allZerosBefore) {
                        lead = c;
                        break;
                    }
                }
            }
            if (lead !== -1) {
                pivotCols.push(lead);
                rowOfPivot[lead] = r;
            }
        }
        
        const rank = pivotCols.length;
        const nullity = n - rank;
        
        const colSpaceBasis = pivotCols.map(colIdx => {
            return Array.from({ length: m }, (_, r) => Number(A[r][colIdx].toFixed(4)));
        });
        
        const nullSpaceBasis = [];
        if (nullity > 0) {
            const freeCols = Array.from({ length: n }, (_, idx) => idx).filter(c => !pivotCols.includes(c));
            
            freeCols.forEach(f => {
                const vec = Array(n).fill(0);
                vec[f] = 1;
                
                pivotCols.forEach(p => {
                    const r = rowOfPivot[p];
                    vec[p] = -R[r][f];
                });
                
                const cleanVec = vec.map(val => Math.abs(val) < 1e-9 ? 0 : Number(val.toFixed(4)));
                nullSpaceBasis.push(cleanVec);
            });
        }
        
        return {
            rank,
            nullity,
            colSpaceBasis,
            nullSpaceBasis,
            augmentedRREF: R
        };
    },

    /**
     * Parses a system of linear equations from strings and extracts A and b matrices.
     */
    parseLinearEquations(equationsStrings) {
        if (!Array.isArray(equationsStrings) || equationsStrings.length === 0) {
            throw new Error("Nenhuma equação fornecida.");
        }

        const equations = equationsStrings
            .map(eq => eq.trim())
            .filter(eq => eq !== '');

        if (equations.length === 0) {
            throw new Error("Nenhuma equação válida fornecida.");
        }

        const parsedExprs = [];
        const variablesSet = new Set();
        const ignoreSymbols = new Set(['pi', 'e', 'i', 'Infinity', 'NaN', 'true', 'false']);

        equations.forEach((eq, idx) => {
            let lhs = eq;
            let rhs = '0';
            if (eq.includes('=')) {
                const parts = eq.split('=');
                if (parts.length !== 2) {
                    throw new Error(`Equação ${idx + 1} inválida: deve conter exatamente um caractere '='.`);
                }
                lhs = parts[0].trim();
                rhs = parts[1].trim();
            }

            const normalExpr = `(${lhs}) - (${rhs})`;
            let node;
            try {
                node = math.parse(normalExpr);
            } catch (err) {
                throw new Error(`Erro de sintaxe na Equação ${idx + 1}: ${err.message}`);
            }

            parsedExprs.push({ node, exprStr: normalExpr, index: idx + 1 });

            function findSymbols(n) {
                if (n.type === 'SymbolNode') {
                    if (!ignoreSymbols.has(n.name) && typeof math[n.name] === 'undefined') {
                        variablesSet.add(n.name);
                    }
                }
                n.forEach(findSymbols);
            }
            findSymbols(node);
        });

        const variables = Array.from(variablesSet).sort();
        if (variables.length === 0) {
            throw new Error("Nenhuma variável encontrada nas equações (ex: use x, y, z).");
        }

        const m = parsedExprs.length;
        const n = variables.length;

        const A = Array.from({ length: m }, () => Array(n).fill(0));
        const b = Array(m).fill(0);

        const zeroScope = {};
        const oneScope = {};
        variables.forEach(v => {
            zeroScope[v] = 0;
            oneScope[v] = 1;
        });

        parsedExprs.forEach((item, i) => {
            let constEval;
            try {
                constEval = item.node.evaluate(zeroScope);
                b[i] = -constEval;
            } catch (err) {
                throw new Error(`Erro ao avaliar a constante na Equação ${item.index}.`);
            }

            variables.forEach((v, j) => {
                let deriv;
                try {
                    deriv = math.derivative(item.node, v);
                } catch (err) {
                    throw new Error(`Erro ao calcular a derivada na Equação ${item.index} para a variável ${v}.`);
                }

                const coefZero = deriv.evaluate(zeroScope);
                const coefOne = deriv.evaluate(oneScope);

                if (Math.abs(coefZero - coefOne) > 1e-9) {
                    throw new Error(`A Equação ${item.index} não é linear para a variável ${v} (ex: evite potências ou multiplicações de variáveis).`);
                }

                A[i][j] = coefZero;
            });
        });

        const cleanA = A.map(row => row.map(val => Math.abs(val) < 1e-9 ? 0 : Number(val.toFixed(4))));
        const cleanB = b.map(val => Math.abs(val) < 1e-9 ? 0 : Number(val.toFixed(4)));

        return { A: cleanA, b: cleanB, variables };
    }
};

export default MathService;
