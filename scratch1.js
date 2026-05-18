import fs from 'fs';

// Read the actual latexToMathJS code
const code = fs.readFileSync('src/services/MathService.js', 'utf8');

const regex = /latexToMathJS\((.*?)\s*{([\s\S]*?)^    },/m;
const match = code.match(regex);

if (match) {
  console.log("Found latexToMathJS");
} else {
  console.log("Could not find");
}
