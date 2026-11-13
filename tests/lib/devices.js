// The screens the site is checked on. Sizes are CSS pixels (what the page sees).
// Add a device here and every check runs on it.
const touch = (w, h, dpr = 2.6) => ({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
const desk = (w, h) => ({ viewport: { width: w, height: h } });

module.exports = {
  'fold-cover':   { ...touch(344, 882, 3),  kind: 'phone',  note: 'Galaxy Z Fold, folded (cover screen)' },
  'phone':        { ...touch(390, 844, 3),  kind: 'phone',  note: 'iPhone 13 / typical phone' },
  'fold-open':    { ...touch(884, 1104),    kind: 'tablet', note: 'Galaxy Z Fold, open, upright' },
  'fold-land':    { ...touch(1104, 884),    kind: 'tablet', note: 'Galaxy Z Fold, open, on its side' },
  'ipad':         { ...touch(834, 1194, 2), kind: 'tablet', note: 'iPad Pro 11, upright' },
  'laptop':       { ...desk(1366, 768),     kind: 'desk',   note: 'Small laptop' },
  'stuart':       { ...desk(1908, 950),     kind: 'desk',   note: "Stuart's usual browser window" },
  'qhd':          { ...desk(2560, 1440),    kind: 'desk',   note: 'Large monitor' },
  '4k':           { ...desk(3840, 2160),    kind: 'desk',   note: '4K monitor' },
};
