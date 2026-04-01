/**
 * STEMService.js
 * Centralizes scientific data (symbols, constants, units, elements, formulas) 
 * for the Connected Notes STEM specialization.
 */

import NATIVE_CONSTANTS from '../data/constants.json';

export const STEM_CONSTANTS = NATIVE_CONSTANTS;

export const STEM_SYMBOLS = {
  Greek: [
    { label: 'α', cmd: '\\alpha' }, { label: 'β', cmd: '\\beta' }, { label: 'γ', cmd: '\\gamma' },
    { label: 'δ', cmd: '\\delta' }, { label: 'ε', cmd: '\\epsilon' }, { label: 'ζ', cmd: '\\zeta' },
    { label: 'η', cmd: '\\eta' }, { label: 'θ', cmd: '\\theta' }, { label: 'ι', cmd: '\\iota' },
    { label: 'κ', cmd: '\\kappa' }, { label: 'λ', cmd: '\\lambda' }, { label: 'μ', cmd: '\\mu' },
    { label: 'ν', cmd: '\\nu' }, { label: 'ξ', cmd: '\\xi' }, { label: 'π', cmd: '\\pi' },
    { label: 'ρ', cmd: '\\rho' }, { label: 'σ', cmd: '\\sigma' }, { label: 'τ', cmd: '\\tau' },
    { label: 'φ', cmd: '\\phi' }, { label: 'ψ', cmd: '\\psi' }, { label: 'ω', cmd: '\\omega' },
    { label: 'Γ', cmd: '\\Gamma' }, { label: 'Δ', cmd: '\\Delta' }, { label: 'Θ', cmd: '\\Theta' },
    { label: 'Λ', cmd: '\\Lambda' }, { label: 'Ξ', cmd: '\\Xi' }, { label: 'Π', cmd: '\\Pi' },
    { label: 'Σ', cmd: '\\Sigma' }, { label: 'Φ', cmd: '\\Phi' }, { label: 'Ψ', cmd: '\\Psi' },
    { label: 'Ω', cmd: '\\Omega' }
  ],
  Operators: [
    { label: '∑', cmd: '\\sum_{i=1}^{n}' }, { label: '∏', cmd: '\\prod' },
    { label: '∫', cmd: '\\int' }, { label: '∬', cmd: '\\iint' }, { label: '∭', cmd: '\\iiint' },
    { label: '∮', cmd: '\\oint' }, { label: '∂', cmd: '\\partial' }, { label: '∇', cmd: '\\nabla' },
    { label: '∆', cmd: '\\triangle' }, { label: '√', cmd: '\\sqrt{x}' }, { label: '∛', cmd: '\\sqrt[3]{x}' }
  ],
  Relations: [
    { label: '≈', cmd: '\\approx' }, { label: '≠', cmd: '\\neq' }, { label: '≤', cmd: '\\leq' },
    { label: '≥', cmd: '\\geq' }, { label: '≡', cmd: '\\equiv' }, { label: '∝', cmd: '\\propto' },
    { label: '±', cmd: '\\pm' }, { label: '∓', cmd: '\\mp' }
  ],
  LogicSets: [
    { label: '∀', cmd: '\\forall' }, { label: '∃', cmd: '\\exists' }, { label: '¬', cmd: '\\neg' },
    { label: '∧', cmd: '\\wedge' }, { label: '∨', cmd: '\\vee' }, { label: '∩', cmd: '\\cap' },
    { label: '∪', cmd: '\\cup' }, { label: '∈', cmd: '\\in' }, { label: '∉', cmd: '\\notin' },
    { label: '⊂', cmd: '\\subset' }, { label: '⊆', cmd: '\\subseteq' }, { label: '⇒', cmd: '\\Rightarrow' },
    { label: '⇔', cmd: '\\Leftrightarrow' }
  ],
  Arrows: [
    { label: '←', cmd: '\\leftarrow' }, { label: '→', cmd: '\\rightarrow' },
    { label: '↑', cmd: '\\uparrow' }, { label: '↓', cmd: '\\downarrow' },
    { label: '↔', cmd: '\\leftrightarrow' }, { label: '⇒', cmd: '\\Rightarrow' }
  ],
  Misc: [
    { label: '∞', cmd: '\\infty' }, { label: 'ħ', cmd: '\\hbar' },
    { label: 'lim', cmd: '\\lim_{x \\to \\infty}' }, { label: 'exp', cmd: 'e^{x}' },
    { label: 'log', cmd: '\\log_{10}' }, { label: 'ln', cmd: '\\ln' }
  ]
};

// Internal state for runtime constants (simulating JSON updates)
let customConstants = [];

