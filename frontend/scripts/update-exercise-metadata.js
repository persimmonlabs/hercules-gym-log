/**
 * Script to add push_pull and upper_lower classification to exercises.json
 * Run with: node scripts/update-exercise-metadata.js
 */

const fs = require('fs');
const path = require('path');

// Movement pattern to push/pull mapping
const PUSH_PATTERNS = ['Horizontal Push', 'Vertical Push', 'Knee Extension'];
const PULL_PATTERNS = ['Horizontal Pull', 'Vertical Pull', 'Knee Flexion'];

// Upper body muscles (including core)
const UPPER_MUSCLES = [
  // Chest
  'Upper Chest', 'Mid Chest', 'Lower Chest',
  // Back
  'Lats', 'Mid Back', 'Upper Back', 'Lower Back',
  // Shoulders
  'Front Delts', 'Lateral Delts', 'Rear Delts',
  // Arms
  'Biceps - Long Head', 'Biceps - Short Head', 'Brachialis',
  'Triceps - Long Head', 'Triceps - Lateral Head', 'Triceps - Medial Head',
  'Flexors', 'Extensors',
  // Core
  'Upper Abs', 'Lower Abs', 'Obliques'
];

// Lower body muscles
const LOWER_MUSCLES = [
  'Quads', 'Hamstrings', 'Glutes',
  'Calves - Medial Head', 'Calves - Lateral Head', 'Soleus',
  'Adductors', 'Abductors'
];

function getPushPull(movementPattern) {
  if (!movementPattern) return null;
  if (PUSH_PATTERNS.includes(movementPattern)) return 'push';
  if (PULL_PATTERNS.includes(movementPattern)) return 'pull';
  return null;
}

function getUpperLower(muscles) {
  if (!muscles || Object.keys(muscles).length === 0) return null;

  let upperSum = 0;
  let lowerSum = 0;

  for (const [muscle, weight] of Object.entries(muscles)) {
    if (UPPER_MUSCLES.includes(muscle)) {
      upperSum += weight;
    } else if (LOWER_MUSCLES.includes(muscle)) {
      lowerSum += weight;
    }
  }

  // If no muscles matched either category, return null
  if (upperSum === 0 && lowerSum === 0) return null;

  return upperSum >= lowerSum ? 'upper' : 'lower';
}

// Main execution
const exercisesPath = path.join(__dirname, '../src/data/exercises.json');
const exercises = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'));

let pushCount = 0, pullCount = 0, nullPushPull = 0;
let upperCount = 0, lowerCount = 0, nullUpperLower = 0;

const updatedExercises = exercises.map(exercise => {
  const pushPull = getPushPull(exercise.movement_pattern);
  const upperLower = getUpperLower(exercise.muscles);

  // Track stats
  if (pushPull === 'push') pushCount++;
  else if (pushPull === 'pull') pullCount++;
  else nullPushPull++;

  if (upperLower === 'upper') upperCount++;
  else if (upperLower === 'lower') lowerCount++;
  else nullUpperLower++;

  return {
    ...exercise,
    push_pull: pushPull,
    upper_lower: upperLower
  };
});

// Write back to file
fs.writeFileSync(exercisesPath, JSON.stringify(updatedExercises, null, 2));

console.log('✅ Updated exercises.json with push_pull and upper_lower fields');
console.log('\n📊 Statistics:');
console.log(`  Push/Pull: ${pushCount} push, ${pullCount} pull, ${nullPushPull} neither`);
console.log(`  Upper/Lower: ${upperCount} upper, ${lowerCount} lower, ${nullUpperLower} unclassified`);
