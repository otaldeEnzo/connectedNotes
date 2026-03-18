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
        try {
            if (typeof expression !== 'string') return String(expression);
            // Handle "x = value" string from solver
            if (expression.startsWith('x = ')) {
                const val = expression.replace('x = ', '');
                return `x = ${val}`;
            }
            return math.parse(expression).toTex();
        } catch (e) {
            return expression;
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
     * Converts a LaTeX string back to mathjs compatible string.
     * Basic implementation for common symbols.
     */
    latexToMathJS(latex) {
        if (!latex) return '';
        let clean = latex
            .replace(/\\frac{([^}]*)}{([^}]*)}/g, '($1)/($2)')
            .replace(/\\cdot/g, '*')
            .replace(/\\times/g, '*')
            .replace(/\\sqrt{([^}]*)}/g, 'sqrt($1)')
            .replace(/\\sin/g, 'sin')
            .replace(/\\cos/g, 'cos')
            .replace(/\\tan/g, 'tan')
            .replace(/\\log/g, 'log')
            .replace(/\\ln/g, 'ln')
            .replace(/\\pi/g, 'pi')
            .replace(/\\left\(/g, '(')
            .replace(/\\right\)/g, ')')
            .replace(/\^/g, '^')
            .replace(/{([^}]*)}/g, '$1')
            .replace(/\\/g, ''); // Remove remaining backslashes
        return clean;
    }
};
