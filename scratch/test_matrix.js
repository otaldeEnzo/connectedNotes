function testMatrixParsing(latex) {
    if (!latex) return '';
    
    console.log("Original latex:", JSON.stringify(latex));

    let clean = latex
        // Clean up LaTeX spacing commands first (using negative lookbehind to avoid matching second backslash of \\)
        .replace(/(?<!\\)\\(,|:|;|!| )/g, '');
    
    console.log("After spacing cleanup:", JSON.stringify(clean));

    // Matrices: \begin{pmatrix} a & b \\ c & d \end{pmatrix} -> [[a, b], [c, d]]
    clean = clean.replace(/\\begin{(?:p|b)?matrix}(.*?)\\end{(?:p|b)?matrix}/gs, (match, content) => {
        console.log("Matrix content found:", JSON.stringify(content));
        const rows = content.split('\\\\');
        console.log("Split rows:", JSON.stringify(rows));
        const cleanRows = rows.map(row => {
            const cols = row.split('&').map(c => c.trim()).filter(c => c !== '');
            return '[' + cols.join(',') + ']';
        }).filter(r => r !== '[]');
        return '[' + cleanRows.join(',') + ']';
    });

    console.log("After matrix replacement:", JSON.stringify(clean));

    clean = clean
        .replace(/{/g, '(')
        .replace(/}/g, ')')
        .replace(/\\/g, '') // Remove remaining backslashes
        .replace(/\s/g, ''); // Remove spaces

    console.log("Final clean output:", JSON.stringify(clean));
    return clean;
}

const exprs = [
  "\\begin{pmatrix}1 & 2 \\\\ 3 & 4\\end{pmatrix} \\cdot \\begin{pmatrix}1 & 1 \\\\ 1 & 1\\end{pmatrix}",
  "\\begin{pmatrix}1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\cdot \\begin{pmatrix}1 & 1 \\\\ 1 & 1 \\end{pmatrix}",
  "\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}\\cdot\\begin{pmatrix} 1 & 1 \\\\ 1 & 1 \\end{pmatrix}",
  "\\left( \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\right) \\cdot \\begin{pmatrix} 1 & 1 \\\\ 1 & 1 \\end{pmatrix}"
];

for(let expr of exprs) {
  console.log("-----------------------------------------");
  testMatrixParsing(expr);
}
