// A simple file for testing the self-improvement engine.

function highComplexityFunction(a, b, c) {
    if (a > 0) {
        if (b > 0) {
            if (c > 0) {
                return 1;
            } else {
                return 2;
            }
        } else {
            if (c > 5) {
                return 3;
            }
        }
    } else {
        if (b < 0) {
            return 4;
        }
    }
    return 0;
}

console.log(highComplexityFunction(1, 2, 3));
