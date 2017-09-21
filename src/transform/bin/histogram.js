const assign = require('lodash/assign');
const each = require('lodash/each');
const forIn = require('lodash/forIn');
const pick = require('lodash/pick');
const partition = require('../../util/partition');
const {
  registerTransform
} = require('../../data-set');

const DEFAULT_OPTIONS = {
  as: [ 'x', 'count' ],
  bins: 30,
  offset: 0,
  groupBy: []
  // field: '', // required
  // binWidth: 10, // override bins
};

function nearestBin(value, scale, offset) {
  const temp = value - offset;
  const div = Math.floor(temp / scale);
  return [ div * scale + offset, (div + 1) * scale + offset ];
}

function transform(dataView, options) {
  options = assign({}, DEFAULT_OPTIONS, options);
  const field = options.field;
  if (!field) {
    throw new TypeError('Invalid option: field');
  }
  const range = dataView.range(field);
  const width = range[1] - range[0];
  let binWidth = options.binWidth;
  if (!binWidth) {
    const bins = options.bins;
    if (bins <= 0) {
      throw new TypeError('Invalid option: bins');
    }
    binWidth = width / bins;
  }
  const offset = options.offset % binWidth;

  // grouping
  const rows = [];
  const groupBy = options.groupBy;
  const groups = partition(dataView.rows, groupBy);
  forIn(groups, group => {
    const bins = {};
    const column = group.map(row => row[field]);
    each(column, value => {
      const [ x0, x1 ] = nearestBin(value, binWidth, offset);
      const binKey = `${x0}-${x1}`;
      bins[binKey] = bins[binKey] || {
        x0,
        x1,
        count: 0
      };
      bins[binKey].count ++;
    });
    const [ asX, asCount ] = options.as;
    if (!asX || !asCount) {
      throw new TypeError('Invalid option: as');
    }

    const meta = pick(group[0], groupBy);
    forIn(bins, bin => {
      const row = assign({}, meta);
      row[asX] = [ bin.x0, bin.x1 ];
      row[asCount] = bin.count;
      rows.push(row);
    });
  });
  dataView.rows = rows;
}

registerTransform('bin.histogram', transform);
registerTransform('bin.dot', transform);
