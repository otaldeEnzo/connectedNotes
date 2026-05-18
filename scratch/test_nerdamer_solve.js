import nerdamer from 'nerdamer';
import 'nerdamer/Algebra.js';
import 'nerdamer/Calculus.js';
import 'nerdamer/Solve.js';

try {
    const eq = "x^2 = 25";
    // nerdamer.solve returns a Symbolic object or a list
    const solutions = nerdamer.solve(eq, 'x');
    console.log("Equação:", eq);
    console.log("Soluções (toString):", solutions.toString());
    console.log("Soluções (toTeX):", solutions.toTeX());

    const eq2 = "x + 2 = 5";
    const solutions2 = nerdamer.solve(eq2, 'x');
    console.log("\nEquação:", eq2);
    console.log("Soluções:", solutions2.toString());
    
    const eq3 = "sin(x) = 1";
    try {
        const solutions3 = nerdamer.solve(eq3, 'x');
        console.log("\nEquação:", eq3);
        console.log("Soluções:", solutions3.toString());
    } catch(e) {
        console.log("\nEquação:", eq3, " - Falha na resolução simbólica (esperado para trig)");
    }
} catch (e) {
    console.error("Erro:", e.message);
}
