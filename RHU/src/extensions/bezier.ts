(function() {
    
    const RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module(new Error(), "x-rhu/bezier", 
        {},
        function()
        {
            // Implementation adapted from https://github.com/gre/bezier-easing/blob/master/src/index.js

            let NEWTON_ITERATIONS = 4;
            let NEWTON_MIN_SLOPE = 0.001;
            let SUBDIVISION_PRECISION = 0.0000001;
            let SUBDIVISION_MAX_ITERATIONS = 10;

            let kSplineTableSize = 11;
            let kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

            let float32ArraySupported = typeof Float32Array === 'function';

            let A = function(aA1: number, aA2: number) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; };
            let B = function(aA1: number, aA2: number) { return 3.0 * aA2 - 6.0 * aA1; };
            let C = function(aA1: number)      { return 3.0 * aA1; };

            // Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
            let calcBezier = function(aT: number, aA1: number, aA2: number) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT; };

            // Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
            let getSlope = function(aT: number, aA1: number, aA2: number) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1); };

            let binarySubdivide = function(aX: number, aA: number, aB: number, mX1: number, mX2: number) 
            {
                let currentX, currentT, i = 0;
                do 
                {
                    currentT = aA + (aB - aA) / 2.0;
                    currentX = calcBezier(currentT, mX1, mX2) - aX;
                    if (currentX > 0.0) aB = currentT;
                    else aA = currentT;
                } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
                return currentT;
            };

            let newtonRaphsonIterate = function(aX: number, aGuessT: number, mX1: number, mX2: number) 
            {
                for (let i = 0; i < NEWTON_ITERATIONS; ++i) 
                {
                    let currentSlope = getSlope(aGuessT, mX1, mX2);
                    if (currentSlope === 0.0) return aGuessT;
                    let currentX = calcBezier(aGuessT, mX1, mX2) - aX;
                    aGuessT -= currentX / currentSlope;
                }
                return aGuessT;
            };

            let LinearEasing = function(x: number) { return x; };

            return function(x0: number = 0, y0: number = 0, x1: number = 0, y1: number = 0)
            {
                if (x0 < 0) x0 = 0;
                else if (x0 > 1) x0 = 1;
                if (x1 < 0) x1 = 0;
                else if (x1 > 1) x1 = 1;
            
                if (x0 === y0 && x1 === y1) return LinearEasing;

                let sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
                for (let i = 0; i < kSplineTableSize; ++i)
                    sampleValues[i] = calcBezier(i * kSampleStepSize, x0, x1);

                let getTForX = function(aX: number) 
                {
                    let intervalStart = 0.0;
                    let currentSample = 1;
                    let lastSample = kSplineTableSize - 1;

                    for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) 
                        intervalStart += kSampleStepSize;
                    --currentSample;

                    // Interpolate to provide an initial guess for t
                    let dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
                    let guessForT = intervalStart + dist * kSampleStepSize;

                    let initialSlope = getSlope(guessForT, x0, x1);
                    if (initialSlope >= NEWTON_MIN_SLOPE) 
                        return newtonRaphsonIterate(aX, guessForT, x0, x1);
                    else if (initialSlope === 0.0) 
                        return guessForT;
                    else 
                        return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, x0, x1);
                };

                return function(x: number) {
                    // Because JavaScript number are imprecise, we should guarantee the extremes are right.
                    if (x === 0 || x === 1)
                        return x;
                    return calcBezier(getTForX(x), y0, y1);
                };
            };
        }
    );

})();