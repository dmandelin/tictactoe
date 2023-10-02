class Visualizer {
    layer;
    // idea:
    // - show box per unit
    // - set input and see values, errors, and learning in each layer
    // - visualize coefficients as line color/width/etc
    // - click on a unit to see its coefficients
    unitSide = 48;
    unitGap = 24;
    layerGap = this.unitSide * 3;
    svg;
    inputs = [];
    outputs = [];
    links = [];
    linkLabels = [];
    constructor(layer) {
        this.layer = layer;
        const height = (this.unitGap + this.unitSide) * layer.m - this.unitGap + 2;
        this.svg = appendToId(createSvg('svg', {
            'width': this.unitSide * 2 + this.layerGap + 2,
            'height': height,
        }), 'vis');
        // Input layer
        let x = 1;
        let y = 1;
        for (let i = 0; i < layer.m; ++i) {
            this.inputs.push(appendTo(createSvg('rect', {
                'x': x, 'y': y, 'width': this.unitSide, 'height': this.unitSide,
                'stroke': '#222', 'fill': '#dee',
            }), this.svg));
            y += this.unitSide + this.unitGap;
        }
        // Output layer
        let olh = (this.unitGap + this.unitSide) * layer.n - this.unitGap;
        x += this.unitSide + this.layerGap;
        y = (height - olh) / 2;
        for (let i = 0; i < layer.n; ++i) {
            this.outputs.push(appendTo(createSvg('rect', {
                'x': x, 'y': y, 'width': this.unitSide, 'height': this.unitSide,
                'stroke': '#222', 'fill': '#eed',
            }), this.svg));
            y += this.unitSide + this.unitGap;
        }
        // Links
        for (let i = 0; i < layer.n; ++i) {
            const outputLinks = [];
            const outputLinkLabels = [];
            for (let j = 0; j < layer.m; ++j) {
                const x1 = Number(this.inputs[j].getAttribute('x')) + this.unitSide;
                const y1 = Number(this.inputs[j].getAttribute('y')) + this.unitSide / 2;
                const x2 = Number(this.outputs[i].getAttribute('x'));
                const y2 = Number(this.outputs[i].getAttribute('y')) + this.unitSide / 2;
                outputLinks.push(appendTo(createSvg('line', { x1, y1, x2, y2, stroke: '#666' }), this.svg));
                appendTo(createSvg('rect', {
                    x: x1 + this.unitSide * 0.25 - 2,
                    y: y1 - 13,
                    width: 32,
                    height: 14,
                    fill: '#fff',
                }), this.svg);
                outputLinkLabels.push(appendTo(createSvg('text', {
                    x: x1 + this.unitSide * 0.25,
                    y: y1,
                    'font-family': 'sans-serif',
                    'font-size': '12px',
                }, layer.W[i][j].toFixed(2)), this.svg));
            }
            this.links.push(outputLinks);
            this.linkLabels.push(outputLinkLabels);
        }
    }
}
function createSvg(tagName, attrs = {}, innerText) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    for (const [k, v] of Object.entries(attrs)) {
        e.setAttribute(k, String(v));
    }
    if (innerText)
        e.innerHTML = innerText;
    return e;
}
function appendTo(child, parent) {
    parent.appendChild(child);
    return child;
}
function appendToId(child, parentId) {
    document.getElementById(parentId).appendChild(child);
    return child;
}
class Layer {
    m;
    n;
    // Row-major order: W[i] is the set of weights to dot with inputs
    // to get output i.
    W = [];
    constructor(m, n) {
        this.m = m;
        this.n = n;
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
const vis = new Visualizer(new Layer(4, 1));
testParity();
