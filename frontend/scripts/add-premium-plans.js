const fs = require('fs');
const path = require('path');

// Read premadePrograms.json
const programsPath = path.join(__dirname, '../src/data/premadePrograms.json');
const data = JSON.parse(fs.readFileSync(programsPath, 'utf8'));

// Plans that should be FREE (entry points for each category)
const freePlans = new Set([
  // All beginner plans are free
  'ppl-beginner',
  'full-body-2day',
  'upper-lower-beginner',
  'bodyweight-hypertrophy',
  'starting-strength',
  'fat-loss-beginner',
  'bodyweight-fat-loss',
  'dumbbell-fitness',
  'beginner-machine-program',
  'minimalist-strength',
  
  // One intermediate per goal (free tier representative)
  'ppl-intermediate',           // build-muscle intermediate
  'strength-intermediate',      // strength intermediate
  'fat-loss-intermediate',      // lose-fat intermediate
  'general-fitness-intermediate', // general-fitness intermediate
  
  // One advanced per goal (premium but representative)
  'ppl-advanced',               // build-muscle advanced
  'strength-advanced',          // strength advanced
  'athletic-performance-program', // general-fitness advanced
]);

// Add isFree field to all programs
data.programs = data.programs.map(program => ({
  ...program,
  isFree: freePlans.has(program.id),
}));

// Write back to file
fs.writeFileSync(programsPath, JSON.stringify(data, null, 2) + '\n');

console.log('✅ Added isFree field to all premade plans');
console.log(`Free plans: ${freePlans.size}`);
console.log(`Premium plans: ${data.programs.length - freePlans.size}`);

// Verify distribution
const byExperience = {};
data.programs.forEach(p => {
  const level = p.metadata.experienceLevel;
  if (!byExperience[level]) byExperience[level] = { free: 0, premium: 0 };
  if (p.isFree) byExperience[level].free++;
  else byExperience[level].premium++;
});

console.log('\nDistribution by experience level:');
Object.entries(byExperience).forEach(([level, counts]) => {
  console.log(`  ${level}: ${counts.free} free, ${counts.premium} premium`);
});
