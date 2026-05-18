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
     * Converts a LaTeX string from MathLive back to a mathjs compatible string.
     */
    latexToMathJS(latex) {
        if (!latex) return '';
        
        let clean = latex
            // Clean up LaTeX spacing commands first
            .replace(/\\(,|:|;|!| )/g, '')
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
                const cleanExpr = expr.replace(/\\(,|:|;|!| )/g, ''); 
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
    }
};

export default MathService;