export const PERIODIC_TABLE = [
  { symbol: 'H', name: 'Hidrogênio', atomicNumber: 1, atomicMass: 1.008, group: 'non-metal', row: 1, column: 1, electronegativity: 2.20, electronConfig: '1s¹' },
  { symbol: 'He', name: 'Hélio', atomicNumber: 2, atomicMass: 4.0026, group: 'noble-gas', row: 1, column: 18, electronegativity: null, electronConfig: '1s²' },
  { symbol: 'Li', name: 'Lítio', atomicNumber: 3, atomicMass: 6.94, group: 'alkali-metal', row: 2, column: 1, electronegativity: 0.98, electronConfig: '[He] 2s¹' },
  { symbol: 'Be', name: 'Berílio', atomicNumber: 4, atomicMass: 9.01, group: 'alkaline-earth', row: 2, column: 2, electronegativity: 1.57, electronConfig: '[He] 2s²' },
  { symbol: 'B', name: 'Boro', atomicNumber: 5, atomicMass: 10.81, group: 'metalloid', row: 2, column: 13, electronegativity: 2.04, electronConfig: '[He] 2s² 2p¹' },
  { symbol: 'C', name: 'Carbono', atomicNumber: 6, atomicMass: 12.01, group: 'non-metal', row: 2, column: 14, electronegativity: 2.55, electronConfig: '[He] 2s² 2p²' },
  { symbol: 'N', name: 'Nitrogênio', atomicNumber: 7, atomicMass: 14.01, group: 'non-metal', row: 2, column: 15, electronegativity: 3.04, electronConfig: '[He] 2s² 2p³' },
  { symbol: 'O', name: 'Oxigênio', atomicNumber: 8, atomicMass: 16.00, group: 'non-metal', row: 2, column: 16, electronegativity: 3.44, electronConfig: '[He] 2s² 2p⁴' },
  { symbol: 'F', name: 'Flúor', atomicNumber: 9, atomicMass: 19.00, group: 'non-metal', row: 2, column: 17, electronegativity: 3.98, electronConfig: '[He] 2s² 2p⁵' },
  { symbol: 'Ne', name: 'Neônio', atomicNumber: 10, atomicMass: 20.18, group: 'noble-gas', row: 2, column: 18, electronegativity: null, electronConfig: '[He] 2s² 2p⁶' },
  { symbol: 'Na', name: 'Sódio', atomicNumber: 11, atomicMass: 22.990, group: 'alkali-metal', row: 3, column: 1, electronegativity: 0.93, electronConfig: '[Ne] 3s¹' },
  { symbol: 'Mg', name: 'Magnésio', atomicNumber: 12, atomicMass: 24.305, group: 'alkaline-earth', row: 3, column: 2, electronegativity: 1.31, electronConfig: '[Ne] 3s²' },
  { symbol: 'Al', name: 'Alumínio', atomicNumber: 13, atomicMass: 26.982, group: 'post-transition', row: 3, column: 13, electronegativity: 1.61, electronConfig: '[Ne] 3s² 3p¹' },
  { symbol: 'Si', name: 'Silício', atomicNumber: 14, atomicMass: 28.085, group: 'metalloid', row: 3, column: 14, electronegativity: 1.90, electronConfig: '[Ne] 3s² 3p²' },
  { symbol: 'P', name: 'Fósforo', atomicNumber: 15, atomicMass: 30.974, group: 'non-metal', row: 3, column: 15, electronegativity: 2.19, electronConfig: '[Ne] 3s² 3p³' },
  { symbol: 'S', name: 'Enxofre', atomicNumber: 16, atomicMass: 32.06, group: 'non-metal', row: 3, column: 16, electronegativity: 2.58, electronConfig: '[Ne] 3s² 3p⁴' },
  { symbol: 'Cl', name: 'Cloro', atomicNumber: 17, atomicMass: 35.45, group: 'non-metal', row: 3, column: 17, electronegativity: 3.16, electronConfig: '[Ne] 3s² 3p⁵' },
  { symbol: 'Ar', name: 'Argônio', atomicNumber: 18, atomicMass: 39.948, group: 'noble-gas', row: 3, column: 18, electronegativity: null, electronConfig: '[Ne] 3s² 3p⁶' },
  { symbol: 'K', name: 'Potássio', atomicNumber: 19, atomicMass: 39.098, group: 'alkali-metal', row: 4, column: 1, electronegativity: 0.82, electronConfig: '[Ar] 4s¹' },
  { symbol: 'Ca', name: 'Cálcio', atomicNumber: 20, atomicMass: 40.078, group: 'alkaline-earth', row: 4, column: 2, electronegativity: 1.00, electronConfig: '[Ar] 4s²' },
  { symbol: 'Sc', name: 'Escândio', atomicNumber: 21, atomicMass: 44.956, group: 'transition-metal', row: 4, column: 3, electronegativity: 1.36, electronConfig: '[Ar] 3d¹ 4s²' },
  { symbol: 'Ti', name: 'Titânio', atomicNumber: 22, atomicMass: 47.867, group: 'transition-metal', row: 4, column: 4, electronegativity: 1.54, electronConfig: '[Ar] 3d² 4s²' },
  { symbol: 'V', name: 'Vanádio', atomicNumber: 23, atomicMass: 50.942, group: 'transition-metal', row: 4, column: 5, electronegativity: 1.63, electronConfig: '[Ar] 3d³ 4s²' },
  { symbol: 'Cr', name: 'Cromo', atomicNumber: 24, atomicMass: 51.996, group: 'transition-metal', row: 4, column: 6, electronegativity: 1.66, electronConfig: '[Ar] 3d⁵ 4s¹' },
  { symbol: 'Mn', name: 'Manganês', atomicNumber: 25, atomicMass: 54.938, group: 'transition-metal', row: 4, column: 7, electronegativity: 1.55, electronConfig: '[Ar] 3d⁵ 4s²' },
  { symbol: 'Fe', name: 'Ferro', atomicNumber: 26, atomicMass: 55.845, group: 'transition-metal', row: 4, column: 8, electronegativity: 1.83, electronConfig: '[Ar] 3d⁶ 4s²' },
  { symbol: 'Co', name: 'Cobalto', atomicNumber: 27, atomicMass: 58.933, group: 'transition-metal', row: 4, column: 9, electronegativity: 1.88, electronConfig: '[Ar] 3d⁷ 4s²' },
  { symbol: 'Ni', name: 'Níquel', atomicNumber: 28, atomicMass: 58.693, group: 'transition-metal', row: 4, column: 10, electronegativity: 1.91, electronConfig: '[Ar] 3d⁸ 4s²' },
  { symbol: 'Cu', name: 'Cobre', atomicNumber: 29, atomicMass: 63.546, group: 'transition-metal', row: 4, column: 11, electronegativity: 1.90, electronConfig: '[Ar] 3d¹⁰ 4s¹' },
  { symbol: 'Zn', name: 'Zinco', atomicNumber: 30, atomicMass: 65.38, group: 'transition-metal', row: 4, column: 12, electronegativity: 1.65, electronConfig: '[Ar] 3d¹⁰ 4s²' },
  { symbol: 'Ga', name: 'Gálio', atomicNumber: 31, atomicMass: 69.723, group: 'post-transition', row: 4, column: 13, electronegativity: 1.81, electronConfig: '[Ar] 3d¹⁰ 4s² 4p¹' },
  { symbol: 'Ge', name: 'Germânio', atomicNumber: 32, atomicMass: 72.630, group: 'metalloid', row: 4, column: 14, electronegativity: 2.01, electronConfig: '[Ar] 3d¹⁰ 4s² 4p²' },
  { symbol: 'As', name: 'Arsênio', atomicNumber: 33, atomicMass: 74.922, group: 'metalloid', row: 4, column: 15, electronegativity: 2.18, electronConfig: '[Ar] 3d¹⁰ 4s² 4p³' },
  { symbol: 'Se', name: 'Selênio', atomicNumber: 34, atomicMass: 78.971, group: 'non-metal', row: 4, column: 16, electronegativity: 2.55, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁴' },
  { symbol: 'Br', name: 'Bromo', atomicNumber: 35, atomicMass: 79.904, group: 'non-metal', row: 4, column: 17, electronegativity: 2.96, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁵' },
  { symbol: 'Kr', name: 'Criptônio', atomicNumber: 36, atomicMass: 83.798, group: 'noble-gas', row: 4, column: 18, electronegativity: 3.00, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁶' },
  { symbol: 'Rb', name: 'Rubídio', atomicNumber: 37, atomicMass: 85.468, group: 'alkali-metal', row: 5, column: 1, electronegativity: 0.82, electronConfig: '[Kr] 5s¹' },
  { symbol: 'Sr', name: 'Estrôncio', atomicNumber: 38, atomicMass: 87.62, group: 'alkaline-earth', row: 5, column: 2, electronegativity: 0.95, electronConfig: '[Kr] 5s²' },
  { symbol: 'Y', name: 'Ítrio', atomicNumber: 39, atomicMass: 88.906, group: 'transition-metal', row: 5, column: 3, electronegativity: 1.22, electronConfig: '[Kr] 4d¹ 5s²' },
  { symbol: 'Zr', name: 'Zircônio', atomicNumber: 40, atomicMass: 91.224, group: 'transition-metal', row: 5, column: 4, electronegativity: 1.33, electronConfig: '[Kr] 4d² 5s²' },
  { symbol: 'Nb', name: 'Nióbio', atomicNumber: 41, atomicMass: 92.906, group: 'transition-metal', row: 5, column: 5, electronegativity: 1.6, electronConfig: '[Kr] 4d⁴ 5s¹' },
  { symbol: 'Mo', name: 'Molibdênio', atomicNumber: 42, atomicMass: 95.95, group: 'transition-metal', row: 5, column: 6, electronegativity: 2.16, electronConfig: '[Kr] 4d⁵ 5s¹' },
  { symbol: 'Tc', name: 'Tecnécio', atomicNumber: 43, atomicMass: 98, group: 'transition-metal', row: 5, column: 7, electronegativity: 1.9, electronConfig: '[Kr] 4d⁵ 5s²' },
  { symbol: 'Ru', name: 'Rutênio', atomicNumber: 44, atomicMass: 101.07, group: 'transition-metal', row: 5, column: 8, electronegativity: 2.2, electronConfig: '[Kr] 4d⁷ 5s¹' },
  { symbol: 'Rh', name: 'Ródio', atomicNumber: 45, atomicMass: 102.91, group: 'transition-metal', row: 5, column: 9, electronegativity: 2.28, electronConfig: '[Kr] 4d⁸ 5s¹' },
  { symbol: 'Pd', name: 'Paládio', atomicNumber: 46, atomicMass: 106.42, group: 'transition-metal', row: 5, column: 10, electronegativity: 2.20, electronConfig: '[Kr] 4d¹⁰' },
  { symbol: 'Ag', name: 'Prata', atomicNumber: 47, atomicMass: 107.87, group: 'transition-metal', row: 5, column: 11, electronegativity: 1.93, electronConfig: '[Kr] 4d¹⁰ 5s¹' },
  { symbol: 'Cd', name: 'Cádmio', atomicNumber: 48, atomicMass: 112.41, group: 'transition-metal', row: 5, column: 12, electronegativity: 1.69, electronConfig: '[Kr] 4d¹⁰ 5s²' },
  { symbol: 'In', name: 'Índio', atomicNumber: 49, atomicMass: 114.82, group: 'post-transition', row: 5, column: 13, electronegativity: 1.78, electronConfig: '[Kr] 4d¹⁰ 5s² 5p¹' },
  { symbol: 'Sn', name: 'Estanho', atomicNumber: 50, atomicMass: 118.71, group: 'post-transition', row: 5, column: 14, electronegativity: 1.96, electronConfig: '[Kr] 4d¹⁰ 5s² 5p²' },
  { symbol: 'Sb', name: 'Antimônio', atomicNumber: 51, atomicMass: 121.76, group: 'metalloid', row: 5, column: 15, electronegativity: 2.05, electronConfig: '[Kr] 4d¹⁰ 5s² 5p³' },
  { symbol: 'Te', name: 'Telúrio', atomicNumber: 52, atomicMass: 127.60, group: 'metalloid', row: 5, column: 16, electronegativity: 2.1, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁴' },
  { symbol: 'I', name: 'Iodo', atomicNumber: 53, atomicMass: 126.90, group: 'non-metal', row: 5, column: 17, electronegativity: 2.66, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁵' },
  { symbol: 'Xe', name: 'Xenônio', atomicNumber: 54, atomicMass: 131.29, group: 'noble-gas', row: 5, column: 18, electronegativity: 2.6, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁶' },
  { symbol: 'Cs', name: 'Césio', atomicNumber: 55, atomicMass: 132.91, group: 'alkali-metal', row: 6, column: 1, electronegativity: 0.79, electronConfig: '[Xe] 6s¹' },
  { symbol: 'Ba', name: 'Bário', atomicNumber: 56, atomicMass: 137.33, group: 'alkaline-earth', row: 6, column: 2, electronegativity: 0.89, electronConfig: '[Xe] 6s²' },
  { symbol: 'La', name: 'Lantânio', atomicNumber: 57, atomicMass: 138.91, group: 'lanthanide', row: 6, column: 3, electronegativity: 1.1, electronConfig: '[Xe] 5d¹ 6s²' },
  { symbol: 'Ce', name: 'Cério', atomicNumber: 58, atomicMass: 140.12, group: 'lanthanide', row: 9, column: 4, electronegativity: 1.12, electronConfig: '[Xe] 4f¹ 5d¹ 6s²' },
  { symbol: 'Pr', name: 'Praseodímio', atomicNumber: 59, atomicMass: 140.91, group: 'lanthanide', row: 9, column: 5, electronegativity: 1.13, electronConfig: '[Xe] 4f³ 6s²' },
  { symbol: 'Nd', name: 'Neodímio', atomicNumber: 60, atomicMass: 144.24, group: 'lanthanide', row: 9, column: 6, electronegativity: 1.14, electronConfig: '[Xe] 4f⁴ 6s²' },
  { symbol: 'Pm', name: 'Promécio', atomicNumber: 61, atomicMass: 145, group: 'lanthanide', row: 9, column: 7, electronegativity: 1.13, electronConfig: '[Xe] 4f⁵ 6s²' },
  { symbol: 'Sm', name: 'Samário', atomicNumber: 62, atomicMass: 150.36, group: 'lanthanide', row: 9, column: 8, electronegativity: 1.17, electronConfig: '[Xe] 4f⁶ 6s²' },
  { symbol: 'Eu', name: 'Európio', atomicNumber: 63, atomicMass: 151.96, group: 'lanthanide', row: 9, column: 9, electronegativity: 1.2, electronConfig: '[Xe] 4f⁷ 6s²' },
  { symbol: 'Gd', name: 'Gadolínio', atomicNumber: 64, atomicMass: 157.25, group: 'lanthanide', row: 9, column: 10, electronegativity: 1.2, electronConfig: '[Xe] 4f⁷ 5d¹ 6s²' },
  { symbol: 'Tb', name: 'Térbio', atomicNumber: 65, atomicMass: 158.93, group: 'lanthanide', row: 9, column: 11, electronegativity: 1.1, electronConfig: '[Xe] 4f⁹ 6s²' },
  { symbol: 'Dy', name: 'Disprósio', atomicNumber: 66, atomicMass: 162.50, group: 'lanthanide', row: 9, column: 12, electronegativity: 1.22, electronConfig: '[Xe] 4f¹⁰ 6s²' },
  { symbol: 'Ho', name: 'Hólmio', atomicNumber: 67, atomicMass: 164.93, group: 'lanthanide', row: 9, column: 13, electronegativity: 1.23, electronConfig: '[Xe] 4f¹¹ 6s²' },
  { symbol: 'Er', name: 'Érbio', atomicNumber: 68, atomicMass: 167.26, group: 'lanthanide', row: 9, column: 14, electronegativity: 1.24, electronConfig: '[Xe] 4f¹² 6s²' },
  { symbol: 'Tm', name: 'Túlio', atomicNumber: 69, atomicMass: 168.93, group: 'lanthanide', row: 9, column: 15, electronegativity: 1.25, electronConfig: '[Xe] 4f¹³ 6s²' },
  { symbol: 'Yb', name: 'Itérbio', atomicNumber: 70, atomicMass: 173.05, group: 'lanthanide', row: 9, column: 16, electronegativity: 1.1, electronConfig: '[Xe] 4f¹⁴ 6s²' },
  { symbol: 'Lu', name: 'Lutécio', atomicNumber: 71, atomicMass: 174.97, group: 'lanthanide', row: 9, column: 17, electronegativity: 1.27, electronConfig: '[Xe] 4f¹⁴ 5d¹ 6s²' },
  { symbol: 'Hf', name: 'Háfnio', atomicNumber: 72, atomicMass: 178.49, group: 'transition-metal', row: 6, column: 4, electronegativity: 1.3, electronConfig: '[Xe] 4f¹⁴ 5d² 6s²' },
  { symbol: 'Ta', name: 'Tântalo', atomicNumber: 73, atomicMass: 180.95, group: 'transition-metal', row: 6, column: 5, electronegativity: 1.5, electronConfig: '[Xe] 4f¹⁴ 5d³ 6s²' },
  { symbol: 'W', name: 'Tungstênio', atomicNumber: 74, atomicMass: 183.84, group: 'transition-metal', row: 6, column: 6, electronegativity: 2.36, electronConfig: '[Xe] 4f¹⁴ 5d⁴ 6s²' },
  { symbol: 'Re', name: 'Rênio', atomicNumber: 75, atomicMass: 186.21, group: 'transition-metal', row: 6, column: 7, electronegativity: 1.9, electronConfig: '[Xe] 4f¹⁴ 5d⁵ 6s²' },
  { symbol: 'Os', name: 'Ósmio', atomicNumber: 76, atomicMass: 190.23, group: 'transition-metal', row: 6, column: 8, electronegativity: 2.2, electronConfig: '[Xe] 4f¹⁴ 5d⁶ 6s²' },
  { symbol: 'Ir', name: 'Irídio', atomicNumber: 77, atomicMass: 192.22, group: 'transition-metal', row: 6, column: 9, electronegativity: 2.20, electronConfig: '[Xe] 4f¹⁴ 5d⁷ 6s²' },
  { symbol: 'Pt', name: 'Platina', atomicNumber: 78, atomicMass: 195.08, group: 'transition-metal', row: 6, column: 10, electronegativity: 2.28, electronConfig: '[Xe] 4f¹⁴ 5d⁹ 6s¹' },
  { symbol: 'Au', name: 'Ouro', atomicNumber: 79, atomicMass: 196.97, group: 'transition-metal', row: 6, column: 11, electronegativity: 2.54, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹' },
  { symbol: 'Hg', name: 'Mercúrio', atomicNumber: 80, atomicMass: 200.59, group: 'transition-metal', row: 6, column: 12, electronegativity: 2.00, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s²' },
  { symbol: 'Tl', name: 'Tálio', atomicNumber: 81, atomicMass: 204.38, group: 'post-transition', row: 6, column: 13, electronegativity: 1.62, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹' },
  { symbol: 'Pb', name: 'Chumbo', atomicNumber: 82, atomicMass: 207.2, group: 'post-transition', row: 6, column: 14, electronegativity: 2.33, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²' },
  { symbol: 'Bi', name: 'Bismuto', atomicNumber: 83, atomicMass: 208.98, group: 'post-transition', row: 6, column: 15, electronegativity: 2.02, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³' },
  { symbol: 'Po', name: 'Polônio', atomicNumber: 84, atomicMass: 209, group: 'post-transition', row: 6, column: 16, electronegativity: 2.0, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴' },
  { symbol: 'At', name: 'Astato', atomicNumber: 85, atomicMass: 210, group: 'metalloid', row: 6, column: 17, electronegativity: 2.2, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵' },
  { symbol: 'Rn', name: 'Radônio', atomicNumber: 86, atomicMass: 222, group: 'noble-gas', row: 6, column: 18, electronegativity: null, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶' },
  { symbol: 'Fr', name: 'Frâncio', atomicNumber: 87, atomicMass: 223, group: 'alkali-metal', row: 7, column: 1, electronegativity: 0.7, electronConfig: '[Rn] 7s¹', isRadioactive: true },
  { symbol: 'Ra', name: 'Rádio', atomicNumber: 88, atomicMass: 226, group: 'alkaline-earth', row: 7, column: 2, electronegativity: 0.9, electronConfig: '[Rn] 7s²', isRadioactive: true },
  { symbol: 'Ac', name: 'Actínio', atomicNumber: 89, atomicMass: 227, group: 'actinide', row: 7, column: 3, electronegativity: 1.1, electronConfig: '[Rn] 6d¹ 7s²', isRadioactive: true },
  { symbol: 'Th', name: 'Tório', atomicNumber: 90, atomicMass: 232.04, group: 'actinide', row: 10, column: 4, electronegativity: 1.3, electronConfig: '[Rn] 6d² 7s²', isRadioactive: true },
  { symbol: 'Pa', name: 'Protactínio', atomicNumber: 91, atomicMass: 231.04, group: 'actinide', row: 10, column: 5, electronegativity: 1.5, electronConfig: '[Rn] 5f² 6d¹ 7s²', isRadioactive: true },
  { symbol: 'U', name: 'Urânio', atomicNumber: 92, atomicMass: 238.03, group: 'actinide', row: 10, column: 6, electronegativity: 1.38, electronConfig: '[Rn] 5f³ 6d¹ 7s²', isRadioactive: true },
  { symbol: 'Np', name: 'Netúnio', atomicNumber: 93, atomicMass: 237, group: 'actinide', row: 10, column: 7, electronegativity: 1.36, electronConfig: '[Rn] 5f⁴ 6d¹ 7s²', isRadioactive: true },
  { symbol: 'Pu', name: 'Plutônio', atomicNumber: 94, atomicMass: 244, group: 'actinide', row: 10, column: 8, electronegativity: 1.28, electronConfig: '[Rn] 5f⁶ 7s²', isRadioactive: true },
  { symbol: 'Am', name: 'Amerício', atomicNumber: 95, atomicMass: 243, group: 'actinide', row: 10, column: 9, electronegativity: 1.13, electronConfig: '[Rn] 5f⁷ 7s²', isRadioactive: true },
  { symbol: 'Cm', name: 'Cúrio', atomicNumber: 96, atomicMass: 247, group: 'actinide', row: 10, column: 10, electronegativity: 1.28, electronConfig: '[Rn] 5f⁷ 6d¹ 7s²', isRadioactive: true },
  { symbol: 'Bk', name: 'Berquélio', atomicNumber: 97, atomicMass: 247, group: 'actinide', row: 10, column: 11, electronegativity: 1.3, electronConfig: '[Rn] 5f⁹ 7s²', isRadioactive: true },
  { symbol: 'Cf', name: 'Califórnio', atomicNumber: 98, atomicMass: 251, group: 'actinide', row: 10, column: 12, electronegativity: 1.3, electronConfig: '[Rn] 5f¹⁰ 7s²', isRadioactive: true },
  { symbol: 'Es', name: 'Einstênio', atomicNumber: 99, atomicMass: 252, group: 'actinide', row: 10, column: 13, electronegativity: 1.3, electronConfig: '[Rn] 5f¹¹ 7s²', isRadioactive: true },
  { symbol: 'Fm', name: 'Férmio', atomicNumber: 100, atomicMass: 257, group: 'actinide', row: 10, column: 14, electronegativity: 1.3, electronConfig: '[Rn] 5f¹² 7s²', isRadioactive: true },
  { symbol: 'Md', name: 'Mendelévio', atomicNumber: 101, atomicMass: 258, group: 'actinide', row: 10, column: 15, electronegativity: 1.3, electronConfig: '[Rn] 5f¹³ 7s²', isRadioactive: true },
  { symbol: 'No', name: 'Nobélio', atomicNumber: 102, atomicMass: 259, group: 'actinide', row: 10, column: 16, electronegativity: 1.3, electronConfig: '[Rn] 5f¹⁴ 7s²', isRadioactive: true },
  { symbol: 'Lr', name: 'Laurêncio', atomicNumber: 103, atomicMass: 262, group: 'actinide', row: 10, column: 17, electronegativity: 1.3, electronConfig: '[Rn] 5f¹⁴ 7s² 7p¹', isRadioactive: true },
  { symbol: 'Rf', name: 'Rutherfórdio', atomicNumber: 104, atomicMass: 267, group: 'transition-metal', row: 7, column: 4, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d² 7s²', isRadioactive: true },
  { symbol: 'Db', name: 'Dúbnio', atomicNumber: 105, atomicMass: 270, group: 'transition-metal', row: 7, column: 5, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d³ 7s²', isRadioactive: true },
  { symbol: 'Sg', name: 'Seabórgio', atomicNumber: 106, atomicMass: 271, group: 'transition-metal', row: 7, column: 6, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d⁴ 7s²', isRadioactive: true },
  { symbol: 'Bh', name: 'Bóhrio', atomicNumber: 107, atomicMass: 270, group: 'transition-metal', row: 7, column: 7, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d⁵ 7s²', isRadioactive: true },
  { symbol: 'Hs', name: 'Hássio', atomicNumber: 108, atomicMass: 277, group: 'transition-metal', row: 7, column: 8, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d⁶ 7s²', isRadioactive: true },
  { symbol: 'Mt', name: 'Meitnério', atomicNumber: 109, atomicMass: 278, group: 'transition-metal', row: 7, column: 9, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d⁷ 7s²', isRadioactive: true },
  { symbol: 'Ds', name: 'Darmstádio', atomicNumber: 110, atomicMass: 281, group: 'transition-metal', row: 7, column: 10, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d⁸ 7s²', isRadioactive: true },
  { symbol: 'Rg', name: 'Roentgênio', atomicNumber: 111, atomicMass: 282, group: 'transition-metal', row: 7, column: 11, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d⁹ 7s²', isRadioactive: true },
  { symbol: 'Cn', name: 'Copernício', atomicNumber: 112, atomicMass: 285, group: 'transition-metal', row: 7, column: 12, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s²', isRadioactive: true },
  { symbol: 'Nh', name: 'Nifônio', atomicNumber: 113, atomicMass: 286, group: 'post-transition', row: 7, column: 13, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹', isRadioactive: true },
  { symbol: 'Fl', name: 'Fleróvio', atomicNumber: 114, atomicMass: 289, group: 'post-transition', row: 7, column: 14, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²', isRadioactive: true },
  { symbol: 'Mc', name: 'Moscóvio', atomicNumber: 115, atomicMass: 290, group: 'post-transition', row: 7, column: 15, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³', isRadioactive: true },
  { symbol: 'Lv', name: 'Livermório', atomicNumber: 116, atomicMass: 293, group: 'post-transition', row: 7, column: 16, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴', isRadioactive: true },
  { symbol: 'Ts', name: 'Tenesso', atomicNumber: 117, atomicMass: 294, group: 'post-transition', row: 7, column: 17, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵', isRadioactive: true },
  { symbol: 'Og', name: 'Oganésson', atomicNumber: 118, atomicMass: 294, group: 'noble-gas', row: 7, column: 18, electronegativity: null, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶', isRadioactive: true }
];

/**
 * STEM MATH ENGINE
 * Advanced solvers and mathematical logic.
 */
export const STEMMath = {
  /**
   * Durand-Kerner Algorithm
   * Finds all complex roots of a polynomial of degree N.
   */
  solvePolynomial(coeffs) {
    const degree = coeffs.length - 1;
    if (degree <= 0) return [];
    const an = coeffs[0];
    const poly = coeffs.map(c => c / an);
    let roots = [];
    for (let i = 0; i < degree; i++) {
        const angle = (2 * Math.PI * i) / degree + 0.1;
        roots.push({ re: Math.cos(angle), im: Math.sin(angle) });
    }
    for (let iter = 0; iter < 100; iter++) {
        let nextRoots = [];
        for (let i = 0; i < degree; i++) {
            const root = roots[i];
            let pVal = { re: 1, im: 0 };
            for (let j = 1; j <= degree; j++) {
                const nextRe = pVal.re * root.re - pVal.im * root.im + poly[j];
                const nextIm = pVal.re * root.im + pVal.im * root.re;
                pVal = { re: nextRe, im: nextIm };
            }
            let denom = { re: 1, im: 0 };
            for (let j = 0; j < degree; j++) {
                if (i === j) continue;
                const diffRe = root.re - roots[j].re;
                const diffIm = root.im - roots[j].im;
                const nextRe = denom.re * diffRe - denom.im * diffIm;
                const nextIm = denom.re * diffIm + denom.im * diffRe;
                denom = { re: nextRe, im: nextIm };
            }
            const denomMag = denom.re * denom.re + denom.im * denom.im;
            const divRe = (pVal.re * denom.re + pVal.im * denom.im) / denomMag;
            const divIm = (pVal.im * denom.re - pVal.re * denom.im) / denomMag;
            nextRoots.push({ re: root.re - divRe, im: root.im - divIm });
        }
        roots = nextRoots;
    }
    return roots.map(r => ({ re: Math.round(r.re * 1e8) / 1e8, im: Math.round(r.im * 1e8) / 1e8 }));
  }
};

export const FORMULA_TEMPLATES = [
  { name: 'Bhaskara (Raízes)', formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', category: 'Álgebra', tags: ['equação', 'segundo grau'], usage: 'Usada para encontrar raízes de equações quadráticas ax² + bx + c = 0.' },
  { name: 'Pitágoras', formula: 'a^2 + b^2 = c^2', category: 'Geometria', tags: ['triângulo', 'hipotenusa'], usage: 'Calcula o lado de um triângulo retângulo conhecendo os outros dois.' },
  { name: 'Einstein (Energia)', formula: 'E = mc^2', category: 'Física', tags: ['relatividade', 'massa'], usage: 'Equivalência entre massa e energia na relatividade restrita.' },
  { name: 'Segunda Lei de Newton', formula: 'F = m \\cdot a', category: 'Física', tags: ['mecânica', 'força'], usage: 'A força aplicada é igual à massa multiplicada pela aceleração.' },
  { name: 'Lei de Coulomb', formula: 'F = k \\frac{|q_1 q_2|}{r^2}', category: 'Física', tags: ['eletrostática', 'carga'], usage: 'Lei fundamental da eletricidade que descreve a força entre cargas.' },
  { name: 'Gás Ideal', formula: 'PV = nRT', category: 'Química', tags: ['termodinâmica', 'gases'], usage: 'Equação de estado para um gás ideal relacionando P, V, T e n.' },
  { name: 'Equação de Torricelli', formula: 'v^2 = v_0^2 + 2a\\Delta s', category: 'Física', tags: ['cinemática', 'velocidade'], usage: 'Calcula a velocidade sem depender do tempo.' },
  { name: 'Área do Círculo', formula: 'A = \\pi r^2', category: 'Geometria', tags: ['área', 'pi'], usage: 'Cálculo da área da superfície delimitada por uma circunferência.' }
];

export const STEMService = {
  // --- Constants Handling ---
  getMergedConstants() {
    return [...NATIVE_CONSTANTS, ...customConstants];
  },

  getConstantsHierarchy(query = '') {
    const list = this.getMergedConstants();
    const tree = {};
    const q = query.toLowerCase();

    list.forEach(item => {
      const matches = !q ||
        item.n.toLowerCase().includes(q) ||
        item.l.toLowerCase().includes(q) ||
        item.c.toLowerCase().includes(q) ||
        (item.sc && item.sc.toLowerCase().includes(q));

      if (!matches) return;

      const cat = item.c || 'Outros';
      const sub = item.sc || 'Geral';

      if (!tree[cat]) tree[cat] = {};
      if (!tree[cat][sub]) tree[cat][sub] = [];
      tree[cat][sub].push(item);
    });

    return tree;
  },

  addConstant(constant) {
    customConstants.push(constant);
    return customConstants;
  },

  exportJSON() {
    const fullList = this.getMergedConstants();
    const jsonStr = JSON.stringify(fullList, null, 2);
    navigator.clipboard.writeText(jsonStr);
    return jsonStr;
  },

  // --- Search Methods ---
  searchConstants(query) {
    if (!query) return NATIVE_CONSTANTS;
    const q = query.toLowerCase();
    return this.getMergedConstants().filter(c =>
      c.n.toLowerCase().includes(q) ||
      c.l.toLowerCase().includes(q) ||
      c.c.toLowerCase().includes(q) ||
      (c.sc && c.sc.toLowerCase().includes(q))
    );
  },

  searchPeriodicTable(query) {
    if (!query) return PERIODIC_TABLE;
    const q = query.toLowerCase();
    return PERIODIC_TABLE.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.symbol.toLowerCase().includes(q)
    );
  },

  searchFormulas(query) {
    if (!query) return FORMULA_TEMPLATES;
    const q = query.toLowerCase();
    return FORMULA_TEMPLATES.filter(f =>
      f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
    );
  },

  searchSymbols(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    const results = [];
    Object.entries(STEM_SYMBOLS).forEach(([cat, items]) => {
      items.forEach(item => {
        if (item.label.toLowerCase().includes(q) || item.cmd.toLowerCase().includes(q)) {
          results.push({ ...item, category: cat });
        }
      });
    });
    return results.slice(0, 10);
  }
};
