import { create, all } from 'mathjs';
const math = create(all);

try {
    const r1 = math.evaluate('10 m + 5 km');
    console.log("10m + 5km:");
    console.log("  toString:", r1.toString());
    console.log("  format:", math.format(r1, { precision: 14 }));
    
    const r2 = math.evaluate('100 kg * 9.8 m / s^2');
    console.log("\nForça (100kg * 9.8m/s^2):");
    console.log("  toString:", r2.toString());
    
    const r3 = math.evaluate('10 m to cm');
    console.log("\nConversão (10m to cm):");
    console.log("  toString:", r3.toString());

    // Teste de unidades incompatíveis
    try {
        math.evaluate('10 m + 5 s');
    } catch (e) {
        console.log("\nIncompatível (10m + 5s):", e.message);
    }

} catch (e) {
    console.error(e);
}
