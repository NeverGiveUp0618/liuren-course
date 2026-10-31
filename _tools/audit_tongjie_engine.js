/* 《大六壬通解》案例批量复盘桥：从 stdin 收 JSON，用站内 engine.js 复排三传。 */
'use strict';
const fs = require('fs');
const path = require('path');
require(path.join(__dirname, '..', 'engine.js'));

const E = globalThis.LiurenEngine;
const input = JSON.parse(fs.readFileSync(0, 'utf8') || '[]');
if (!Array.isArray(input)) {
  throw new TypeError('stdin 必须是案例数组');
}
const output = input.map(x => {
  const r = E.qike(x.rgz, x.yj, x.zs);
  if (!r) return { id: x.id, error: '起课参数不合法' };
  return {
    id: x.id,
    chuan: r.chuan.join(''),
    ke: r.ke,
    ge: r.ge || '',
    offset: r.off
  };
});
process.stdout.write(JSON.stringify(output));
