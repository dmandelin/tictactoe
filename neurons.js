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
const layer = new Layer(6, 1);
console.log(layer.W);
const I = [1, 1, 0, 1, 0, 1];
const O = layer.apply(I);
console.log(O);
