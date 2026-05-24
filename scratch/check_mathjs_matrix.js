import { create, all } from 'mathjs';
const math = create(all);

const A = [[2, 1], [1, 2]];
const res = math.eigs(A);
console.log("Eigenvectors count:", res.eigenvectors.length);
res.eigenvectors.forEach((e, idx) => {
  console.log(`Eigenvalue ${idx}:`, e.value);
  console.log(`Vector ${idx}:`, e.vector);
});
