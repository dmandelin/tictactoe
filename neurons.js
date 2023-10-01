class Layer {
    // Row-major order: W[i] is the set of weights to dot with inputs
    // to get output i.
    W = [];
    constructor(m, n) {
        for (let i = 0; i < n; ++i) {
            const Wi = [];
            for (let j = 0; j < m; ++j) {
                Wi.push(1 - 2 * Math.random());
            }
            this.W.push(Wi);
        }
    }
    apply(I) {
        return mul(this.W, I);
    }
    learn(I, e, alpha) {
        for (let i = 0; i < this.W.length; ++i) {
            const Wi = this.W[i];
            for (let j = 0; j < I.length; ++j) {
                Wi[j] -= alpha * e[i] * I[j];
            }
        }
    }
}
function sub(a, b) {
    const v = [];
    for (let i = 0; i < a.length; ++i) {
        v.push(a[i] - b[i]);
    }
    return v;
}
function dot(a, b) {
    let v = 0;
    for (let i = 0; i < a.length; ++i) {
        v += a[i] * b[i];
    }
    return v;
}
function mul(M, x) {
    const v = [];
    for (let i = 0; i < M.length; ++i) {
        v.push(dot(M[i], x));
    }
    return v;
}
function log(a) {
    console.log(a);
}
function testLayer(genExample) {
    const batches = 10;
    const batchSize = 100;
    const m = 3;
    const layer = new Layer(m + 1, 1);
    const alpha = 0.01;
    for (let bi = 0; bi < batches; ++bi) {
        let hits = 0;
        let loss = 0;
        console.log('* Batch', bi + 1);
        for (let ii = 0; ii < batchSize; ++ii) {
            const [I, EO] = genExample();
            // Get result from layer.
            const O = layer.apply(I);
            //console.log(`  - ${I} -> ${O[0].toFixed(4)} (EO = ${EO[0]})`);
            // Compute error and update loss.
            const e = sub(O, EO);
            loss += e[0] * e[0];
            if (Math.sign(O[0]) == Math.sign(EO[0]))
                ++hits;
            // Learn.
            layer.learn(I, e, alpha);
        }
        console.log(`  Acc = ${(hits / batchSize).toFixed(4)}, Loss = ${loss}`);
    }
    console.log('weights: ', layer.W);
}
function testMajority() {
    const m = 3;
    testLayer(() => {
        const I = [1];
        let total = 0;
        for (let j = 0; j < m; ++j) {
            const v = Math.random() < 0.5 ? 0 : 1;
            I.push(v);
            total += v;
        }
        const EO = [total * 2 > m ? 1 : -1];
        return [I, EO];
    });
}
function testParity() {
    const m = 3;
    testLayer(() => {
        const I = [1];
        let total = 0;
        for (let j = 0; j < m; ++j) {
            const v = Math.random() < 0.5 ? 0 : 1;
            I.push(v);
            total += v;
        }
        const EO = [total % 2];
        return [I, EO];
    });
}
testParity();
