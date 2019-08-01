// based on https://git.coolaj86.com/coolaj86/s2-geometry.js/src/branch/master/src/s2geometry.js

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const UINT64_MAX = BigInt('0b1111111111111111111111111111111111111111111111111111111111111111');
const MAX_LEVEL = 29;

function largestVectorComponent(v) {
    const ax = Math.abs(v[0]),
          ay = Math.abs(v[1]),
          az = Math.abs(v[2]);

    if(ax > ay) {
        return ax > az ? 0 : 2;
    } else {
        return ay > az ? 1 : 2;
    }
}

function vectorToFace(v) {
    const f = largestVectorComponent(v);

    return v[f] < 0 ? f + 3 : f;
}

function faceVectorToUV(face, v, uv) {
    switch(face) {
        case 0: uv[0] =  v[1] / v[0]; uv[1] =  v[2] / v[0]; break;
        case 1: uv[0] = -v[0] / v[1]; uv[1] =  v[2] / v[1]; break;
        case 2: uv[0] = -v[0] / v[2]; uv[1] = -v[1] / v[2]; break;
        case 3: uv[0] =  v[2] / v[0]; uv[1] =  v[1] / v[0]; break;
        case 4: uv[0] =  v[2] / v[1]; uv[1] = -v[0] / v[1]; break;
        case 5: uv[0] = -v[1] / v[2]; uv[1] = -v[0] / v[2]; break;
        default: throw new Error('Invalid face');
    }
}

function faceUVToVector(face, uv, v) {
    switch(face) {
        case 0: v[0] = 1;      v[1] = uv[0];  v[2] = uv[1]; break;
        case 1: v[0] = -uv[0]; v[1] = 1;      v[2] = uv[1]; break;
        case 2: v[0] = -uv[0]; v[1] = -uv[1]; v[2] = 1; break;
        case 3: v[0] = -1;     v[1] = -uv[1]; v[2] = -uv[0]; break;
        case 4: v[0] = uv[1];  v[1] = -1;     v[2] = -uv[0]; break;
        case 5: v[0] = uv[1];  v[1] = uv[0];  v[2] = -1; break;
        default: throw new Error('Invalid face: ' + face);
    }
}

function vectorToLatLng(xyz, ll) {
    ll[0] = Math.atan2(xyz[2], Math.sqrt(xyz[0]*xyz[0]+xyz[1]*xyz[1])) * RAD2DEG;
    ll[1] = Math.atan2(xyz[1], xyz[0]) * RAD2DEG;
};

function latLngToXYZ(ll, v) {
    const latRad = ll[0] * DEG2RAD,
          lngRad = ll[1] * DEG2RAD;
    const cosLatRad = Math.cos(latRad);
    v[0] = Math.cos(lngRad) * cosLatRad;
    v[1] = Math.sin(lngRad) * cosLatRad;
    v[2] = Math.sin(latRad);
}

function UVToST(uv, st) {
    function UToS(u) {
        return u >= 0 ? 0.5 * Math.sqrt (1 + 3 * u) : 1 - 0.5 * Math.sqrt (1 - 3 * u);
    }

    st[0] = UToS(uv[0]);
    st[1] = UToS(uv[1]);
}

function STToIJ(st, ij, order) {
    const maxSize = 1 << order;

    function SToI(s) {
        const i = Math.floor(s * maxSize);
        return Math.max(0, Math.min(maxSize - 1, i));
    };

    ij[0] = SToI(st[0]);
    ij[1] = SToI(st[1]);
};


function IJToST(ij, order, offsets, st) {
    const maxSize = (1 << order);
    st[0] = (ij[0] + offsets[0]) / maxSize;
    st[1] = (ij[1] + offsets[1]) / maxSize;
}


function STToUV(st, uv) {
    function singleSTtoUV(st) {
        if(st >= 0.5) {
            return (1 / 3.0) * (4 * st * st - 1);
        } else {
            return (1 / 3.0) * (1 - (4 * ( 1 - st) * (1 - st)));
        }
    }

    uv[0] = singleSTtoUV(st[0]);
    uv[1] = singleSTtoUV(st[1]);
}


function pointToHilbertQuadList(x, y, order, face) {
    const hilbertMap = {
        'a': [[0n,'d'], [1n,'a'], [3n,'b'], [2n,'a']],
        'b': [[2n,'b'], [1n,'b'], [3n,'a'], [0n,'c']],
        'c': [[2n,'c'], [3n,'d'], [1n,'c'], [0n,'b']],
        'd': [[0n,'a'], [3n,'c'], [1n,'d'], [2n,'d']]
    };

    if ('number' !== typeof face) {
        console.warn(new Error("called pointToHilbertQuadList without face value, defaulting to '0'").stack);
    }
    var currentSquare = (face % 2) ? 'd' : 'a';

    let bits = 0n;

    for (var i=order-1; i>=0; i--) {

        var mask = 1<<i;

        var quad_x = x&mask ? 1 : 0;
        var quad_y = y&mask ? 1 : 0;

        var t = hilbertMap[currentSquare][quad_x * 2 + quad_y];

        bits = (bits << 2n) | t[0];

        currentSquare = t[1];
    }

    return bits;
};


