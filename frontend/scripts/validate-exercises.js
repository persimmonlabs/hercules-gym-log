const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'data', 'exercises.json');

const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let total = 0;
let exact = 0;
let near = 0;
let outOfRange = 0;
const issues = [];

for (const ex of data) {
  total += 1;
  const muscles = ex.muscles || {};
  const values = Object.values(muscles);

  const sum = values.reduce((acc, v) => acc + v, 0);
  const diff = Math.abs(sum - 1);

  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  const record = {
    id: ex.id,
    name: ex.name,
    sum: Number(sum.toFixed(6)),
    diff: Number(diff.toExponential(3)),
    min: Number(min.toFixed(6)),
    max: Number(max.toFixed(6)),
  };

  if (values.some((v) => v < 0 || v > 1)) {
    record.issue = 'value_out_of_bounds';
    issues.push(record);
    outOfRange += 1;
    continue;
  }

  if (diff <= 1e-6) {
    exact += 1;
  } else if (diff <= 1e-3) {
    near += 1;
  } else {
    outOfRange += 1;
    record.issue = 'sum_not_1';
    issues.push(record);
  }
}

console.log('Total exercises:', total);
console.log('Exact sum=1.000000:', exact);
console.log('Within 0.001 of 1.0:', near);
console.log('Outside 0.001 tolerance:', outOfRange);

if (issues.length) {
  console.log('\nIssues:');
  for (const issue of issues) {
    console.log(JSON.stringify(issue));
  }
} else {
  console.log('\nNo exercises with weight sums outside tolerance or values out of [0,1].');
}
