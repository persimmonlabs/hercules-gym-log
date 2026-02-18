const fs = require('fs');
const path = require('path');

const programsPath = path.join(__dirname, '../src/data/premadePrograms.json');
const data = JSON.parse(fs.readFileSync(programsPath, 'utf8'));

// Group by goal
const byGoal = {};
data.programs.forEach(p => {
  const goal = p.metadata.goal;
  if (!byGoal[goal]) byGoal[goal] = { free: 0, premium: 0 };
  if (p.isFree) byGoal[goal].free++;
  else byGoal[goal].premium++;
});

// Group by experience level
const byLevel = {};
data.programs.forEach(p => {
  const level = p.metadata.experienceLevel;
  if (!byLevel[level]) byLevel[level] = { free: 0, premium: 0 };
  if (p.isFree) byLevel[level].free++;
  else byLevel[level].premium++;
});

console.log('Distribution by Goal:');
Object.entries(byGoal).forEach(([goal, counts]) => {
  console.log(`  ${goal}: ${counts.free} free, ${counts.premium} premium`);
});

console.log('\nDistribution by Experience Level:');
Object.entries(byLevel).forEach(([level, counts]) => {
  console.log(`  ${level}: ${counts.free} free, ${counts.premium} premium`);
});

// Check if each goal has at least one free plan
console.log('\nFree plan availability per goal:');
let allGoalsHaveFree = true;
Object.entries(byGoal).forEach(([goal, counts]) => {
  const hasFree = counts.free > 0;
  console.log(`  ${goal}: ${hasFree ? '✅' : '❌'}`);
  if (!hasFree) allGoalsHaveFree = false;
});

console.log(`\nAll goals have at least one free plan: ${allGoalsHaveFree ? '✅' : '❌'}`);
