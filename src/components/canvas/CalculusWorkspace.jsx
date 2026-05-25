import React, { useState } from 'react';
import { MathService } from '../../services/MathService';
import { useCanvasStore } from '../../store/useCanvasStore';
import { InlineMath } from 'react-katex';
import { Play, Sparkles, Share2, FileText, Plus, Minus, Menu, RotateCcw } from 'lucide-react';

const CalculusWorkspace = ({ canvasPan, canvasScale }) => {
  // Tabs: 0: Derivadas, 1: Integrais, 2: Séries, 3: EDOs, 4: Aplicações STEM, 5: Complexas/Fourier
  const [activeTab, setActiveTab] = useState(0);

  // Sub-categories within tabs
  const [subTypeDeriv, setSubTypeDeriv] = useState('simple'); // 'simple', 'partial', 'tangent', 'implicit'
  const [subTypeInteg, setSubTypeInteg] = useState('simple'); // 'simple', 'double', 'triple', 'line', 'surface'
  const [subTypeSeries, setSubTypeSeries] = useState('taylor'); // 'taylor', 'convergence'
  const [subTypeOde, setSubTypeOde] = useState('first'); // 'first', 'second', 'nonhomogeneous'
  const [subTypeApp, setSubTypeApp] = useState('arc'); // 'arc', 'area', 'volume', 'centroid'
  const [subTypeComplex, setSubTypeComplex] = useState('cr'); // 'cr', 'residues', 'fourier', 'laplace', 'fourier_trans'

  // Input states (supporting limits/bounds using sleek visual input placeholding squares!)
  // Bounds for Simple, Double, Triple integrals
  const [lowerBound1, setLowerBound1] = useState('0');
  const [upperBound1, setUpperBound1] = useState('1');
  const [lowerBound2, setLowerBound2] = useState('0');
  const [upperBound2, setUpperBound2] = useState('2');
  const [lowerBound3, setLowerBound3] = useState('0');
  const [upperBound3, setUpperBound3] = useState('3');

  // Integrals & Derivatives
  const [integExpr, setIntegExpr] = useState('3*x^2 - exp(x)');
  const [integVars, setIntegVars] = useState(['x']);
  
  // Line Integral components (supporting 2D/3D in any parameterization!)
  const [lineP, setLineP] = useState('-y');
  const [lineQ, setLineQ] = useState('x');
  const [lineR, setLineR] = useState('z');
  const [lineXt, setLineXt] = useState('cos(t)');
  const [lineYt, setLineYt] = useState('sin(t)');
  const [lineZt, setLineZt] = useState('t');
  const [lineTMin, setLineTMin] = useState('0');
  const [lineTMax, setLineTMax] = useState('2*pi');
  const [lineIs3D, setLineIs3D] = useState(false);

  // Surface Integral components (supporting scalar, vector flux, Cartesian and Polar coordinate projection!)
  const [surfP, setSurfP] = useState('x^2 + y^2'); // F_x (vector flux) or scalar f(x, y, z)
  const [surfQ, setSurfQ] = useState('2*x*y');     // F_y (vector flux)
  const [surfR, setSurfR] = useState('z');         // F_z (vector flux)
  const [surfS, setSurfS] = useState('z = 1 - x^2 - y^2');
  const [surfLowerBound1, setSurfLowerBound1] = useState('0');
  const [surfUpperBound1, setSurfUpperBound1] = useState('1');
  const [surfLowerBound2, setSurfLowerBound2] = useState('0');
  const [surfUpperBound2, setSurfUpperBound2] = useState('2*pi');
  const [surfIsVectorFlux, setSurfIsVectorFlux] = useState(true);
  const [surfIsPolar, setSurfIsPolar] = useState(false);
  const [surfVar1, setSurfVar1] = useState('y');
  const [surfVar2, setSurfVar2] = useState('x');

  // Tab 0: Derivatives
  const [derivExpr, setDerivExpr] = useState('x^2 + sin(x)');
  const [derivVar, setDerivVar] = useState('x');
  const [derivPartExpr, setDerivPartExpr] = useState('x^2 * y + y * sin(x)');
  const [derivPartVars, setDerivPartVars] = useState(['x', 'y']);

  // Tab 2: Series
  const [taylorExpr, setTaylorExpr] = useState('sin(x)');
  const [taylorCenter, setTaylorCenter] = useState('0');
  const [taylorDegree, setTaylorDegree] = useState('4');
  const [convAn, setConvAn] = useState('(1/2)^n');
  const [convTest, setConvTest] = useState('ratio');

  // Tab 3: ODEs
  const [odeP, setOdeP] = useState('2*x');
  const [odeQ, setOdeQ] = useState('x');
  const [odeA, setOdeA] = useState('1');
  const [odeB, setOdeB] = useState('-5');
  const [odeC, setOdeC] = useState('6');

  // Tab 4: Advanced STEM Applications (Arc Length, Area, Volume)
  const [appArcExpr, setAppArcExpr] = useState('x^(3/2)');
  const [appArcMin, setAppArcMin] = useState('0');
  const [appArcMax, setAppArcMax] = useState('4');
  const [appAreaF, setAppAreaF] = useState('x^2');
  const [appAreaG, setAppAreaG] = useState('x');
  const [appAreaMin, setAppAreaMin] = useState('0');
  const [appAreaMax, setAppAreaMax] = useState('1');
  const [appVolExpr, setAppVolExpr] = useState('sqrt(x)');
  const [appVolMin, setAppVolMin] = useState('0');
  const [appVolMax, setAppVolMax] = useState('4');

  // Tab 5: Complex / Fourier
  const [compU, setCompU] = useState('x^2 - y^2');
  const [compV, setCompV] = useState('2*x*y');
  const [resNum, setResNum] = useState('z^2 + 1');
  const [resDen, setResDen] = useState('z - 2');
  const [fourierWave, setFourierWave] = useState('square');
  const [fourierAmp, setFourierAmp] = useState('1.0');

  // Novos Estados - Suíte Completa de Cálculo
  const [lagrangeF, setLagrangeF] = useState('x*y');
  const [lagrangeG, setLagrangeG] = useState('x+y');
  const [lagrangeK, setLagrangeK] = useState('10');

  const [gdExpr, setGdExpr] = useState('x^2 + y^2');
  const [gdLr, setGdLr] = useState('0.1');
  const [gdMomentum, setGdMomentum] = useState('0.9');
  const [gdSteps, setGdSteps] = useState('5');

  const [fracExpr, setFracExpr] = useState('x');
  const [fracAlpha, setFracAlpha] = useState('0.5');

  const [tripleCoords, setTripleCoords] = useState('cylindrical');
  const [tripleExpr, setTripleExpr] = useState('r^2');
  const [tripleRMin, setTripleRMin] = useState('0');
  const [tripleRMax, setTripleRMax] = useState('1');
  const [tripleThetaMin, setTripleThetaMin] = useState('0');
  const [tripleThetaMax, setTripleThetaMax] = useState('2*pi');
  const [tripleZMin, setTripleZMin] = useState('0');
  const [tripleZMax, setTripleZMax] = useState('2');
  const [tripleRhoMin, setTripleRhoMin] = useState('0');
  const [tripleRhoMax, setTripleRhoMax] = useState('1');
  const [triplePhiMin, setTriplePhiMin] = useState('0');
  const [triplePhiMax, setTriplePhiMax] = useState('pi');

  const [theoremMode, setTheoremMode] = useState('green');
  const [theoremP, setTheoremP] = useState('-y');
  const [theoremQ, setTheoremQ] = useState('x');
  const [theoremR, setTheoremR] = useState('z');
  const [theoremXMin, setTheoremXMin] = useState('0');
  const [theoremXMax, setTheoremXMax] = useState('1');
  const [theoremYMin, setTheoremYMin] = useState('0');
  const [theoremYMax, setTheoremYMax] = useState('1');
  const [theoremZMin, setTheoremZMin] = useState('0');
  const [theoremZMax, setTheoremZMax] = useState('1');

  const [psExpr, setPsExpr] = useState('x^n / factorial(n)');
  const [psCenter, setPsCenter] = useState('0');

  const [sysA, setSysA] = useState('1');
  const [sysB, setSysB] = useState('1');
  const [sysC, setSysC] = useState('4');
  const [sysD, setSysD] = useState('-2');

  const [rkExpr, setRkExpr] = useState('y - t');
  const [rkT0, setRkT0] = useState('0');
  const [rkY0, setRkY0] = useState('2');
  const [rkH, setRkH] = useState('0.1');
  const [rkSteps, setRkSteps] = useState('4');

  const [pertExpr, setPertExpr] = useState('y\'\' + y + e*y^3 = 0');
  const [pertOrder, setPertOrder] = useState('1');

  const [stabExpr, setStabExpr] = useState('mu*x - x^2');
  const [stabParam, setStabParam] = useState('mu');

  const [pdeType, setPdeType] = useState('heat');
  const [pdeL, setPdeL] = useState('pi');
  const [pdeAlpha, setPdeAlpha] = useState('1');
  const [pdeC, setPdeC] = useState('1');
  const [pdeF, setPdeF] = useState('sin(x)');

  const [inertiaDensity, setInertiaDensity] = useState('1');
  const [inertiaXBounds, setInertiaXBounds] = useState('0,1');
  const [inertiaYBounds, setInertiaYBounds] = useState('0,1');
  const [inertiaZBounds, setInertiaZBounds] = useState('0,1');

  const [varExpr, setVarExpr] = useState('sqrt(1 + dy^2)');

  const [specType, setSpecType] = useState('gamma');
  const [specVal1, setSpecVal1] = useState('5');
  const [specVal2, setSpecVal2] = useState('3');

  const [confExpr, setConfExpr] = useState('z^2');

  const [contExpr, setContExpr] = useState('1 / (z - 2)');
  const [contCenter, setContCenter] = useState('0');
  const [contRadius, setContRadius] = useState('3');

  const [convF, setConvF] = useState('exp(-t)');
  const [convG, setConvG] = useState('exp(-2*t)');

  const [mfMode, setMfMode] = useState('mellin');
  const [mfExpr, setMfExpr] = useState('exp(-x)');
  const [mfParam, setMfParam] = useState('0.5');

  // Outputs & Dropdown active menus
  const [result, setResult] = useState(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [activeMenuCapsule, setActiveMenuCapsule] = useState(null); // Tracks open action menu on capsules

  const handleSolve = () => {
    setResult(null);
    setActiveMenuCapsule(null);
    try {
      let res;
      if (activeTab === 0) {
        if (subTypeDeriv === 'simple') {
          res = MathService.solveDerivativeSteps(derivExpr, derivVar);
        } else if (subTypeDeriv === 'partial') {
          res = MathService.solveGradientHigherOrderSteps(derivPartExpr, [...derivPartVars]);
        } else if (subTypeDeriv === 'tangent') {
          res = MathService.solveTangentLineSteps(derivExpr, derivVar);
        } else if (subTypeDeriv === 'implicit') {
          res = MathService.solveImplicitDerivativeSteps(derivPartExpr);
        } else if (subTypeDeriv === 'optimization') {
          res = MathService.solveMultivariableOptimizationSteps(derivPartExpr, [...derivPartVars]);
        } else if (subTypeDeriv === 'lagrange') {
          res = MathService.solveLagrangeMultipliersSteps(lagrangeF, lagrangeG, lagrangeK);
        } else if (subTypeDeriv === 'gradient_descent') {
          res = MathService.solveGradientDescentSteps(gdExpr, gdLr, gdMomentum, gdSteps);
        } else if (subTypeDeriv === 'fractional') {
          res = MathService.solveFractionalDerivativeSteps(fracExpr, fracAlpha);
        }
      } else if (activeTab === 1) {
        // Integrals
        if (subTypeInteg === 'line') {
          res = MathService.solveLineIntegralSteps(
              lineP, 
              lineQ, 
              lineIs3D ? lineR : '', 
              lineXt, 
              lineYt, 
              lineIs3D ? lineZt : '', 
              't', 
              lineTMin, 
              lineTMax
          );
        } else if (subTypeInteg === 'surface') {
          const cleanSurface = surfS.replace(/^z\s*=\s*/i, '').trim();
          res = MathService.solveSurfaceIntegralSteps(
              surfP,
              surfIsVectorFlux ? surfQ : '',
              surfIsVectorFlux ? surfR : '',
              cleanSurface,
              surfIsVectorFlux,
              surfIsPolar,
              surfIsPolar ? ['r', 'theta'] : [surfVar1, surfVar2],
              [surfLowerBound1, surfLowerBound2],
              [surfUpperBound1, surfUpperBound2]
          );
        } else if (subTypeInteg === 'triple_coords') {
          if (tripleCoords === 'cylindrical') {
            res = MathService.solveDefiniteMultipleIntegralSteps(
              `(${tripleExpr}) * r`,
              ['z', 'r', 'theta'],
              [tripleZMin, tripleRMin, tripleThetaMin],
              [tripleZMax, tripleRMax, tripleThetaMax]
            );
          } else {
            res = MathService.solveDefiniteMultipleIntegralSteps(
              `(${tripleExpr}) * rho^2 * sin(phi)`,
              ['rho', 'phi', 'theta'],
              [tripleRhoMin, triplePhiMin, tripleThetaMin],
              [tripleRhoMax, triplePhiMax, tripleThetaMax]
            );
          }
        } else if (subTypeInteg === 'theorems') {
          res = MathService.solveVectorTheoremsSteps(
            theoremMode,
            theoremP,
            theoremQ,
            theoremR,
            theoremXMin,
            theoremXMax,
            theoremYMin,
            theoremYMax,
            theoremZMin,
            theoremZMax
          );
        } else {
          // Simple, Double, Triple Definite Integrals
          let boundsL = [];
          let boundsU = [];
          if (subTypeInteg === 'simple') {
            boundsL = [lowerBound1];
            boundsU = [upperBound1];
          } else if (subTypeInteg === 'double') {
            boundsL = [lowerBound2, lowerBound1];
            boundsU = [upperBound2, upperBound1];
          } else if (subTypeInteg === 'triple') {
            boundsL = [lowerBound3, lowerBound2, lowerBound1];
            boundsU = [upperBound3, upperBound2, upperBound1];
          }
          res = MathService.solveMultipleIntegralSteps(integExpr, [...integVars], boundsL, boundsU);
        }
      } else if (activeTab === 2) {
        // Series
        if (subTypeSeries === 'taylor') {
          res = MathService.solveTaylorSteps(taylorExpr, 'x', parseFloat(taylorCenter) || 0, parseInt(taylorDegree) || 4);
        } else if (subTypeSeries === 'convergence') {
          res = MathService.solveConvergenceSteps(convAn, convTest);
        } else if (subTypeSeries === 'radius') {
          res = MathService.solvePowerSeriesConvergenceSteps(psExpr, psCenter, 'x');
        }
      } else if (activeTab === 3) {
        // EDOs
        if (subTypeOde === 'first') {
          res = MathService.solveFirstOrderLinear(odeP, odeQ, 'x', 'y');
        } else if (subTypeOde === 'second') {
          res = MathService.solveSecondOrderHomogeneous(
              parseFloat(odeA) || 1,
              parseFloat(odeB) || 0,
              parseFloat(odeC) || 0,
              't',
              'y'
          );
        } else if (subTypeOde === 'nonhomogeneous') {
          res = MathService.solveSecondOrderNonHomogeneous(
              parseFloat(odeA) || 1,
              parseFloat(odeB) || 0,
              parseFloat(odeC) || 0,
              odeQ,
              't',
              'y'
          );
        } else if (subTypeOde === 'system') {
          res = MathService.solveLinearOdeSystemSteps(sysA, sysB, sysC, sysD);
        } else if (subTypeOde === 'rk4') {
          res = MathService.solveOdeRK4Steps(rkExpr, rkT0, rkY0, rkH, rkSteps);
        } else if (subTypeOde === 'perturbation') {
          res = MathService.solvePerturbationSteps(pertExpr, pertOrder);
        } else if (subTypeOde === 'stability') {
          res = MathService.solveStabilityAnalysisSteps(stabExpr, stabParam);
        } else if (subTypeOde === 'pde') {
          if (pdeType === 'heat') {
            res = MathService.solveHeatEquation1DSteps(pdeL, pdeAlpha, pdeF);
          } else {
            res = MathService.solveWaveEquation1DSteps(pdeL, pdeC, pdeF);
          }
        }
      } else if (activeTab === 4) {
        // Applications
        if (subTypeApp === 'arc') {
          res = MathService.solveArcLengthSteps(appArcExpr, 'x', appArcMin, appArcMax);
        } else if (subTypeApp === 'area') {
          res = MathService.solveAreaBetweenSteps(appAreaF, appAreaG, 'x', appAreaMin, appAreaMax);
        } else if (subTypeApp === 'volume') {
          res = MathService.solveVolumeRevolutionSteps(appVolExpr, 'x', appVolMin, appVolMax);
        } else if (subTypeApp === 'centroid') {
          res = MathService.solveCentroidSteps(appAreaF, appAreaG, appAreaMin, appAreaMax);
        } else if (subTypeApp === 'inertia') {
          res = MathService.solve3DCentroidAndInertiaSteps(inertiaDensity, inertiaXBounds, inertiaYBounds, inertiaZBounds);
        } else if (subTypeApp === 'variational') {
          res = MathService.solveEulerLagrangeSteps(varExpr, 'x', 'y');
        } else if (subTypeApp === 'special') {
          res = MathService.solveSpecialFunctionsSteps(specType, specVal1, specVal2);
        }
      } else if (activeTab === 5) {
        // Complex & Fourier
        if (subTypeComplex === 'cr') {
          res = MathService.checkCauchyRiemann(compU, compV);
        } else if (subTypeComplex === 'residues') {
          res = MathService.solveResidues(resNum, resDen);
        } else if (subTypeComplex === 'fourier') {
          res = MathService.solveFourierSteps(fourierWave, parseFloat(fourierAmp) || 1.0, 'pi');
        } else if (subTypeComplex === 'laplace') {
          res = MathService.solveLaplaceTransformSteps(taylorExpr);
        } else if (subTypeComplex === 'fourier_trans') {
          res = MathService.solveFourierTransformSteps(taylorExpr);
        } else if (subTypeComplex === 'conformal') {
          res = MathService.solveConformalMappingSteps(confExpr);
        } else if (subTypeComplex === 'contour') {
          res = MathService.solveContourIntegralSteps(contExpr, contCenter, contRadius);
        } else if (subTypeComplex === 'convolution') {
          res = MathService.solveSignalConvolutionSteps(convF, convG);
        } else if (subTypeComplex === 'mellin_frft') {
          res = MathService.solveMellinFrftSteps(mfExpr, mfMode, mfParam);
        }
      }

      setResult(res);
    } catch (err) {
      setResult({
        isError: true,
        latex: `\\text{Erro: ${err.message}}`,
        steps: []
      });
    }
  };

  const handleExportNote = (withLiveBlock = false) => {
    if (!result) return;
    setIsExportDropdownOpen(false);

    const zoom = canvasScale || 1;
    const pan = canvasPan || { x: 0, y: 0 };
    
    const centerX = (-pan.x + (window.innerWidth / 2)) / zoom;
    const centerY = (-pan.y + (window.innerHeight / 2)) / zoom;

    const newMathBlocks = [];
    const newConnections = [];

    const generateUID = () => 'calc_' + Math.random().toString(36).substring(2, 7) + '_' + Date.now();

    const textId = generateUID();
    let textContent = `\\mathbf{\\text{Resolução Didática (Engine Pro):}} \\\\[12pt] `;
    
    if (result.steps && result.steps.length > 0) {
      result.steps.forEach((step, idx) => {
        textContent += `\\mathbf{\\text{Etapa } ${idx + 1}: } \\text{${step.label}} \\\\[6pt] ${step.latex}`;
        if (idx < result.steps.length - 1) {
          textContent += ` \\\\[8pt] \\rule{160pt}{0.3pt} \\\\[10pt] `;
        }
      });
    } else {
      textContent += `\\mathbf{\\text{Resultado:}} \\\\[6pt] ${result.result}`;
    }

    newMathBlocks.push({
      id: textId,
      x: centerX - 270,
      y: centerY - 150,
      content: textContent,
      fixedSize: false,
      color: '#6366f1'
    });

    if (withLiveBlock) {
      const liveId = generateUID();
      let liveBlockConfig = null;

      if (activeTab === 0 && subTypeDeriv === 'partial') {
        liveBlockConfig = {
          id: liveId,
          type: 'vector_field',
          x: centerX + 180,
          y: centerY - 180,
          width: 500,
          height: 520,
          exprP: '2*x',
          exprQ: '2*y'
        };
      } else if (activeTab === 2 && subTypeSeries === 'taylor') {
        liveBlockConfig = {
          id: liveId,
          type: 'taylor_plot',
          x: centerX + 180,
          y: centerY - 180,
          width: 500,
          height: 520,
          funcExpr: taylorExpr,
          x0: parseFloat(taylorCenter) || 0,
          degree: parseInt(taylorDegree) || 4
        };
      } else if (activeTab === 3) {
        liveBlockConfig = {
          id: liveId,
          type: 'phase_portrait',
          x: centerX + 180,
          y: centerY - 180,
          width: 500,
          height: 520,
          exprP: subTypeOde === 'first' ? '1' : 'y',
          exprQ: subTypeOde === 'first' ? `${odeQ} - (${odeP})*y` : `-( ${odeC}*x + ${odeB}*y ) / ${odeA}`
        };
      } else if (activeTab === 4) {
        liveBlockConfig = {
          id: liveId,
          type: 'vector_field',
          x: centerX + 180,
          y: centerY - 180,
          width: 500,
          height: 520,
          exprP: subTypeApp === 'volume' ? 'x' : '1',
          exprQ: 'y'
        };
      } else if (activeTab === 5 && subTypeComplex === 'fourier') {
        liveBlockConfig = {
          id: liveId,
          type: 'fourier_synthesis',
          x: centerX + 180,
          y: centerY - 180,
          width: 500,
          height: 520,
          waveType: fourierWave,
          harmonics: 5
        };
      }

      if (liveBlockConfig) {
        newMathBlocks.push(liveBlockConfig);
        newConnections.push({
          id: generateUID(),
          fromId: textId,
          fromSide: 'right',
          toId: liveId,
          toSide: 'left',
          color: '#10b981',
          lineStyle: 'solid'
        });
      }
    }

    const setMathBlocks = useCanvasStore.getState().setMathBlocks;
    const setConnections = useCanvasStore.getState().setConnections;

    setMathBlocks(prev => [...prev, ...newMathBlocks]);
    setConnections(prev => [...prev, ...newConnections]);
  };

  // Helper variables stacks for integrals simple/double/triple
  const syncIntegralDimension = (dim) => {
    if (dim === 1) {
      setIntegVars(['x']);
      setSubTypeInteg('simple');
    } else if (dim === 2) {
      setIntegVars(['y', 'x']);
      setSubTypeInteg('double');
    } else if (dim === 3) {
      setIntegVars(['z', 'y', 'x']);
      setSubTypeInteg('triple');
    }
  };

  const handleAddIntegral = () => {
    if (integVars.length === 1) {
      syncIntegralDimension(2);
    } else if (integVars.length === 2) {
      syncIntegralDimension(3);
    }
  };

  const handleRemoveIntegral = () => {
    if (integVars.length === 3) {
      syncIntegralDimension(2);
    } else if (integVars.length === 2) {
      syncIntegralDimension(1);
    }
  };

  // State modifiers for dynamic derivatives
  const handleAddDerivVar = () => {
    if (derivPartVars.length < 4) {
      setDerivPartVars([...derivPartVars, 'x']);
    }
  };

  const handleRemoveDerivVar = () => {
    if (derivPartVars.length > 1) {
      setDerivPartVars(derivPartVars.slice(0, -1));
    }
  };

  // Clear fields helper
  const handleClearFields = () => {
    setActiveMenuCapsule(null);
    setResult(null);
    if (activeTab === 0) {
      setDerivExpr('');
      setDerivVar('x');
      setDerivPartExpr('');
      setDerivPartVars(['x', 'y']);
    } else if (activeTab === 1) {
      setIntegExpr('');
      setLowerBound1('0'); setUpperBound1('1');
      setLowerBound2('0'); setUpperBound2('2');
      setLowerBound3('0'); setUpperBound3('3');
      setLineP(''); setLineQ(''); setLineR('');
      setLineXt(''); setLineYt(''); setLineZt('');
      setSurfP(''); setSurfQ(''); setSurfR(''); setSurfS('z = 1 - x^2 - y^2');
    } else if (activeTab === 2) {
      setTaylorExpr(''); setTaylorCenter('0'); setTaylorDegree('4');
      setConvAn('');
    } else if (activeTab === 3) {
      setOdeP(''); setOdeQ('');
      setOdeA('1'); setOdeB('0'); setOdeC('0');
    } else if (activeTab === 4) {
      setAppArcExpr(''); setAppAreaF(''); setAppAreaG(''); setAppVolExpr('');
    } else if (activeTab === 5) {
      setCompU(''); setCompV('');
      setResNum(''); setResDen('');
    }
  };

  // Reusable visual menu dropdown inside capsules
  const renderCapsuleMenu = (id) => {
    if (activeMenuCapsule !== id) return null;
    return (
      <div className="absolute right-0 top-12 w-48 bg-[#141418] border border-white/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.8)] z-50 p-2 flex flex-col gap-1 animate-in zoom-in-95 duration-200">
        <button
          onClick={handleSolve}
          className="w-full text-left px-3 py-2 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-xl text-white text-[10px] font-bold flex items-center gap-2 transition-all"
        >
          <Play size={12} className="text-indigo-400" />
          Calcular Analítico
        </button>
        <button
          onClick={() => { handleSolve(); setTimeout(() => handleExportNote(false), 500); }}
          className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl text-white text-[10px] font-bold flex items-center gap-2 transition-all"
        >
          <FileText size={12} className="text-indigo-400" />
          Apenas Passos Escritos
        </button>
        <button
          onClick={() => { handleSolve(); setTimeout(() => handleExportNote(true), 500); }}
          className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl text-indigo-300 text-[10px] font-bold flex items-center gap-2 transition-all"
        >
          <Sparkles size={12} className="text-emerald-400" />
          Passos + Bloco Vivo
        </button>
        <div className="h-[1px] bg-white/5 my-1" />
        <button
          onClick={handleClearFields}
          className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 rounded-xl text-[10px] font-bold flex items-center gap-2 transition-all"
        >
          <RotateCcw size={12} />
          Limpar Campos
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 flex gap-6 h-full select-none" onPointerDown={e => e.stopPropagation()}>
      
      {/* LEFT COLUMN: ACTIVE CATEGORY PANEL */}
      <div className="w-1/2 flex flex-col gap-4 min-h-0">
        
        {/* CATEGORY TABS */}
        <div className="grid grid-cols-3 gap-1.5 bg-white/[0.02] border border-white/5 p-1.5 rounded-2xl shrink-0">
          {[
            { id: 0, label: 'Derivadas' },
            { id: 1, label: 'Integrais' },
            { id: 2, label: 'Séries' },
            { id: 3, label: 'EDOs' },
            { id: 4, label: 'Aplicações' },
            { id: 5, label: 'Complexas/F' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setResult(null); setActiveMenuCapsule(null); }}
              className={`py-2 px-1 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all truncate ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'text-white/35 hover:text-white/60'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* HIGH-FIDELITY MATHEMATICAL EDITOR WITH PLACEHOLDING SQUARES */}
        <div className="flex-1 bg-[#09090b]/60 border border-white/5 rounded-[35px] p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar shadow-inner-soft">
          
          <div className="flex flex-col gap-6">
            
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                {activeTab === 0 ? 'Diferenciação Analítica' : activeTab === 1 ? 'Integrais Oficiais' : activeTab === 2 ? 'Séries de Potências' : activeTab === 3 ? 'Equações Diferenciais' : activeTab === 4 ? 'Aplicações Avançadas STEM' : 'Complexas & Fourier'}
              </span>
              <p className="text-[8px] uppercase tracking-wider text-white/20 font-bold">Edite preenchendo as caixas de placeholders (▢)</p>
            </div>

            {/* ====== CATEGORY 0: DERIVATIVES ====== */}
            {activeTab === 0 && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                {/* Subselector for Derivatives */}
                <div className="grid grid-cols-4 gap-1 bg-black/25 border border-white/5 p-1 rounded-xl shrink-0">
                  {[
                    { id: 'simple', label: 'Simples' },
                    { id: 'partial', label: 'Parcial' },
                    { id: 'tangent', label: 'Tangente' },
                    { id: 'implicit', label: 'Implícita' },
                    { id: 'optimization', label: 'Extremos' },
                    { id: 'lagrange', label: 'Lagrange' },
                    { id: 'gradient_descent', label: 'Gd Descendente' },
                    { id: 'fractional', label: 'Fracionária' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSubTypeDeriv(tab.id);
                        setResult(null);
                        setActiveMenuCapsule(null);
                      }}
                      className={`py-1.5 rounded-lg text-[6.5px] font-bold uppercase transition-all truncate ${subTypeDeriv === tab.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {subTypeDeriv === 'simple' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      
                      {/* True Fraction-like derivative notation */}
                      <div className="flex items-center gap-2 border-r border-white/10 pr-4 mr-2 shrink-0">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-xl font-serif italic text-white/40 border-b border-white/10 pb-0.5 px-3">d</span>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <span className="text-sm font-serif italic text-white/30">d</span>
                            <input
                              type="text"
                              value={derivVar}
                              onChange={e => setDerivVar(e.target.value)}
                              className="w-7 h-5 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-indigo-400 font-mono font-bold text-center text-[10px] outline-none transition-all placeholder-white/10"
                              placeholder="▢"
                            />
                          </div>
                        </div>
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">[</span>

                      <div className="flex-1 max-w-[220px]">
                        <input
                          type="text"
                          value={derivExpr}
                          onChange={e => setDerivExpr(e.target.value)}
                          className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-indigo-300 font-mono font-bold outline-none transition-all w-full text-center placeholder-indigo-300/20"
                          placeholder="▢"
                        />
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">]</span>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'deriv_simple' ? null : 'deriv_simple')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('deriv_simple')}
                    </div>
                  </div>
                )}

                {subTypeDeriv === 'partial' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      
                      {/* True Fraction-like partial derivative notation */}
                      <div className="flex items-center gap-2 border-r border-white/10 pr-4 mr-2 shrink-0">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-base font-serif italic text-white/30 border-b border-white/10 pb-0.5 px-3">
                            ∂{derivPartVars.length > 1 ? <sup>{derivPartVars.length}</sup> : ''}
                          </span>
                          
                          <div className="flex items-center gap-0.5 mt-0.5 max-w-[150px] overflow-x-auto py-1">
                            {derivPartVars.map((v, idx) => (
                              <div key={idx} className="flex items-center gap-0.5 shrink-0">
                                <span className="text-xs font-serif text-white/30">∂</span>
                                <input
                                  type="text"
                                  value={v}
                                  onChange={e => {
                                    const updated = [...derivPartVars];
                                    updated[idx] = e.target.value;
                                    setDerivPartVars(updated);
                                  }}
                                  className="w-7 h-5 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-indigo-400 font-mono font-bold text-center text-[10px] outline-none transition-all placeholder-white/10"
                                  placeholder="▢"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0 ml-1">
                        <button onClick={handleAddDerivVar} disabled={derivPartVars.length >= 4} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 active:scale-90 transition-all"><Plus size={10} /></button>
                        <button onClick={handleRemoveDerivVar} disabled={derivPartVars.length <= 1} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 active:scale-90 transition-all"><Minus size={10} /></button>
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">[</span>

                      <div className="flex-1 max-w-[200px]">
                        <input
                          type="text"
                          value={derivPartExpr}
                          onChange={e => setDerivPartExpr(e.target.value)}
                          className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-indigo-300 font-mono font-bold outline-none transition-all w-full text-center placeholder-indigo-300/20"
                          placeholder="▢"
                        />
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">]</span>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'deriv_part' ? null : 'deriv_part')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('deriv_part')}
                    </div>
                  </div>
                )}

                {/* TANGENT LINE CAPSULE */}
                {subTypeDeriv === 'tangent' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      <span className="text-xs font-mono text-white/40 select-none shrink-0">y - f(x₀) = f'(x₀)(x - x₀)</span>
                      <div className="w-[1px] h-6 bg-white/10 mx-2 shrink-0" />
                      
                      <span className="text-xs font-mono text-white/30 shrink-0">f(x) =</span>
                      <input 
                        type="text" 
                        value={derivExpr} 
                        onChange={e => setDerivExpr(e.target.value)} 
                        className="w-32 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs text-indigo-300 font-mono text-center outline-none" 
                        placeholder="f(x)" 
                      />
                      
                      <span className="text-xs font-mono text-white/30 shrink-0 ml-2">x₀ =</span>
                      <input 
                        type="text" 
                        value={derivVar} 
                        onChange={e => setDerivVar(e.target.value)} 
                        className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1.5 text-xs text-white font-mono text-center outline-none" 
                        placeholder="1" 
                      />
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'deriv_tang' ? null : 'deriv_tang')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('deriv_tang')}
                    </div>
                  </div>
                )}

                {/* IMPLICIT DIFFERENTIATION CAPSULE */}
                {subTypeDeriv === 'implicit' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center font-mono">
                      <span className="text-xs text-white/40 select-none shrink-0">dy/dx = -F_x / F_y</span>
                      <div className="w-[1px] h-6 bg-white/10 mx-2 shrink-0" />
                      
                      <span className="text-xs text-white/30 shrink-0">F(x, y) =</span>
                      <input 
                        type="text" 
                        value={derivPartExpr} 
                        onChange={e => setDerivPartExpr(e.target.value)} 
                        className="w-40 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs text-indigo-300 font-mono text-center outline-none" 
                        placeholder="x^2 + y^2 - 4" 
                      />
                      <span className="text-xs text-white/30 shrink-0 select-none">= 0</span>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'deriv_impl' ? null : 'deriv_impl')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('deriv_impl')}
                    </div>
                  </div>
                )}

                {/* OTIMIZAÇÃO MULTIVARIÁVEL CAPSULE */}
                {subTypeDeriv === 'optimization' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      <span className="text-xs font-mono text-white/40 select-none shrink-0">Hessiana f_xx f_yy - f_xy²</span>
                      <div className="w-[1px] h-6 bg-white/10 mx-2 shrink-0" />
                      
                      <span className="text-xs font-mono text-white/30 shrink-0">f(x, y) =</span>
                      <input 
                        type="text" 
                        value={derivPartExpr} 
                        onChange={e => setDerivPartExpr(e.target.value)} 
                        className="w-48 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs text-indigo-300 font-mono text-center outline-none" 
                        placeholder="x^2 + y^2 - 2*x" 
                      />
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'deriv_opt' ? null : 'deriv_opt')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('deriv_opt')}
                    </div>
                  </div>
                )}

                {/* MULTIPLICADORES DE LAGRANGE CAPSULE */}
                {subTypeDeriv === 'lagrange' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      <span className="text-xs font-mono text-white/40 select-none shrink-0">∇f = λ∇g</span>
                      <div className="w-[1px] h-6 bg-white/10 mx-1 shrink-0" />
                      
                      <span className="text-xs font-mono text-white/30 shrink-0">f(x, y) =</span>
                      <input 
                        type="text" 
                        value={lagrangeF} 
                        onChange={e => setLagrangeF(e.target.value)} 
                        className="w-24 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1 text-xs text-indigo-300 font-mono text-center outline-none" 
                        placeholder="x*y" 
                      />

                      <span className="text-xs font-mono text-white/30 shrink-0 ml-1">g(x, y) =</span>
                      <input 
                        type="text" 
                        value={lagrangeG} 
                        onChange={e => setLagrangeG(e.target.value)} 
                        className="w-24 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1 text-xs text-white font-mono text-center outline-none" 
                        placeholder="x+y" 
                      />

                      <span className="text-xs font-mono text-white/30 shrink-0 select-none">=</span>
                      <input 
                        type="text" 
                        value={lagrangeK} 
                        onChange={e => setLagrangeK(e.target.value)} 
                        className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-white font-mono text-center outline-none" 
                        placeholder="10" 
                      />
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'deriv_lag' ? null : 'deriv_lag')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('deriv_lag')}
                    </div>
                  </div>
                )}

                {/* GRADIENTE DESCENDENTE CAPSULE */}
                {subTypeDeriv === 'gradient_descent' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 overflow-x-auto py-2 flex-1 justify-center font-mono">
                      <span className="text-xs text-white/30 shrink-0">f(x, y) =</span>
                      <input 
                        type="text" 
                        value={gdExpr} 
                        onChange={e => setGdExpr(e.target.value)} 
                        className="w-28 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1 text-[11px] text-indigo-300 text-center outline-none font-bold" 
                        placeholder="x^2+y^2" 
                      />

                      <span className="text-xs text-white/30 shrink-0 ml-1 select-none">η =</span>
                      <input 
                        type="text" 
                        value={gdLr} 
                        onChange={e => setGdLr(e.target.value)} 
                        className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-[11px] text-white text-center outline-none font-bold" 
                        placeholder="0.1" 
                      />

                      <span className="text-xs text-white/30 shrink-0 ml-1 select-none">β =</span>
                      <input 
                        type="text" 
                        value={gdMomentum} 
                        onChange={e => setGdMomentum(e.target.value)} 
                        className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-[11px] text-white text-center outline-none font-bold" 
                        placeholder="0.9" 
                      />

                      <span className="text-xs text-white/30 shrink-0 ml-1 select-none">Passos =</span>
                      <input 
                        type="text" 
                        value={gdSteps} 
                        onChange={e => setGdSteps(e.target.value)} 
                        className="w-10 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-[11px] text-white text-center outline-none font-bold" 
                        placeholder="5" 
                      />
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'deriv_gd' ? null : 'deriv_gd')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('deriv_gd')}
                    </div>
                  </div>
                )}

                {/* FRACIONAL DIFFERENTIATION CAPSULE */}
                {subTypeDeriv === 'fractional' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      
                      <div className="flex items-center gap-2 border-r border-white/10 pr-4 mr-2 shrink-0">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-xl font-serif italic text-white/40 border-b border-white/10 pb-0.5 px-3 relative">
                            d
                            <input
                              type="text"
                              value={fracAlpha}
                              onChange={e => setFracAlpha(e.target.value)}
                              className="w-6 h-4 bg-transparent border border-white/20 focus:border-indigo-500 rounded text-indigo-400 font-mono font-bold text-center text-[8px] outline-none absolute -top-1 -right-2"
                              placeholder="α"
                            />
                          </span>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <span className="text-sm font-serif italic text-white/30">dx</span>
                            <span className="text-[8px] font-serif text-white/30">{fracAlpha}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">[</span>

                      <div className="flex-1 max-w-[220px]">
                        <input
                          type="text"
                          value={fracExpr}
                          onChange={e => setFracExpr(e.target.value)}
                          className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-indigo-300 font-mono font-bold outline-none transition-all w-full text-center placeholder-indigo-300/20"
                          placeholder="x"
                        />
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">]</span>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'deriv_frac' ? null : 'deriv_frac')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('deriv_frac')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====== CATEGORY 1: INTEGRALS ====== */}
            {activeTab === 1 && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                {/* Integral Type Subselector */}
                <div className="grid grid-cols-4 gap-1 bg-black/25 border border-white/5 p-1 rounded-xl shrink-0">
                  {[
                    { id: 'simple', label: 'Simples' },
                    { id: 'double', label: 'Dupla' },
                    { id: 'triple', label: 'Tripla' },
                    { id: 'triple_coords', label: 'Múltipla Coor.' },
                    { id: 'line', label: 'Linha' },
                    { id: 'surface', label: 'Superfície' },
                    { id: 'theorems', label: 'Teoremas' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSubTypeInteg(tab.id);
                        if (tab.id === 'simple') syncIntegralDimension(1);
                        else if (tab.id === 'double') syncIntegralDimension(2);
                        else if (tab.id === 'triple') syncIntegralDimension(3);
                        setResult(null);
                        setActiveMenuCapsule(null);
                      }}
                      className={`py-1.5 rounded-lg text-[6.5px] font-bold uppercase transition-all truncate ${subTypeInteg === tab.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* VISUAL INTEGRAL OPERATOR WITH SIDE-ALIGNED LIMITS */}
                {(subTypeInteg === 'simple' || subTypeInteg === 'double' || subTypeInteg === 'triple') && (
                  <div className="bg-[#0d0d12] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      
                      {/* Integral Dimension Controls */}
                      <div className="flex flex-col gap-1 mr-2 shrink-0">
                        <button onClick={handleAddIntegral} disabled={integVars.length >= 3} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white disabled:opacity-20 active:scale-90 transition-all">+</button>
                        <button onClick={handleRemoveIntegral} disabled={integVars.length <= 1} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white disabled:opacity-20 active:scale-90 transition-all">-</button>
                      </div>

                      {/* Integrals stack with LaTeX Side-Aligned Limits */}
                      <div className="flex items-center gap-1 shrink-0">
                        
                        {/* Integral 1 */}
                        <div className="flex items-center relative">
                          <span className="text-5xl font-light text-indigo-500/80 leading-none select-none">∫</span>
                          <div className="flex flex-col justify-between h-[42px] -ml-1 mr-1 py-0.5 shrink-0">
                            <input
                              type="text"
                              value={upperBound1}
                              onChange={e => setUpperBound1(e.target.value)}
                              className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center outline-none"
                              placeholder="▢"
                            />
                            <input
                              type="text"
                              value={lowerBound1}
                              onChange={e => setLowerBound1(e.target.value)}
                              className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center outline-none"
                              placeholder="▢"
                            />
                          </div>
                        </div>

                        {/* Integral 2 (Double/Triple) */}
                        {(integVars.length >= 2) && (
                          <div className="flex items-center relative animate-in zoom-in-95 duration-200">
                            <span className="text-5xl font-light text-indigo-500/80 leading-none select-none">∫</span>
                            <div className="flex flex-col justify-between h-[42px] -ml-1 mr-1 py-0.5 shrink-0">
                              <input
                                type="text"
                                value={upperBound2}
                                onChange={e => setUpperBound2(e.target.value)}
                                className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center outline-none"
                                placeholder="▢"
                              />
                              <input
                                type="text"
                                value={lowerBound2}
                                onChange={e => setLowerBound2(e.target.value)}
                                className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center outline-none"
                                placeholder="▢"
                              />
                            </div>
                          </div>
                        )}

                        {/* Integral 3 (Triple) */}
                        {(integVars.length === 3) && (
                          <div className="flex items-center relative animate-in zoom-in-95 duration-200">
                            <span className="text-5xl font-light text-indigo-500/80 leading-none select-none">∫</span>
                            <div className="flex flex-col justify-between h-[42px] -ml-1 mr-1 py-0.5 shrink-0">
                              <input
                                type="text"
                                value={upperBound3}
                                onChange={e => setUpperBound3(e.target.value)}
                                className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center outline-none"
                                placeholder="▢"
                              />
                              <input
                                type="text"
                                value={lowerBound3}
                                onChange={e => setLowerBound3(e.target.value)}
                                className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center outline-none"
                                placeholder="▢"
                              />
                            </div>
                          </div>
                        )}

                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">[</span>

                      {/* Integrand function */}
                      <div className="flex-1 max-w-[200px]">
                        <input
                          type="text"
                          value={integExpr}
                          onChange={e => setIntegExpr(e.target.value)}
                          className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-indigo-300 font-mono font-bold outline-none transition-all w-full text-center placeholder-indigo-300/20"
                          placeholder="▢"
                        />
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">]</span>

                      {/* Differentials d[x] d[y]... */}
                      <div className="flex items-center gap-1.5 shrink-0 max-w-[120px] overflow-x-auto py-1">
                        {integVars.map((v, idx) => (
                          <div key={idx} className="flex items-center gap-0.5 shrink-0">
                            <span className="text-xs font-mono font-bold text-white/40">d</span>
                            <input
                              type="text"
                              value={v}
                              onChange={e => {
                                const updated = [...integVars];
                                updated[idx] = e.target.value;
                                setIntegVars(updated);
                              }}
                              className="w-6 h-6 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-indigo-400 font-mono font-bold text-center text-[10px] outline-none"
                            />
                          </div>
                        ))}
                      </div>

                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'integ_simple' ? null : 'integ_simple')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('integ_simple')}
                    </div>
                  </div>
                )}

                {/* LINE INTEGRAL */}
                {subTypeInteg === 'line' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                    <div className="flex gap-2 items-center justify-between shrink-0">
                      <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400/60">Integral de Linha: ∮_C F · dr</span>
                      <button 
                        onClick={() => setLineIs3D(!lineIs3D)} 
                        className="py-1 px-3.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-[8px] font-black uppercase text-white tracking-widest transition-all"
                      >
                        {lineIs3D ? 'Alternar para 2D' : 'Alternar para 3D'}
                      </button>
                    </div>

                    <div className="bg-[#0d0d12] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                      <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                        
                        {/* Contour Integral with LaTeX Side-Aligned Limits */}
                        <div className="flex items-center relative shrink-0">
                          <span className="text-5xl font-light text-indigo-500/80 leading-none select-none">∮</span>
                          <div className="flex flex-col justify-between h-[42px] -ml-1.5 mr-1 py-0.5 shrink-0">
                            <input 
                              type="text" 
                              value={lineTMax} 
                              onChange={e => setLineTMax(e.target.value)} 
                              className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center" 
                              placeholder="t₂" 
                            />
                            <input 
                              type="text" 
                              value={lineTMin} 
                              onChange={e => setLineTMin(e.target.value)} 
                              className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center" 
                              placeholder="t₁" 
                            />
                          </div>
                        </div>

                        <span className="text-4xl font-light text-indigo-400/40 select-none">[</span>

                        <div className="flex flex-col gap-1 shrink-0">
                          <span className="text-[7px] font-black text-white/35 uppercase text-center">Campo F = {lineIs3D ? '(P, Q, R)' : '(P, Q)'}</span>
                          <div className="flex items-center gap-1.5 justify-center">
                            <input type="text" value={lineP} onChange={e => setLineP(e.target.value)} className="w-16 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 px-2 text-center text-[10px] font-mono text-indigo-300 font-bold outline-none" placeholder="P" />
                            <span className="text-white/20">,</span>
                            <input type="text" value={lineQ} onChange={e => setLineQ(e.target.value)} className="w-16 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 px-2 text-center text-[10px] font-mono text-indigo-300 font-bold outline-none" placeholder="Q" />
                            {lineIs3D && (
                              <>
                                <span className="text-white/20">,</span>
                                <input type="text" value={lineR} onChange={e => setLineR(e.target.value)} className="w-16 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 px-2 text-center text-[10px] font-mono text-indigo-300 font-bold outline-none animate-in zoom-in-95 duration-200" placeholder="R" />
                              </>
                            )}
                          </div>
                        </div>

                        <span className="text-4xl font-light text-indigo-400/40 select-none">]</span>
                        <span className="text-xs font-mono font-black text-white/30">· dr</span>
                      </div>

                      <div className="relative shrink-0">
                        <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'line_capsule' ? null : 'line_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                          <Menu size={16} className="text-indigo-400" />
                        </button>
                        {renderCapsuleMenu('line_capsule')}
                      </div>
                    </div>

                    {/* Parametric Curve r(t) */}
                    <div className="bg-[#0a0a0e]/40 border border-white/5 rounded-[30px] p-5 flex flex-col gap-3">
                      <span className="text-[8px] font-black uppercase text-indigo-400/40 tracking-wider">Curva Parametrizada r(t)</span>
                      
                      <div className="flex items-center gap-2 justify-center py-1">
                        <span className="text-sm font-mono text-indigo-400 font-bold select-none">r(t) = (</span>
                        
                        <input 
                          type="text" 
                          value={lineXt} 
                          onChange={e => setLineXt(e.target.value)} 
                          className="w-24 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs font-mono text-white text-center outline-none transition-all" 
                          placeholder="x(t)" 
                        />
                        <span className="text-white/30 font-bold select-none">,</span>
                        
                        <input 
                          type="text" 
                          value={lineYt} 
                          onChange={e => setLineYt(e.target.value)} 
                          className="w-24 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs font-mono text-white text-center outline-none transition-all" 
                          placeholder="y(t)" 
                        />
                        
                        {lineIs3D && (
                          <>
                            <span className="text-white/30 font-bold select-none">,</span>
                            <input 
                              type="text" 
                              value={lineZt} 
                              onChange={e => setLineZt(e.target.value)} 
                              className="w-24 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs font-mono text-white text-center outline-none transition-all animate-in zoom-in-95 duration-200" 
                              placeholder="z(t)" 
                            />
                          </>
                        )}
                        
                        <span className="text-sm font-mono text-indigo-400 font-bold select-none">)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SURFACE INTEGRAL */}
                {subTypeInteg === 'surface' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between shrink-0 gap-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400/60">Integral de Superfície: ∬_S F · dS</span>
                      
                      <div className="flex gap-1.5 bg-black/25 border border-white/5 p-1 rounded-xl">
                        <button onClick={() => setSurfIsVectorFlux(true)} className={`py-1 px-2.5 rounded-lg text-[7px] font-bold uppercase transition-all ${surfIsVectorFlux ? 'bg-white/10 text-white' : 'text-white/40'}`}>Fluxo Vetorial</button>
                        <button onClick={() => setSurfIsVectorFlux(false)} className={`py-1 px-2.5 rounded-lg text-[7px] font-bold uppercase transition-all ${!surfIsVectorFlux ? 'bg-white/10 text-white' : 'text-white/40'}`}>Escalar</button>
                      </div>
                    </div>

                    <div className="bg-[#0d0d12] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                      <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                        
                        {/* Double Integral with LaTeX Side-Aligned Limits for Surface */}
                        <div className="flex items-center shrink-0">
                          <span className="text-5xl font-light text-indigo-500/80 leading-none select-none">∬</span>
                          <div className="flex flex-col justify-between h-[42px] -ml-2 mr-1 py-0.5 shrink-0">
                            <input
                              type="text"
                              value={surfUpperBound1}
                              onChange={e => setSurfUpperBound1(e.target.value)}
                              className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center"
                              placeholder="max"
                            />
                            <input
                              type="text"
                              value={surfLowerBound1}
                              onChange={e => setSurfLowerBound1(e.target.value)}
                              className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center"
                              placeholder="min"
                            />
                          </div>
                        </div>

                        <span className="text-4xl font-light text-indigo-400/40 select-none">[</span>

                        {surfIsVectorFlux ? (
                          <div className="flex flex-col gap-1 shrink-0">
                            <span className="text-[7px] font-black text-white/35 uppercase text-center">Campo Vetorial F = (P, Q, R)</span>
                            <div className="flex items-center gap-1.5 justify-center">
                              <input type="text" value={surfP} onChange={e => setSurfP(e.target.value)} className="w-14 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 px-2 text-center text-[10px] font-mono text-indigo-300 font-bold" placeholder="P" />
                              <span className="text-white/20">,</span>
                              <input type="text" value={surfQ} onChange={e => setSurfQ(e.target.value)} className="w-14 bg-transparent border border-white/10 rounded-lg py-1 px-2 text-center text-[10px] font-mono text-indigo-300 font-bold" placeholder="Q" />
                              <span className="text-white/20">,</span>
                              <input type="text" value={surfR} onChange={e => setSurfR(e.target.value)} className="w-14 bg-transparent border border-white/10 rounded-lg py-1 px-2 text-center text-[10px] font-mono text-indigo-300 font-bold" placeholder="R" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 flex-1 max-w-[160px]">
                            <span className="text-[7px] font-black text-white/35 uppercase text-center">Função Escalar f(x, y, z)</span>
                            <input type="text" value={surfP} onChange={e => setSurfP(e.target.value)} className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 px-3 text-center text-[10px] font-mono text-indigo-300 font-bold w-full" placeholder="f(x,y,z)" />
                          </div>
                        )}

                        <span className="text-4xl font-light text-indigo-400/40 select-none">]</span>
                        <span className="text-xs font-mono font-black text-indigo-400 select-none shrink-0">
                          {surfIsPolar ? 'r dr dθ' : 'dy dx'}
                        </span>
                      </div>

                      <div className="relative shrink-0">
                        <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'surf_capsule' ? null : 'surf_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                          <Menu size={16} className="text-indigo-400" />
                        </button>
                        {renderCapsuleMenu('surf_capsule')}
                      </div>
                    </div>

                    {/* Surface Equation & Domain Limits */}
                    <div className="bg-[#0a0a0e]/40 border border-white/5 rounded-[30px] p-5 flex flex-col gap-4 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[8px] font-black uppercase text-indigo-400/50 tracking-wider">Superfície S & Região de Projeção D</span>
                        <div className="flex gap-1 bg-black/35 border border-white/5 p-0.5 rounded-lg">
                          <button onClick={() => { setSurfIsPolar(false); setSurfLowerBound2('0'); setSurfUpperBound2('2'); }} className={`py-0.5 px-2 rounded-md text-[6.5px] font-bold uppercase transition-all ${!surfIsPolar ? 'bg-white/10 text-white' : 'text-white/40'}`}>Cartesiana</button>
                          <button onClick={() => { setSurfIsPolar(true); setSurfLowerBound2('0'); setSurfUpperBound2('2*pi'); }} className={`py-0.5 px-2 rounded-md text-[6.5px] font-bold uppercase transition-all ${surfIsPolar ? 'bg-white/10 text-white' : 'text-white/40'}`}>Polar / Cilíndrica</button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[7px] font-black uppercase text-white/20">Equação da Superfície: z = g(x, y)</span>
                          <input type="text" value={surfS} onChange={e => setSurfS(e.target.value)} className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1.5 px-3 text-xs font-mono text-white text-center w-full outline-none" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[7px] font-black uppercase text-white/20">{surfIsPolar ? 'Limite Radial r:' : 'Limite y (Interno):'}</span>
                            <div className="flex items-center gap-1.5 justify-center">
                              <input type="text" value={surfLowerBound1} onChange={e => setSurfLowerBound1(e.target.value)} className="w-16 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" placeholder="min" />
                              <span className="text-white/20 text-xs font-bold">a</span>
                              <input type="text" value={surfUpperBound1} onChange={e => setSurfUpperBound1(e.target.value)} className="w-16 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" placeholder="max" />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[7px] font-black uppercase text-white/20">{surfIsPolar ? 'Limite Angular θ:' : 'Limite x (Externo):'}</span>
                            <div className="flex items-center gap-1.5 justify-center">
                              <input type="text" value={surfLowerBound2} onChange={e => setSurfLowerBound2(e.target.value)} className="w-16 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" placeholder="min" />
                              <span className="text-white/20 text-xs font-bold">a</span>
                              <input type="text" value={surfUpperBound2} onChange={e => setSurfUpperBound2(e.target.value)} className="w-16 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" placeholder="max" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TRIPLE COORDS INTEGRALS */}
                {subTypeInteg === 'triple_coords' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between shrink-0 gap-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400/60">Cálculo de Integrais Triplas em Coordenadas Especiais</span>
                      
                      <div className="flex gap-1.5 bg-black/25 border border-white/5 p-1 rounded-xl">
                        <button onClick={() => setTripleCoords('cylindrical')} className={`py-1 px-2.5 rounded-lg text-[7px] font-bold uppercase transition-all ${tripleCoords === 'cylindrical' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Cilíndrica</button>
                        <button onClick={() => setTripleCoords('spherical')} className={`py-1 px-2.5 rounded-lg text-[7px] font-bold uppercase transition-all ${tripleCoords === 'spherical' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Esférica</button>
                      </div>
                    </div>

                    <div className="bg-[#0d0d12] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                      <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                        <span className="text-5xl font-light text-indigo-500/80 leading-none select-none">∫∫∫</span>
                        <span className="text-4xl font-light text-indigo-400/40 select-none ml-1">[</span>
                        <div className="flex-1 max-w-[150px]">
                          <input type="text" value={tripleExpr} onChange={e => setTripleExpr(e.target.value)} className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 px-3 text-center text-[10px] font-mono text-indigo-300 font-bold w-full" placeholder="f(r,θ,z)" />
                        </div>
                        <span className="text-4xl font-light text-indigo-400/40 select-none">]</span>
                        <span className="text-xs font-mono font-black text-indigo-400 select-none shrink-0">
                          {tripleCoords === 'cylindrical' ? 'r dz dr dθ' : 'ρ² sin(φ) dρ dφ dθ'}
                        </span>
                      </div>

                      <div className="relative shrink-0">
                        <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'triple_coords_capsule' ? null : 'triple_coords_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                          <Menu size={16} className="text-indigo-400" />
                        </button>
                        {renderCapsuleMenu('triple_coords_capsule')}
                      </div>
                    </div>

                    {/* Coordinates boundaries inputs */}
                    <div className="bg-[#0a0a0e]/40 border border-white/5 rounded-[30px] p-5 flex flex-col gap-4">
                      <span className="text-[8px] font-black uppercase text-indigo-400/50 tracking-wider">Limites de Integração</span>
                      {tripleCoords === 'cylindrical' ? (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col gap-1 text-center">
                            <span className="text-[7px] font-black uppercase text-white/20">z (interno):</span>
                            <div className="flex items-center gap-1">
                              <input type="text" value={tripleZMin} onChange={e => setTripleZMin(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                              <span className="text-white/20 text-[8px]">-</span>
                              <input type="text" value={tripleZMax} onChange={e => setTripleZMax(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 text-center">
                            <span className="text-[7px] font-black uppercase text-white/20">r (médio):</span>
                            <div className="flex items-center gap-1">
                              <input type="text" value={tripleRMin} onChange={e => setTripleRMin(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                              <span className="text-white/20 text-[8px]">-</span>
                              <input type="text" value={tripleRMax} onChange={e => setTripleRMax(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 text-center">
                            <span className="text-[7px] font-black uppercase text-white/20">θ (externo):</span>
                            <div className="flex items-center gap-1">
                              <input type="text" value={tripleThetaMin} onChange={e => setTripleThetaMin(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                              <span className="text-white/20 text-[8px]">-</span>
                              <input type="text" value={tripleThetaMax} onChange={e => setTripleThetaMax(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col gap-1 text-center">
                            <span className="text-[7px] font-black uppercase text-white/20">ρ (interno):</span>
                            <div className="flex items-center gap-1">
                              <input type="text" value={tripleRhoMin} onChange={e => setTripleRhoMin(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                              <span className="text-white/20 text-[8px]">-</span>
                              <input type="text" value={tripleRhoMax} onChange={e => setTripleRhoMax(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 text-center">
                            <span className="text-[7px] font-black uppercase text-white/20">φ (médio):</span>
                            <div className="flex items-center gap-1">
                              <input type="text" value={triplePhiMin} onChange={e => setTriplePhiMin(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                              <span className="text-white/20 text-[8px]">-</span>
                              <input type="text" value={triplePhiMax} onChange={e => setTriplePhiMax(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 text-center">
                            <span className="text-[7px] font-black uppercase text-white/20">θ (externo):</span>
                            <div className="flex items-center gap-1">
                              <input type="text" value={tripleThetaMin} onChange={e => setTripleThetaMin(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                              <span className="text-white/20 text-[8px]">-</span>
                              <input type="text" value={tripleThetaMax} onChange={e => setTripleThetaMax(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* VECTOR THEOREMS */}
                {subTypeInteg === 'theorems' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between shrink-0 gap-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400/60">Teoremas Clássicos do Cálculo Vetorial</span>
                      
                      <div className="flex gap-1 bg-black/25 border border-white/5 p-1 rounded-xl">
                        {['green', 'gauss', 'stokes'].map(m => (
                          <button key={m} onClick={() => setTheoremMode(m)} className={`py-1 px-2.5 rounded-lg text-[6.5px] font-bold uppercase transition-all ${theoremMode === m ? 'bg-white/10 text-white' : 'text-white/40'}`}>
                            {m === 'green' ? 'Green' : m === 'gauss' ? 'Gauss' : 'Stokes'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#0d0d12] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                      <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                        <span className="text-5xl font-light text-indigo-500/80 leading-none select-none">
                          {theoremMode === 'green' ? '∮_C' : theoremMode === 'gauss' ? '∬_S' : '∮_C'}
                        </span>
                        <span className="text-xs font-mono text-white/30 shrink-0 ml-1">F =</span>
                        <div className="flex items-center gap-1 justify-center shrink-0">
                          <input type="text" value={theoremP} onChange={e => setTheoremP(e.target.value)} className="w-14 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 px-1.5 text-center text-[10px] font-mono text-indigo-300 font-bold" />
                          <span className="text-white/20">,</span>
                          <input type="text" value={theoremQ} onChange={e => setTheoremQ(e.target.value)} className="w-14 bg-transparent border border-white/10 rounded-lg py-1 px-1.5 text-center text-[10px] font-mono text-indigo-300 font-bold" />
                          {theoremMode !== 'green' && (
                            <>
                              <span className="text-white/20">,</span>
                              <input type="text" value={theoremR} onChange={e => setTheoremR(e.target.value)} className="w-14 bg-transparent border border-white/10 rounded-lg py-1 px-1.5 text-center text-[10px] font-mono text-indigo-300 font-bold" />
                            </>
                          )}
                        </div>
                        <span className="text-xs font-mono font-black text-indigo-400 select-none shrink-0 ml-1">
                          {theoremMode === 'green' ? '· dr' : theoremMode === 'gauss' ? '· dS' : '· dr'}
                        </span>
                      </div>

                      <div className="relative shrink-0">
                        <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'theorems_capsule' ? null : 'theorems_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                          <Menu size={16} className="text-indigo-400" />
                        </button>
                        {renderCapsuleMenu('theorems_capsule')}
                      </div>
                    </div>

                    {/* Theorem boundaries inputs */}
                    <div className="bg-[#0a0a0e]/40 border border-white/5 rounded-[30px] p-5 flex flex-col gap-4">
                      <span className="text-[8px] font-black uppercase text-indigo-400/50 tracking-wider">Região Limite D / Sólido V</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1 text-center">
                          <span className="text-[7px] font-black uppercase text-white/20">Limites x:</span>
                          <div className="flex items-center gap-1 justify-center">
                            <input type="text" value={theoremXMin} onChange={e => setTheoremXMin(e.target.value)} className="w-10 bg-transparent border border-white/10 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                            <span className="text-white/20">-</span>
                            <input type="text" value={theoremXMax} onChange={e => setTheoremXMax(e.target.value)} className="w-10 bg-transparent border border-white/10 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 text-center">
                          <span className="text-[7px] font-black uppercase text-white/20">Limites y:</span>
                          <div className="flex items-center gap-1 justify-center">
                            <input type="text" value={theoremYMin} onChange={e => setTheoremYMin(e.target.value)} className="w-10 bg-transparent border border-white/10 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                            <span className="text-white/20">-</span>
                            <input type="text" value={theoremYMax} onChange={e => setTheoremYMax(e.target.value)} className="w-10 bg-transparent border border-white/10 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                          </div>
                        </div>

                        {theoremMode === 'gauss' && (
                          <div className="flex flex-col gap-1 text-center animate-in zoom-in-95 duration-200">
                            <span className="text-[7px] font-black uppercase text-white/20">Limites z:</span>
                            <div className="flex items-center gap-1 justify-center">
                              <input type="text" value={theoremZMin} onChange={e => setTheoremZMin(e.target.value)} className="w-10 bg-transparent border border-white/10 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                              <span className="text-white/20">-</span>
                              <input type="text" value={theoremZMax} onChange={e => setTheoremZMax(e.target.value)} className="w-10 bg-transparent border border-white/10 rounded-lg py-1 text-center font-mono text-[9px] text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ====== CATEGORY 2: SERIES ====== */}
            {activeTab === 2 && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                <div className="flex gap-1.5 bg-black/25 border border-white/5 p-1 rounded-xl shrink-0">
                  <button onClick={() => setSubTypeSeries('taylor')} className={`flex-1 py-1.5 rounded-lg text-[7px] font-bold uppercase transition-all ${subTypeSeries === 'taylor' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Série de Taylor</button>
                  <button onClick={() => setSubTypeSeries('convergence')} className={`flex-1 py-1.5 rounded-lg text-[7px] font-bold uppercase transition-all ${subTypeSeries === 'convergence' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Convergência</button>
                  <button onClick={() => setSubTypeSeries('radius')} className={`flex-1 py-1.5 rounded-lg text-[7px] font-bold uppercase transition-all ${subTypeSeries === 'radius' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Raio / Intervalo</button>
                </div>

                {subTypeSeries === 'taylor' ? (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                    <div className="flex flex-col gap-4 flex-1">
                      <div className="flex items-center gap-3 overflow-x-auto py-2 justify-center">
                        <span className="text-xs font-mono font-black text-white/30 select-none">f(x) =</span>
                        <div className="flex-1 max-w-[200px]">
                          <input type="text" value={taylorExpr} onChange={e => setTaylorExpr(e.target.value)} className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-indigo-300 font-mono outline-none transition-all w-full text-center placeholder-indigo-300/20" placeholder="▢" />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 border-t border-white/5 pt-3 justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-white/40">Centro x0 =</span>
                          <input type="text" value={taylorCenter} onChange={e => setTaylorCenter(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1.5 text-center text-xs text-white font-mono outline-none" placeholder="▢" />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-white/40">Grau N =</span>
                          <input type="number" value={taylorDegree} onChange={e => setTaylorDegree(e.target.value)} className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1.5 text-center text-xs text-white outline-none" min="1" max="15" />
                        </div>
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'taylor_capsule' ? null : 'taylor_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('taylor_capsule')}
                    </div>
                  </div>
                ) : subTypeSeries === 'convergence' ? (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                    <div className="flex items-center gap-4 overflow-x-auto py-2 flex-1 justify-center">
                      
                      {/* Summation operator with true LaTeX aligned limits */}
                      <div className="flex flex-col items-center justify-center shrink-0 font-serif relative">
                        <input 
                          type="text" 
                          value={upperBound1} 
                          onChange={e => setUpperBound1(e.target.value)} 
                          className="w-8 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center outline-none" 
                          placeholder="∞" 
                        />
                        <span className="text-4xl text-indigo-400 font-light leading-none my-0.5 select-none font-serif">∑</span>
                        <span className="text-4xl font-light text-indigo-400 font-light leading-none my-0.5 select-none font-serif"></span>
                        <input 
                          type="text" 
                          value={lowerBound1} 
                          onChange={e => setLowerBound1(e.target.value)} 
                          className="w-10 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center outline-none" 
                          placeholder="n=1" 
                        />
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">(</span>

                      <div className="flex-1 max-w-[160px]">
                        <input
                          type="text"
                          value={convAn}
                          onChange={e => setConvAn(e.target.value)}
                          className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-indigo-300 font-mono font-bold outline-none transition-all w-full text-center placeholder-indigo-300/20"
                          placeholder="▢"
                        />
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">)</span>

                      <div className="flex flex-col gap-1 w-20 shrink-0">
                        <span className="text-[7px] font-black uppercase text-white/25">Critério</span>
                        <select value={convTest} onChange={e => setConvTest(e.target.value)} className="bg-[#141418] border border-white/20 rounded-lg py-1 px-1 text-[9px] font-bold text-white outline-none w-full">
                          <option value="ratio">Razão</option>
                          <option value="root">Raiz</option>
                        </select>
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'conv_capsule' ? null : 'conv_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('conv_capsule')}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-4 overflow-x-auto py-2 flex-1 justify-center">
                      
                      <div className="flex flex-col items-center justify-center shrink-0 font-serif relative">
                        <span className="text-[8px] font-mono text-white/35">∞</span>
                        <span className="text-4xl text-indigo-400 font-light leading-none my-0.5 select-none font-serif">∑</span>
                        <span className="text-[8px] font-mono text-white/35">n=1</span>
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">(</span>

                      <div className="flex-1 max-w-[180px]">
                        <input
                          type="text"
                          value={psExpr}
                          onChange={e => setPsExpr(e.target.value)}
                          className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-indigo-300 font-mono font-bold outline-none transition-all w-full text-center placeholder-indigo-300/20"
                          placeholder="x^n / n"
                        />
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">)</span>

                      <div className="flex flex-col gap-1 w-16 shrink-0">
                        <span className="text-[7px] font-black uppercase text-white/25">Centro c</span>
                        <input 
                          type="text" 
                          value={psCenter} 
                          onChange={e => setPsCenter(e.target.value)} 
                          className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-[10px] text-white font-mono text-center outline-none w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'ps_radius_capsule' ? null : 'ps_radius_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('ps_radius_capsule')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====== CATEGORY 3: EDOs ====== */}
            {activeTab === 3 && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                <div className="grid grid-cols-4 gap-1 bg-black/25 border border-white/5 p-1 rounded-xl shrink-0">
                  {[
                    { id: 'first', label: '1ª Ordem' },
                    { id: 'second', label: '2ª Ord. H.' },
                    { id: 'nonhomogeneous', label: '2ª Ord. Ñ-H.' },
                    { id: 'system', label: 'Sistemas 2x2' },
                    { id: 'rk4', label: 'RK4' },
                    { id: 'perturbation', label: 'Perturbação' },
                    { id: 'stability', label: 'Estabilidade' },
                    { id: 'pde', label: 'EDPs' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSubTypeOde(tab.id);
                        setResult(null);
                        setActiveMenuCapsule(null);
                      }}
                      className={`py-1.5 rounded-lg text-[6.5px] font-bold uppercase transition-all truncate ${subTypeOde === tab.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {subTypeOde === 'first' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      <span className="text-xs font-mono font-black text-indigo-400 select-none shrink-0">y' +</span>
                      
                      <div className="flex-1 max-w-[120px]">
                        <input
                          type="text"
                          value={odeP}
                          onChange={e => setOdeP(e.target.value)}
                          className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-center text-xs text-indigo-300 font-mono font-bold outline-none w-full placeholder-indigo-300/20"
                          placeholder="P(x)"
                        />
                      </div>

                      <span className="text-xs font-mono font-black text-indigo-400 select-none shrink-0">y =</span>

                      <div className="flex-1 max-w-[120px]">
                        <input
                          type="text"
                          value={odeQ}
                          onChange={e => setOdeQ(e.target.value)}
                          className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-center text-xs text-indigo-300 font-mono font-bold outline-none w-full placeholder-indigo-300/20"
                          placeholder="Q(x)"
                        />
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'ode1_capsule' ? null : 'ode1_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('ode1_capsule')}
                    </div>
                  </div>
                )}

                {subTypeOde === 'second' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      <input
                        type="number"
                        value={odeA}
                        onChange={e => setOdeA(e.target.value)}
                        className="w-10 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg text-indigo-300 font-mono text-center text-xs py-1.5 outline-none placeholder-white/20"
                        placeholder="a"
                      />
                      <span className="text-xs font-mono font-black text-white/40 mr-1 select-none">y'' +</span>

                      <input
                        type="number"
                        value={odeB}
                        onChange={e => setOdeB(e.target.value)}
                        className="w-10 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg text-indigo-300 font-mono text-center text-xs py-1.5 outline-none placeholder-white/20"
                        placeholder="b"
                      />
                      <span className="text-xs font-mono font-black text-white/40 mr-1 select-none">y' +</span>

                      <input
                        type="number"
                        value={odeC}
                        onChange={e => setOdeC(e.target.value)}
                        className="w-10 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg text-indigo-300 font-mono text-center text-xs py-1.5 outline-none placeholder-white/20"
                        placeholder="c"
                      />
                      <span className="text-xs font-mono font-black text-indigo-400 select-none">y = 0</span>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'ode2_capsule' ? null : 'ode2_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('ode2_capsule')}
                    </div>
                  </div>
                )}

                {/* SECOND ORDER NON-HOMOGENEOUS EDO */}
                {subTypeOde === 'nonhomogeneous' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      <input
                        type="number"
                        value={odeA}
                        onChange={e => setOdeA(e.target.value)}
                        className="w-10 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg text-indigo-300 font-mono text-center text-xs py-1.5 outline-none"
                        placeholder="a"
                      />
                      <span className="text-xs font-mono font-black text-white/40 mr-1 select-none">y'' +</span>

                      <input
                        type="number"
                        value={odeB}
                        onChange={e => setOdeB(e.target.value)}
                        className="w-10 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg text-indigo-300 font-mono text-center text-xs py-1.5 outline-none"
                        placeholder="b"
                      />
                      <span className="text-xs font-mono font-black text-white/40 mr-1 select-none">y' +</span>

                      <input
                        type="number"
                        value={odeC}
                        onChange={e => setOdeC(e.target.value)}
                        className="w-10 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg text-indigo-300 font-mono text-center text-xs py-1.5 outline-none"
                        placeholder="c"
                      />
                      <span className="text-xs font-mono font-black text-indigo-400 select-none mr-2">y =</span>

                      <input
                        type="text"
                        value={odeQ}
                        onChange={e => setOdeQ(e.target.value)}
                        className="w-24 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-center text-xs text-indigo-300 font-mono font-bold outline-none"
                        placeholder="exp(t)"
                      />
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'ode_nonh_capsule' ? null : 'ode_nonh_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('ode_nonh_capsule')}
                    </div>
                  </div>
                )}

                {/* 2X2 LINEAR ODE SYSTEM */}
                {subTypeOde === 'system' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center font-mono">
                      <span className="text-xl font-serif text-white/45 select-none font-bold">{'{'}</span>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-white/30">x' =</span>
                          <input 
                            type="text" 
                            value={sysA} 
                            onChange={e => setSysA(e.target.value)} 
                            className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-indigo-300 font-bold text-center outline-none" 
                            placeholder="a" 
                          />
                          <span className="text-xs text-white/30">x +</span>
                          <input 
                            type="text" 
                            value={sysB} 
                            onChange={e => setSysB(e.target.value)} 
                            className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-indigo-300 font-bold text-center outline-none" 
                            placeholder="b" 
                          />
                          <span className="text-xs text-white/30">y</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-white/30">y' =</span>
                          <input 
                            type="text" 
                            value={sysC} 
                            onChange={e => setSysC(e.target.value)} 
                            className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-indigo-300 font-bold text-center outline-none" 
                            placeholder="c" 
                          />
                          <span className="text-xs text-white/30">x +</span>
                          <input 
                            type="text" 
                            value={sysD} 
                            onChange={e => setSysD(e.target.value)} 
                            className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-indigo-300 font-bold text-center outline-none" 
                            placeholder="d" 
                          />
                          <span className="text-xs text-white/30">y</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'ode_sys_capsule' ? null : 'ode_sys_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('ode_sys_capsule')}
                    </div>
                  </div>
                )}

                {/* RK4 NUMERICAL ODE SOLVER */}
                {subTypeOde === 'rk4' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex flex-col gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 justify-center font-mono">
                      <span className="text-xs text-white/30 shrink-0">dy/dt =</span>
                      <input 
                        type="text" 
                        value={rkExpr} 
                        onChange={e => setRkExpr(e.target.value)} 
                        className="w-36 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-indigo-300 font-bold text-center outline-none" 
                        placeholder="y - t" 
                      />
                      <span className="text-xs text-white/30 shrink-0 ml-2">y(</span>
                      <input 
                        type="text" 
                        value={rkT0} 
                        onChange={e => setRkT0(e.target.value)} 
                        className="w-10 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-white text-center outline-none" 
                        placeholder="0" 
                      />
                      <span className="text-xs text-white/30 select-none">) =</span>
                      <input 
                        type="text" 
                        value={rkY0} 
                        onChange={e => setRkY0(e.target.value)} 
                        className="w-10 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-white text-center outline-none" 
                        placeholder="2" 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-white/40">Passo h =</span>
                        <input 
                          type="text" 
                          value={rkH} 
                          onChange={e => setRkH(e.target.value)} 
                          className="w-14 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center text-xs text-white outline-none" 
                          placeholder="0.1" 
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-white/40">Iterações N =</span>
                        <input 
                          type="number" 
                          value={rkSteps} 
                          onChange={e => setRkSteps(e.target.value)} 
                          className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 text-center text-xs text-white outline-none" 
                          min="1" 
                          max="20" 
                        />
                      </div>

                      <div className="relative shrink-0">
                        <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'ode_rk4_capsule' ? null : 'ode_rk4_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                          <Menu size={16} className="text-indigo-400" />
                        </button>
                        {renderCapsuleMenu('ode_rk4_capsule')}
                      </div>
                    </div>
                  </div>
                )}

                {/* PERTURBATION THEORY */}
                {subTypeOde === 'perturbation' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center font-mono">
                      <span className="text-xs text-white/30 shrink-0">Equação Perturbada:</span>
                      <input 
                        type="text" 
                        value={pertExpr} 
                        onChange={e => setPertExpr(e.target.value)} 
                        className="w-44 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-indigo-300 font-bold text-center outline-none" 
                        placeholder="y'' + y + e*y^3 = 0" 
                      />
                      <div className="w-[1px] h-6 bg-white/10 mx-1 shrink-0" />
                      <span className="text-xs text-white/30 shrink-0 select-none">Ordem O(ε^n):</span>
                      <select 
                        value={pertOrder} 
                        onChange={e => setPertOrder(e.target.value)} 
                        className="bg-[#141418] border border-white/20 rounded-lg py-1 px-1.5 text-[10px] font-bold text-white outline-none w-16 shrink-0"
                      >
                        <option value="1">1ª Ord.</option>
                        <option value="2">2ª Ord.</option>
                      </select>
                    </div>
                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'ode_pert_capsule' ? null : 'ode_pert_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('ode_pert_capsule')}
                    </div>
                  </div>
                )}

                {/* NON-LINEAR STABILITY AND BIFURCATION */}
                {subTypeOde === 'stability' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center font-mono">
                      <span className="text-xs text-white/30 shrink-0">dx/dt =</span>
                      <input 
                        type="text" 
                        value={stabExpr} 
                        onChange={e => setStabExpr(e.target.value)} 
                        className="w-36 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-indigo-300 font-bold text-center outline-none" 
                        placeholder="mu*x - x^2" 
                      />
                      <div className="w-[1px] h-6 bg-white/10 mx-1 shrink-0" />
                      <span className="text-xs text-white/30 shrink-0 select-none">Parâmetro =</span>
                      <input 
                        type="text" 
                        value={stabParam} 
                        onChange={e => setStabParam(e.target.value)} 
                        className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-white text-center outline-none" 
                        placeholder="mu" 
                      />
                    </div>
                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'ode_stab_capsule' ? null : 'ode_stab_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('ode_stab_capsule')}
                    </div>
                  </div>
                )}

                {/* 1D PDE SOLVERS (HEAT & WAVE EQUATION) */}
                {subTypeOde === 'pde' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex flex-col gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2 shrink-0 border-b border-white/5 pb-2">
                      <span className="text-[8px] font-black uppercase text-indigo-400/50 tracking-wider">Resolução de EDP 1D via Separação de Variáveis</span>
                      <div className="flex gap-1 bg-black/35 border border-white/5 p-0.5 rounded-lg">
                        <button onClick={() => setPdeType('heat')} className={`py-0.5 px-2 rounded-md text-[6.5px] font-bold uppercase transition-all ${pdeType === 'heat' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Calor</button>
                        <button onClick={() => setPdeType('wave')} className={`py-0.5 px-2 rounded-md text-[6.5px] font-bold uppercase transition-all ${pdeType === 'wave' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Onda</button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto py-2 justify-center font-mono">
                      <span className="text-xs text-white/30 shrink-0">
                        {pdeType === 'heat' ? 'u_t = α² * u_xx' : 'u_tt = c² * u_xx'}
                      </span>
                      <div className="w-[1px] h-6 bg-white/10 mx-1 shrink-0" />
                      <span className="text-xs text-white/30 shrink-0 select-none">Comp. L =</span>
                      <input 
                        type="text" 
                        value={pdeL} 
                        onChange={e => setPdeL(e.target.value)} 
                        className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-white text-center outline-none" 
                        placeholder="pi" 
                      />
                      <span className="text-xs text-white/30 shrink-0 select-none">{pdeType === 'heat' ? 'α =' : 'c ='}</span>
                      <input 
                        type="text" 
                        value={pdeType === 'heat' ? pdeAlpha : pdeC} 
                        onChange={e => pdeType === 'heat' ? setPdeAlpha(e.target.value) : setPdeC(e.target.value)} 
                        className="w-10 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-white text-center outline-none" 
                        placeholder="1" 
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                        <span className="text-[9px] font-black uppercase tracking-wider text-white/40">C.I. f(x) =</span>
                        <input 
                          type="text" 
                          value={pdeF} 
                          onChange={e => setPdeF(e.target.value)} 
                          className="flex-1 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 px-2 text-xs text-indigo-300 font-bold outline-none" 
                          placeholder="sin(x)" 
                        />
                      </div>

                      <div className="relative shrink-0 ml-2">
                        <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'ode_pde_capsule' ? null : 'ode_pde_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                          <Menu size={16} className="text-indigo-400" />
                        </button>
                        {renderCapsuleMenu('ode_pde_capsule')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====== CATEGORY 4: STEM APPLICATIONS ====== */}
            {activeTab === 4 && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                {/* Subselector for applications */}
                <div className="grid grid-cols-4 gap-1 bg-black/25 border border-white/5 p-1 rounded-xl shrink-0">
                  {[
                    { id: 'arc', label: 'Comp. Arco' },
                    { id: 'area', label: 'Área Curvas' },
                    { id: 'volume', label: 'Volume Rev.' },
                    { id: 'centroid', label: 'Centroide 2D' },
                    { id: 'inertia', label: 'Inércia/Cent. 3D' },
                    { id: 'variational', label: 'Variacional' },
                    { id: 'special', label: 'Funções Esp.' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSubTypeApp(tab.id);
                        setResult(null);
                        setActiveMenuCapsule(null);
                      }}
                      className={`py-1.5 rounded-lg text-[6px] font-bold uppercase transition-all truncate ${subTypeApp === tab.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ARC LENGTH (COMPRIMENTO DE ARCO DE FUNÇÕES) */}
                {subTypeApp === 'arc' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      <span className="text-xs font-mono text-white/40 select-none">L =</span>
                      
                      {/* Integral with LaTeX side limits */}
                      <div className="flex items-center relative shrink-0">
                        <span className="text-5xl font-light text-indigo-500/80 leading-none select-none">∫</span>
                        <div className="flex flex-col justify-between h-[42px] -ml-1 mr-1 py-0.5 shrink-0">
                          <input 
                            type="text" 
                            value={appArcMax} 
                            onChange={e => setAppArcMax(e.target.value)} 
                            className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center" 
                            placeholder="b" 
                          />
                          <input 
                            type="text" 
                            value={appArcMin} 
                            onChange={e => setAppArcMin(e.target.value)} 
                            className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center" 
                            placeholder="a" 
                          />
                        </div>
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">√</span>
                      <span className="text-xs font-mono text-white/30 mr-1 select-none">[1 + (</span>

                      <div className="flex-1 max-w-[150px]">
                        <input type="text" value={appArcExpr} onChange={e => setAppArcExpr(e.target.value)} className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs font-mono text-indigo-300 font-bold text-center w-full outline-none placeholder-indigo-300/20" placeholder="f(x)" />
                      </div>
                      
                      <span className="text-xs font-mono text-white/30 ml-1 select-none">')²] dx</span>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'arc_capsule' ? null : 'arc_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('arc_capsule')}
                    </div>
                  </div>
                )}

                {/* AREA BETWEEN CURVES */}
                {subTypeApp === 'area' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      <span className="text-xs font-mono text-white/40 select-none">A =</span>
                      
                      {/* Integral with LaTeX side limits */}
                      <div className="flex items-center relative shrink-0">
                        <span className="text-5xl font-light text-indigo-500/80 leading-none select-none">∫</span>
                        <div className="flex flex-col justify-between h-[42px] -ml-1 mr-1 py-0.5 shrink-0">
                          <input 
                            type="text" 
                            value={appAreaMax} 
                            onChange={e => setAppAreaMax(e.target.value)} 
                            className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center" 
                            placeholder="b" 
                          />
                          <input 
                            type="text" 
                            value={appAreaMin} 
                            onChange={e => setAppAreaMin(e.target.value)} 
                            className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center" 
                            placeholder="a" 
                          />
                        </div>
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">|</span>

                      <div className="flex flex-col gap-2 flex-1 max-w-[150px]">
                        <input type="text" value={appAreaF} onChange={e => setAppAreaF(e.target.value)} className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 px-3 text-xs font-mono text-indigo-300 font-bold text-center outline-none" placeholder="f(x)" />
                        <input type="text" value={appAreaG} onChange={e => setAppAreaG(e.target.value)} className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 px-3 text-xs font-mono text-indigo-300 font-bold text-center outline-none" placeholder="g(x)" />
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">|</span>
                      <span className="text-xs font-mono text-white/30">dx</span>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'area_capsule' ? null : 'area_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('area_capsule')}
                    </div>
                  </div>
                )}

                {/* VOLUME OF REVOLUTION */}
                {subTypeApp === 'volume' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      <span className="text-xs font-mono font-black text-white/40 select-none">V = π</span>

                      {/* Integral with LaTeX side limits */}
                      <div className="flex items-center relative shrink-0">
                        <span className="text-5xl font-light text-indigo-500/80 leading-none select-none">∫</span>
                        <div className="flex flex-col justify-between h-[42px] -ml-1 mr-1 py-0.5 shrink-0">
                          <input 
                            type="text" 
                            value={appVolMax} 
                            onChange={e => setAppVolMax(e.target.value)} 
                            className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center" 
                            placeholder="b" 
                          />
                          <input 
                            type="text" 
                            value={appVolMin} 
                            onChange={e => setAppVolMin(e.target.value)} 
                            className="w-7 h-4 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[8px] text-center" 
                            placeholder="a" 
                          />
                        </div>
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">[</span>

                      <div className="flex-1 max-w-[150px]">
                        <input type="text" value={appVolExpr} onChange={e => setAppVolExpr(e.target.value)} className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs font-mono text-indigo-300 font-bold text-center w-full outline-none placeholder-indigo-300/20" placeholder="f(x)" />
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none">]²</span>
                      <span className="text-xs font-mono text-white/30">dx</span>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'volume_capsule' ? null : 'volume_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('volume_capsule')}
                    </div>
                  </div>
                )}

                {/* CENTROID / CENTER OF MASS 2D */}
                {subTypeApp === 'centroid' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      <span className="text-xs font-mono text-white/40 select-none shrink-0">Centroide (x̄, ȳ)</span>
                      <div className="w-[1px] h-6 bg-white/10 mx-2 shrink-0" />
                      
                      <span className="text-xs font-mono text-white/30 shrink-0">f(x) =</span>
                      <input type="text" value={appAreaF} onChange={e => setAppAreaF(e.target.value)} className="w-20 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 px-2.5 text-[10px] font-mono text-indigo-300 font-bold" placeholder="f(x)" />
                      <span className="text-xs font-mono text-white/30 shrink-0 mx-1">-</span>
                      <input type="text" value={appAreaG} onChange={e => setAppAreaG(e.target.value)} className="w-20 bg-transparent border border-white/10 focus:border-indigo-500 rounded-lg py-1 px-2.5 text-[10px] font-mono text-indigo-300 font-bold" placeholder="g(x)" />
                      
                      <div className="flex items-center gap-1 shrink-0 ml-2 border border-white/5 bg-black/20 rounded-xl px-2 py-1">
                        <span className="text-[8px] font-black uppercase text-white/20">de</span>
                        <input type="text" value={appAreaMin} onChange={e => setAppAreaMin(e.target.value)} className="w-8 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[9px] text-center" placeholder="a" />
                        <span className="text-[8px] font-black uppercase text-white/20">a</span>
                        <input type="text" value={appAreaMax} onChange={e => setAppAreaMax(e.target.value)} className="w-8 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-white font-mono text-[9px] text-center" placeholder="b" />
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'centroid_capsule' ? null : 'centroid_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('centroid_capsule')}
                    </div>
                  </div>
                )}

                {/* 3D MOMENTS OF INERTIA / CENTROID */}
                {subTypeApp === 'inertia' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex flex-col gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 justify-center font-mono">
                      <span className="text-xs text-white/30 shrink-0 font-bold">Densidade ρ(x,y,z) =</span>
                      <input 
                        type="text" 
                        value={inertiaDensity} 
                        onChange={e => setInertiaDensity(e.target.value)} 
                        className="w-28 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1 text-xs text-indigo-300 font-bold text-center outline-none" 
                        placeholder="1" 
                      />
                    </div>

                    <div className="bg-[#0a0a0e]/40 border border-white/5 rounded-[30px] p-5 flex flex-col gap-3">
                      <span className="text-[8px] font-black uppercase text-indigo-400/40 tracking-wider">Intervalos de Integração 3D (mín,máx)</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1 text-center">
                          <span className="text-[7px] font-black uppercase text-white/20">Limite x:</span>
                          <input 
                            type="text" 
                            value={inertiaXBounds} 
                            onChange={e => setInertiaXBounds(e.target.value)} 
                            className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-white text-center font-mono outline-none" 
                            placeholder="0,1" 
                          />
                        </div>
                        <div className="flex flex-col gap-1 text-center">
                          <span className="text-[7px] font-black uppercase text-white/20">Limite y:</span>
                          <input 
                            type="text" 
                            value={inertiaYBounds} 
                            onChange={e => setInertiaYBounds(e.target.value)} 
                            className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-white text-center font-mono outline-none" 
                            placeholder="0,1" 
                          />
                        </div>
                        <div className="flex flex-col gap-1 text-center">
                          <span className="text-[7px] font-black uppercase text-white/20">Limite z:</span>
                          <input 
                            type="text" 
                            value={inertiaZBounds} 
                            onChange={e => setInertiaZBounds(e.target.value)} 
                            className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-white text-center font-mono outline-none" 
                            placeholder="0,1" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pr-2">
                      <div className="relative shrink-0">
                        <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'app_inertia_capsule' ? null : 'app_inertia_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                          <Menu size={16} className="text-indigo-400" />
                        </button>
                        {renderCapsuleMenu('app_inertia_capsule')}
                      </div>
                    </div>
                  </div>
                )}

                {/* VARIATIONAL CALCULUS (EULER-LAGRANGE) */}
                {subTypeApp === 'variational' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center font-mono">
                      <span className="text-xs text-white/30 shrink-0 font-bold">Lagrangiana L(x, y, y') =</span>
                      <input 
                        type="text" 
                        value={varExpr} 
                        onChange={e => setVarExpr(e.target.value)} 
                        className="w-48 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-indigo-300 font-bold text-center outline-none" 
                        placeholder="sqrt(1 + dy^2)" 
                      />
                    </div>
                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'app_var_capsule' ? null : 'app_var_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('app_var_capsule')}
                    </div>
                  </div>
                )}

                {/* SPECIAL FUNCTIONS (GAMMA, BETA, LEGENDRE) */}
                {subTypeApp === 'special' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex flex-col gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2 shrink-0 border-b border-white/5 pb-2">
                      <span className="text-[8px] font-black uppercase text-indigo-400/50 tracking-wider">Funções Especiais e Polinômios Ortogonais</span>
                      <select 
                        value={specType} 
                        onChange={e => setSpecType(e.target.value)} 
                        className="bg-[#141418] border border-white/20 rounded-xl py-1 px-3 text-xs text-white outline-none font-bold"
                      >
                        <option value="gamma">Gamma Γ(z)</option>
                        <option value="beta">Beta B(x, y)</option>
                        <option value="legendre">Legendre P_n(x)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto py-2 justify-center font-mono">
                      {specType === 'gamma' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg text-white/40">Γ(</span>
                          <input 
                            type="text" 
                            value={specVal1} 
                            onChange={e => setSpecVal1(e.target.value)} 
                            className="w-16 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-indigo-300 font-bold text-center outline-none" 
                            placeholder="z" 
                          />
                          <span className="text-lg text-white/40">)</span>
                        </div>
                      )}

                      {specType === 'beta' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg text-white/40">B(</span>
                          <input 
                            type="text" 
                            value={specVal1} 
                            onChange={e => setSpecVal1(e.target.value)} 
                            className="w-16 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-indigo-300 font-bold text-center outline-none" 
                            placeholder="x" 
                          />
                          <span className="text-white/35">,</span>
                          <input 
                            type="text" 
                            value={specVal2} 
                            onChange={e => setSpecVal2(e.target.value)} 
                            className="w-16 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-indigo-300 font-bold text-center outline-none" 
                            placeholder="y" 
                          />
                          <span className="text-lg text-white/40">)</span>
                        </div>
                      )}

                      {specType === 'legendre' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-white/30">Ordem n =</span>
                          <input 
                            type="text" 
                            value={specVal1} 
                            onChange={e => setSpecVal1(e.target.value)} 
                            className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-indigo-300 font-bold text-center outline-none" 
                            placeholder="n" 
                          />
                          <span className="text-xs text-white/30 ml-2">Variável x =</span>
                          <input 
                            type="text" 
                            value={specVal2} 
                            onChange={e => setSpecVal2(e.target.value)} 
                            className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-indigo-300 font-bold text-center outline-none" 
                            placeholder="x" 
                          />
                        </div>
                      )}

                      <div className="relative shrink-0 ml-4">
                        <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'app_spec_capsule' ? null : 'app_spec_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                          <Menu size={16} className="text-indigo-400" />
                        </button>
                        {renderCapsuleMenu('app_spec_capsule')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====== CATEGORY 5: COMPLEX / FOURIER ====== */}
            {activeTab === 5 && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                <div className="grid grid-cols-3 gap-1 bg-black/25 border border-white/5 p-1 rounded-xl shrink-0">
                  {[
                    { id: 'cr', label: 'Cauchy-R.' },
                    { id: 'residues', label: 'Resíduos' },
                    { id: 'fourier', label: 'S. Fourier' },
                    { id: 'laplace', label: 'Laplace' },
                    { id: 'fourier_trans', label: 'T. Fourier' },
                    { id: 'conformal', label: 'Conforme' },
                    { id: 'contour', label: 'Contorno ∮' },
                    { id: 'convolution', label: 'Convolução' },
                    { id: 'mellin_frft', label: 'Mellin / FrFT' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSubTypeComplex(tab.id);
                        setResult(null);
                        setActiveMenuCapsule(null);
                      }}
                      className={`py-1.5 rounded-lg text-[6.5px] font-bold uppercase transition-all truncate ${subTypeComplex === tab.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {subTypeComplex === 'cr' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex flex-col gap-3 flex-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400/50">Função Analítica f(z) = u + iv</span>
                      <div className="flex items-center gap-2 overflow-x-auto py-2 justify-center">
                        <span className="text-xs font-mono font-black text-white/30 select-none">f(z) =</span>
                        <div className="flex-1 max-w-[120px]">
                          <input type="text" value={compU} onChange={e => setCompU(e.target.value)} className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-indigo-300 font-mono text-center outline-none w-full" placeholder="u(x,y)" />
                        </div>
                        <span className="text-xs font-mono font-black text-indigo-400 select-none">+ i *</span>
                        <div className="flex-1 max-w-[120px]">
                          <input type="text" value={compV} onChange={e => setCompV(e.target.value)} className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-indigo-300 font-mono text-center outline-none w-full" placeholder="v(x,y)" />
                        </div>
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'cr_capsule' ? null : 'cr_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('cr_capsule')}
                    </div>
                  </div>
                )}

                {subTypeComplex === 'residues' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      <span className="text-xs font-mono font-black text-white/40 mr-2 select-none">f(z) =</span>
                      <div className="flex flex-col items-center justify-center flex-1 max-w-[180px]">
                        <input
                          type="text"
                          value={resNum}
                          onChange={e => setResNum(e.target.value)}
                          className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-center text-xs text-indigo-300 font-mono outline-none w-full"
                          placeholder="▢"
                        />
                        <div className="w-full h-[1.5px] bg-indigo-500/20 my-2" />
                        <input
                          type="text"
                          value={resDen}
                          onChange={e => setResDen(e.target.value)}
                          className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-center text-xs text-indigo-300 font-mono outline-none w-full"
                          placeholder="▢"
                        />
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'res_capsule' ? null : 'res_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('res_capsule')}
                    </div>
                  </div>
                )}

                {subTypeComplex === 'fourier' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-4 justify-between flex-1">
                      <div className="flex-1 flex flex-col gap-2">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Onda de Referência</span>
                        <select value={fourierWave} onChange={e => setFourierWave(e.target.value)} className="bg-[#141418] border border-white/20 rounded-xl py-2 px-3 text-xs text-white outline-none w-full font-bold">
                          <option value="square">Onda Quadrada</option>
                          <option value="sawtooth">Onda Dente de Serra</option>
                          <option value="triangle">Onda Triangular</option>
                        </select>
                      </div>
                      <div className="w-24 flex flex-col gap-2">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Amplitude A</span>
                        <input type="text" value={fourierAmp} onChange={e => setFourierAmp(e.target.value)} className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-center text-indigo-300 outline-none w-full font-mono font-bold" />
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'four_capsule' ? null : 'four_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('four_capsule')}
                    </div>
                  </div>
                )}

                {/* LAPLACE TRANSFORM */}
                {subTypeComplex === 'laplace' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center">
                      <span className="text-xs font-mono text-white/40 select-none shrink-0">L{"{ f(t) }"}(s) =</span>
                      <div className="flex-1 max-w-[200px]">
                        <input 
                          type="text" 
                          value={taylorExpr} 
                          onChange={e => setTaylorExpr(e.target.value)} 
                          className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-indigo-300 font-mono outline-none transition-all w-full text-center placeholder-indigo-300/20" 
                          placeholder="t^2 + exp(2*t)" 
                        />
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'laplace_capsule' ? null : 'laplace_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('laplace_capsule')}
                    </div>
                  </div>
                )}

                {/* FOURIER TRANSFORM */}
                {subTypeComplex === 'fourier_trans' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center font-mono">
                      <span className="text-xs text-white/40 select-none shrink-0">F{"{ f(t) }"}(ω) =</span>
                      <div className="flex-1 max-w-[200px]">
                        <input 
                          type="text" 
                          value={taylorExpr} 
                          onChange={e => setTaylorExpr(e.target.value)} 
                          className="bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-indigo-300 font-mono outline-none transition-all w-full text-center placeholder-indigo-300/20" 
                          placeholder="exp(-t^2)" 
                        />
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'fourier_t_capsule' ? null : 'fourier_t_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('fourier_t_capsule')}
                    </div>
                  </div>
                )}

                {/* CONFORMAL MAPPING */}
                {subTypeComplex === 'conformal' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center font-mono">
                      <span className="text-xs text-white/30 shrink-0">Transformação w = f(z) =</span>
                      <input 
                        type="text" 
                        value={confExpr} 
                        onChange={e => setConfExpr(e.target.value)} 
                        className="w-36 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-indigo-300 font-bold text-center outline-none" 
                        placeholder="z^2" 
                      />
                    </div>
                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'comp_conf_capsule' ? null : 'comp_conf_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('comp_conf_capsule')}
                    </div>
                  </div>
                )}

                {/* COMPLEX CONTOUR INTEGRATION */}
                {subTypeComplex === 'contour' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex flex-col gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 justify-center font-mono">
                      <span className="text-2xl text-indigo-500/80 select-none">∮</span>
                      <div className="flex flex-col items-start gap-0.5 shrink-0 ml-1">
                        <span className="text-[7px] font-black uppercase text-white/35">Caminho |z - z₀| = R</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-white/30">z₀ =</span>
                          <input type="text" value={contCenter} onChange={e => setContCenter(e.target.value)} className="w-8 h-5 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-center text-[10px] text-white outline-none" />
                          <span className="text-[8px] text-white/30 ml-1">R =</span>
                          <input type="text" value={contRadius} onChange={e => setContRadius(e.target.value)} className="w-8 h-5 bg-transparent border border-white/10 focus:border-indigo-500 rounded text-center text-[10px] text-white outline-none" />
                        </div>
                      </div>

                      <span className="text-4xl font-light text-indigo-400/40 select-none ml-2">[</span>
                      <input 
                        type="text" 
                        value={contExpr} 
                        onChange={e => setContExpr(e.target.value)} 
                        className="w-36 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1 text-xs text-indigo-300 font-bold text-center outline-none" 
                        placeholder="1 / (z - 2)" 
                      />
                      <span className="text-4xl font-light text-indigo-400/40 select-none">] dz</span>
                    </div>

                    <div className="flex justify-end pr-2">
                      <div className="relative shrink-0">
                        <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'comp_cont_capsule' ? null : 'comp_cont_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                          <Menu size={16} className="text-indigo-400" />
                        </button>
                        {renderCapsuleMenu('comp_cont_capsule')}
                      </div>
                    </div>
                  </div>
                )}

                {/* SIGNAL CONVOLUTION */}
                {subTypeComplex === 'convolution' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex items-center justify-between gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1 justify-center font-mono">
                      <span className="text-xs text-white/30 shrink-0">(f * g)(t) =</span>
                      <input 
                        type="text" 
                        value={convF} 
                        onChange={e => setConvF(e.target.value)} 
                        className="w-24 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-indigo-300 font-bold text-center outline-none" 
                        placeholder="exp(-t)" 
                      />
                      <span className="text-sm font-bold text-indigo-400 select-none">*</span>
                      <input 
                        type="text" 
                        value={convG} 
                        onChange={e => setConvG(e.target.value)} 
                        className="w-24 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-indigo-300 font-bold text-center outline-none" 
                        placeholder="exp(-2*t)" 
                      />
                    </div>
                    <div className="relative shrink-0">
                      <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'comp_conv_capsule' ? null : 'comp_conv_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                        <Menu size={16} className="text-indigo-400" />
                      </button>
                      {renderCapsuleMenu('comp_conv_capsule')}
                    </div>
                  </div>
                )}

                {/* ADVANCED INTEGRAL TRANSFORMS (MELLIN / FRFT) */}
                {subTypeComplex === 'mellin_frft' && (
                  <div className="bg-[#0c0c11] border border-white/10 rounded-[35px] p-6 shadow-2xl flex flex-col gap-4 w-full relative animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2 shrink-0 border-b border-white/5 pb-2">
                      <span className="text-[8px] font-black uppercase text-indigo-400/50 tracking-wider">Transformações Integrais Avançadas</span>
                      <div className="flex gap-1 bg-black/35 border border-white/5 p-0.5 rounded-lg">
                        <button onClick={() => { setMfMode('mellin'); setMfParam('s'); }} className={`py-0.5 px-2 rounded-md text-[6.5px] font-bold uppercase transition-all ${mfMode === 'mellin' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Mellin</button>
                        <button onClick={() => { setMfMode('frft'); setMfParam('0.5'); }} className={`py-0.5 px-2 rounded-md text-[6.5px] font-bold uppercase transition-all ${mfMode === 'frft' ? 'bg-white/10 text-white' : 'text-white/40'}`}>FrFT</button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto py-2 justify-center font-mono">
                      <span className="text-xs text-white/30 shrink-0">
                        {mfMode === 'mellin' ? 'M{ f(x) }(s) =' : 'F^α{ f(t) } ='}
                      </span>
                      <input 
                        type="text" 
                        value={mfExpr} 
                        onChange={e => setMfExpr(e.target.value)} 
                        className="w-32 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs text-indigo-300 font-bold text-center outline-none" 
                        placeholder="exp(-x)" 
                      />
                      <div className="w-[1px] h-6 bg-white/10 mx-1 shrink-0" />
                      <span className="text-xs text-white/30 shrink-0 select-none">
                        {mfMode === 'mellin' ? 'Var s =' : 'Ordem α ='}
                      </span>
                      <input 
                        type="text" 
                        value={mfParam} 
                        onChange={e => setMfParam(e.target.value)} 
                        className="w-12 bg-transparent border border-white/10 focus:border-indigo-500 rounded-xl py-1 text-xs text-white text-center outline-none" 
                        placeholder={mfMode === 'mellin' ? 's' : '0.5'} 
                      />
                    </div>

                    <div className="flex justify-end pr-2">
                      <div className="relative shrink-0">
                        <button onClick={() => setActiveMenuCapsule(activeMenuCapsule === 'comp_mf_capsule' ? null : 'comp_mf_capsule')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95">
                          <Menu size={16} className="text-indigo-400" />
                        </button>
                        {renderCapsuleMenu('comp_mf_capsule')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          <button
            onClick={handleSolve}
            className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-glow-indigo active:scale-98 mt-6 shrink-0"
          >
            <Play size={14} fill="white" />
            Calcular Analítico
          </button>
        </div>
      </div>
      
      {/* RIGHT COLUMN: DIDACTIC RESOLUTION COCKPIT */}
      <div className="w-1/2 flex flex-col min-h-0 bg-[#0a0a0c]/60 border border-white/5 rounded-[40px] p-6 overflow-hidden relative shadow-inner-soft">
        
        {/* PANEL HEADER & EXPORT NOTE */}
        <div className="flex justify-between items-center shrink-0 border-b border-white/5 pb-3">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Painel Científico</span>
          
          {result && !result.isError && (
            <div className="relative">
              <button
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                className="h-8 px-3 rounded-xl bg-white text-black hover:bg-indigo-50 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md active:scale-95 animate-pulse"
              >
                <Share2 size={12} />
                Exportar
              </button>

              {/* EXPORT OPTIONS POPUP */}
              {isExportDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#16161a] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 p-2 flex flex-col gap-1.5 animate-in zoom-in-95 duration-200">
                  <button
                    onClick={() => handleExportNote(false)}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl text-white text-[10px] font-bold flex items-center gap-2 transition-colors"
                  >
                    <FileText size={12} className="text-indigo-400" />
                    Apenas Resolução Escrita
                  </button>
                  <button
                    onClick={() => handleExportNote(true)}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-500/10 rounded-xl text-indigo-300 text-[10px] font-bold flex items-center gap-2 transition-colors border border-indigo-500/10"
                  >
                    <Sparkles size={12} className="text-indigo-400 animate-pulse" />
                    Passos + Bloco Vivo (Canvas)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RESOLUTION ZONE */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4 mt-4">
          {result ? (
            <div className="flex flex-col gap-5 animate-in fade-in duration-300">
              
              {/* FINAL RESULT BOX */}
              <div className={`p-5 rounded-2xl border ${result.isError ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-indigo-500/5 border-indigo-500/20 text-white'} flex flex-col gap-2 shrink-0`}>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Resultado Simbólico</span>
                <div className="text-xl font-medium overflow-x-auto py-2 custom-scrollbar text-center">
                  <InlineMath math={result.isError ? result.latex : result.result} />
                </div>
              </div>

              {/* Step-by-step proofs */}
              {result.steps && result.steps.length > 0 && (
                <div className="flex flex-col gap-4">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Etapas Logísticas Analíticas</span>
                  
                  {result.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-4 items-stretch group/step">
                      {/* Connection ring */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 text-white/50 text-[9px] font-black flex items-center justify-center group-hover/step:border-indigo-500/50 group-hover/step:text-indigo-400 transition-colors">
                          {idx + 1}
                        </div>
                        {idx < result.steps.length - 1 && <div className="w-[1.5px] bg-white/5 flex-1" />}
                      </div>

                      {/* Content block */}
                      <div className="flex-1 pb-4">
                        <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-indigo-500/10 hover:bg-white/[0.02] flex flex-col gap-3 transition-all duration-300">
                          <span className="text-[9px] font-black text-white/60 uppercase tracking-wide leading-relaxed">{step.label}</span>
                          <div className="text-sm overflow-x-auto py-1 custom-scrollbar text-indigo-200">
                            <InlineMath math={step.latex} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center opacity-20 py-20">
              <Sparkles size={48} className="mb-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Motor de Cálculo Pronto</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CalculusWorkspace;
