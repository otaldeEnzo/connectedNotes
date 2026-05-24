import { MathService } from '../src/services/MathService.js';

const exprs = [
  "\\begin{pmatrix}1 & 2 \\\\ 3 & 4\\end{pmatrix} \\cdot \\begin{pmatrix}1 & 1 \\\\ 1 & 1\\end{pmatrix}",
  "\\begin{pmatrix}1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\cdot \\begin{pmatrix}1 & 1 \\\\ 1 & 1 \\end{pmatrix}",
  "\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}\\cdot\\begin{pmatrix} 1 & 1 \\\\ 1 & 1 \\end{pmatrix}",
  "\\left( \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\right) \\cdot \\begin{pmatrix} 1 & 1 \\\\ 1 & 1 \\end{pmatrix}"
];

for(let expr of exprs) {
  console.log("-----------------------------------------");
  console.log("IN:", expr);
  const mathStr = MathService.latexToMathJS(expr);
  console.log("MATHJS:", mathStr);
  const evaluated = MathService.evaluate(mathStr);
  console.log("EVALUATED:", evaluated);
}
