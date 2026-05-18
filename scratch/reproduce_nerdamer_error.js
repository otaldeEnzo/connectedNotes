import nerdamer from 'nerdamer';
import 'nerdamer/Algebra.js';
import 'nerdamer/Calculus.js';
import 'nerdamer/Solve.js';

try {
    const variables = { A: 50 };
    const processed = "A + x = 100";
    const solveVar = 'x';

    console.log("Input:", processed);
    
    // Substituição textual
    let eqStr = processed;
    Object.entries(variables).forEach(([v, val]) => {
        if (v !== solveVar && typeof val === 'number') {
            // Regex para garantir que substituímos apenas a variável exata (ex: A e não Area)
            const regex = new RegExp(`\\b${v}\\b`, 'g');
            eqStr = eqStr.replace(regex, val);
        }
    });
    console.log("Após substituição textual:", eqStr);

    // Normalização opcional: A + x = 100 -> A + x - (100)
    if (eqStr.includes('=')) {
        const sides = eqStr.split('=');
        eqStr = `(${sides[0]}) - (${sides[1]})`;
    }
    console.log("Normalizada para solver:", eqStr);

    const solutions = nerdamer.solve(eqStr, solveVar);
    console.log("Soluções:", solutions.toString());
    console.log("Soluções (TeX):", solutions.toTeX());

    // Teste 2: x^2 = 64
    console.log("\nTeste 2: x^2 = 64");
    const sol2 = nerdamer.solve("(x^2) - (64)", "x");
    console.log("Soluções x^2=64:", sol2.toString());

} catch (e) {
    console.error("ERRO NO TESTE:", e.stack);
}