function faceIJToId(face, ij, level) {
    const hillbert = pointToHilbertQuadList(ij[0], ij[1], level, face);

    // 3 bits face
    let id = BigInt(face) << 59n;

    // 58 bit max position value
    id |= hillbert << BigInt(59 - 2 * level);

    // 1bit lsb marker
    id |= 1n << BigInt(58 - 2 * level);

    return id;
}

function findLsb(n) {
    for(let i = 0n; i < 64n; i++) {
        if((1n << i) & n)
            return Number(i);
    }
    return -1;
}

function idToLevel(id) {
    return 29 - findLsb(id) / 2;
}

function idToFace(id) {
    return Number((id >> 59n) & 3n);
}

function idToHillbert(id) {
    const lsb = findLsb(id);
    const hillbert = id >> (BigInt(lsb) + 1n);
    return hillbert;
}


function rotateAndFlipQuadrant(n, ij, rx, ry) {
    if(ry == 0) {
        if(rx == 1){
            ij[0] = n - 1 - ij[0];
            ij[1] = n - 1 - ij[1];

        }

        const x = ij[0];
        ij[0] = ij[1];
        ij[1] = x;
    }
}


function idToIJ(id, face, ij) {
    let maxLevel = idToLevel(id);
    let hillbert = idToHillbert(id);

    for(let i = maxLevel - 1; i >= 0; i--) {
        const key = hillbert & 3n;
        const level = maxLevel - i;

        let rx = 0, ry = 0;
        if(key === 1n) {
            ry = 1;
        }
        else if(key === 2n) {
            rx = 1;
            ry = 1;
        }
        else if(key === 3n) {
            rx = 1;
        }

        hillbert = hillbert >> 2n;

        const val = Math.pow(2, level - 1);
        rotateAndFlipQuadrant(val, ij, rx, ry);

        ij[0] += val * rx;
        ij[1] += val * ry;
    }

    if(face % 2 === 1) {
        const x = ij[0];
        ij[0] = ij[1];
        ij[1] = x;
    }

    return ij;
}

class Cell {
    constructor(id) {
        this._id = id;
    }

    get level() {
        return idToLevel(this._id);
    }

    get id() {
        return this._id;
    }

    set id(id) {
        this._id = id;
    }

    set latLng(ll) {
        this.setLatLng(ll);
    }

    get latLng() {
        const face = idToFace(this._id);
        const level = idToLevel(this._id);

        const ij = new Float64Array(2);
        idToIJ(this._id, face, ij);

        const st = new Float64Array(2);
        IJToST(ij, level, [0.5, 0.5], st);

        const uv = new Float64Array(2);
        STToUV(st, uv);

        const v = new Float64Array(3);
        faceUVToVector(face, uv, v);

        const latLng = new Float64Array(2);
        vectorToLatLng(v, latLng);

        return latLng;
    }

    setLatLng(ll, level = 29) {
        const v = new Float64Array(3);
        latLngToXYZ(ll, v);

        const face = vectorToFace(v);

        const uv = new Float64Array(2);
        faceVectorToUV(face, v, uv);

        const st = new Float64Array(2);
        UVToST(uv, st);

        const ij = new Float64Array(2);
        STToIJ(st, ij, level);

        this._id = faceIJToId(face, ij, level);
    }

    min(level = 12) {
        const mask = (UINT64_MAX << BigInt(60 - level * 2)) & UINT64_MAX;
        const end = 1n << BigInt(59 - level * 2);
        const min = (this._id & mask) | end;
        return min;
    }

    max(level = 12) {
        const end = (UINT64_MAX >> BigInt(level * 2 + 5)) & UINT64_MAX;
        const max = this._id | end;
        return max;
    }

    static fromLatLng(ll, level = 29) {
        const cell = new Cell();
        cell.setLatLng(ll, level);
        return cell;
    }

    /*
     * finds a cell that englobes all points
     * rather slow, it's a brute force algorithm so don't abuse
     */
    static fromLatLngs(lls) {
        const cells = lls.map(Cell.fromLatLng);

        function allMinsEqual(lls, level) {
            let min = cells[0].min(level);

            for(let i = 1; i < lls.length; i++) {
                if(min !== cells[i].min(level))
                    return false;
            }

            return min;
        }

        for(let level = MAX_LEVEL; level > 0; level--) {
            const min = allMinsEqual(cells, level);
            if(min !== false) {
                return new Cell(min);
            }
        }
    }
};

module.exports = Cell;
