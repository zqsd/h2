const assert = require('assert');

function b64(b) {
    const s = b.toString(2);
    return '0'.repeat(64 - s.length) + s;
}

function roundLatLng(latLng, precision = 6) {
    return [
        Math.round(latLng[0] * 1e6) / 1e6,
        Math.round(latLng[1] * 1e6) / 1e6,
    ];
}

describe('Cell', () => {
    const Cell = require('../Cell');

    describe('#fromLatLng()', () => {
        it('should encode max level number', () => {
            const cell = Cell.fromLatLng([43.604448, 3.887772]);
            assert.equal(cell.level, 29);
            assert.equal(b64(cell.id), '0000010010101101101010111110011000110001010010100011000010011101');
        });

        it('should encode at specific level', () => {
            const cell = Cell.fromLatLng([43.604448, 3.887772], 13);
            assert.equal(cell.level, 13);
            assert.equal(b64(cell.id), '0000010010101101101010111110011100000000000000000000000000000000');
        });

        it('should decode max level cell', () => {
            const cell = new Cell(BigInt('0b0000010010101101101010111110011000110001010010100011000010011101'));
            //const cell = Cell.fromLatLng([43.604448, 3.887772]);
            assert.equal(cell.level, 29);
            assert.equal(JSON.stringify(roundLatLng(cell.latLng)), '[43.604448,3.887772]');
        });
    });

    describe('#fromLatLngs()', () => {
        it('should find englobing cell', () => {
            const cell = Cell.fromLatLngs([ [ 42.831317, -2.700071 ], [ 42.832909, -2.699551 ] ]);
            assert.equal(cell.level, 7);
        });
    });
});
