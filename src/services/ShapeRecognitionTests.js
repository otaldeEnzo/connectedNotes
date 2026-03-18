
import { fitGeometry } from './ShapeRecognitionService';

export const runShapeTests = () => {
    console.group('🔷 Comprehensive Shape Recognition Logic Tests');

    const testCases = [
        {
            name: 'Circle',
            type: 'circle',
            points: Array.from({ length: 20 }, (_, i) => {
                const t = (i / 20) * Math.PI * 2;
                return { x: 100 + 50 * Math.cos(t), y: 100 + 50 * Math.sin(t) };
            }),
            expectedType: 'circle'
        },
        {
            name: 'Ellipse',
            type: 'ellipse',
            points: Array.from({ length: 20 }, (_, i) => {
                const t = (i / 20) * Math.PI * 2;
                return { x: 200 + 80 * Math.cos(t), y: 150 + 40 * Math.sin(t) };
            }),
            expectedType: 'ellipse'
        },
        {
            name: 'Rectangle',
            type: 'rectangle',
            points: [
                { x: 10, y: 10 }, { x: 110, y: 10 }, { x: 110, y: 60 }, { x: 10, y: 60 }, { x: 10, y: 10 }
            ],
            expectedType: 'rectangle'
        },
        {
            name: 'Right Triangle',
            type: 'triangle',
            points: [
                { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }, { x: 0, y: 0 }
            ],
            expectedType: 'triangle'
        },
        {
            name: 'Equilateral Triangle',
            type: 'triangle',
            points: [
                { x: 50, y: 0 }, { x: 100, y: 86.6 }, { x: 0, y: 86.6 }, { x: 50, y: 0 }
            ],
            expectedType: 'triangle'
        },
        {
            name: 'Diamond',
            type: 'diamond',
            points: [
                { x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 }, { x: 50, y: 0 }
            ],
            expectedType: 'diamond'
        },
        {
            name: 'Pentagon',
            type: 'pentagon',
            points: [
                { x: 50, y: 0 }, { x: 100, y: 38 }, { x: 81, y: 100 }, { x: 19, y: 100 }, { x: 0, y: 38 }, { x: 50, y: 0 }
            ],
            expectedSides: 5,
            expectedType: 'pentagon'
        },
        {
            name: 'Hexagon',
            type: 'hexagon',
            points: [
                { x: 75, y: 0 }, { x: 125, y: 25 }, { x: 125, y: 75 }, { x: 75, y: 100 }, { x: 25, y: 75 }, { x: 25, y: 25 }, { x: 75, y: 0 }
            ],
            expectedSides: 6,
            expectedType: 'hexagon'
        },
        {
            name: 'Octagon',
            type: 'octagon',
            points: [
                { x: 30, y: 0 }, { x: 70, y: 0 }, { x: 100, y: 30 }, { x: 100, y: 70 }, { x: 70, y: 100 }, { x: 30, y: 100 }, { x: 0, y: 70 }, { x: 0, y: 30 }, { x: 30, y: 0 }
            ],
            expectedSides: 8,
            expectedType: 'octagon'
        },
        {
            name: 'Line',
            type: 'line',
            points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
            expectedType: 'line'
        },
        {
            name: 'Arrow',
            type: 'arrow',
            points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
            expectedType: 'arrow'
        },
        {
            name: 'Arc',
            type: 'arc',
            points: Array.from({ length: 10 }, (_, i) => {
                const t = (i / 10) * Math.PI;
                return { x: 50 + 50 * Math.cos(t), y: 50 + 50 * Math.sin(t) };
            }),
            expectedType: 'arc'
        },
        {
            name: 'Bracket',
            type: 'bracket',
            points: [{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 100, y: 50 }],
            expectedType: 'bracket'
        },
        {
            name: 'Checkmark',
            type: 'checkmark',
            points: [{ x: 0, y: 10 }, { x: 10, y: 20 }, { x: 30, y: 0 }],
            expectedType: 'checkmark'
        },
        {
            name: 'Cross',
            type: 'cross',
            points: [{ x: 0, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }, { x: 20, y: 0 }],
            expectedType: 'cross'
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(test => {
        console.group(`Test: ${test.name}`);
        try {
            const result = fitGeometry(test.type, test.points);

            let isSuccess = true;
            let failReason = '';

            if (!result) {
                isSuccess = false;
                failReason = 'Returned null';
            } else {
                if (test.expectedType === 'polygon' && result.type !== 'polygon') {
                    // Accept specific polygon types too
                    const polyTypes = ['pentagon', 'hexagon', 'octagon', 'rectangle', 'diamond'];
                    if (!polyTypes.includes(result.type)) {
                        isSuccess = false;
                        failReason = `Expected type 'polygon', got '${result.type}'`;
                    }
                } else if (result.type !== test.expectedType) {
                    // Special case for rectangle/square
                    if (test.expectedType === 'rectangle' && result.type === 'rectangle') {
                        // OK
                    } else {
                        isSuccess = false;
                        failReason = `Expected type '${test.expectedType}', got '${result.type}'`;
                    }
                }

                if (test.expectedSides && result.sides && result.sides !== test.expectedSides) {
                    isSuccess = false;
                    failReason = `Expected ${test.expectedSides} sides, got ${result.sides}`;
                }
            }

            if (isSuccess) {
                console.log('%c PASS ', 'background: #22c55e; color: #fff', result);
                passed++;
            } else {
                console.error('%c FAIL ', 'background: #ef4444; color: #fff', failReason, result);
                failed++;
            }

        } catch (err) {
            console.error('Test Exception:', err);
            failed++;
        }
        console.groupEnd();
    });

    console.log(`%c RESULTS: ${passed} Passed, ${failed} Failed `, 'font-weight: bold; font-size: 14px');
    console.groupEnd();
};
