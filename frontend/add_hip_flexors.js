const fs = require('fs');
const path = require('path');

// Read exercises.json
const exercisesPath = path.join(__dirname, 'src/data/exercises.json');
const exercises = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'));

// Define exercises that should have hip flexor weightings added
// Format: { name: string, hipFlexorWeight: number, musclestoReduce: string[] }
const exercisesToUpdate = [
  // Leg Press variations - 0.02 hip flexor (leg flexion)
  { name: 'Leg Press', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes', 'Hamstrings'] },
  { name: 'V-Squat Machine', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Hack Squat Machine', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  
  // Leg Extensions - 0.03 hip flexor (direct leg flexion)
  { name: 'Leg Extensions', hipFlexorWeight: 0.03, musclestoReduce: ['Quads'] },
  
  // Leg Curls - 0.01 hip flexor (minor hip flexion involvement)
  { name: 'Seated Leg Curl', hipFlexorWeight: 0.01, musclestoReduce: ['Hamstrings'] },
  { name: 'Lying Leg Curl', hipFlexorWeight: 0.01, musclestoReduce: ['Hamstrings'] },
  
  // Squat variations - 0.02 hip flexor (leg flexion at bottom of movement)
  { name: 'Barbell Squat', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Dumbbell Squat', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Goblet Squat', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Smith Machine Squat', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  
  // Step-ups and similar - 0.02 hip flexor (leg flexion)
  { name: 'Dumbbell Step-ups', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Barbell Step-ups', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Box Jumps', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes', 'Calves'] },
  
  // Calf raises - 0.01 hip flexor (minor stability)
  { name: 'Standing Calf Raise Machine', hipFlexorWeight: 0.01, musclestoReduce: ['Calves - Medial Head', 'Calves - Lateral Head'] },
  { name: 'Seated Calf Raises', hipFlexorWeight: 0.01, musclestoReduce: ['Soleus'] },
  { name: 'Dumbbell Calf Raises', hipFlexorWeight: 0.01, musclestoReduce: ['Calves - Medial Head', 'Calves - Lateral Head'] },
  
  // Hip thrusts and glute bridges - 0.02 hip flexor (hip extension/flexion control)
  { name: 'Barbell Hip Thrust', hipFlexorWeight: 0.02, musclestoReduce: ['Glutes', 'Hamstrings'] },
  { name: 'Dumbbell Hip Thrust', hipFlexorWeight: 0.02, musclestoReduce: ['Glutes', 'Hamstrings'] },
  { name: 'Barbell Glute Bridge', hipFlexorWeight: 0.02, musclestoReduce: ['Glutes', 'Hamstrings'] },
  
  // Planks and isometric core - 0.02 hip flexor (stability)
  { name: 'Plank', hipFlexorWeight: 0.02, musclestoReduce: ['Upper Abs', 'Lower Abs'] },
  { name: 'Side Plank', hipFlexorWeight: 0.02, musclestoReduce: ['Obliques'] },
  
  // Compound movements with leg involvement - 0.01 hip flexor (minor)
  { name: 'Barbell Clean', hipFlexorWeight: 0.01, musclestoReduce: ['Quads', 'Glutes', 'Hamstrings'] },
  { name: 'Barbell Clean and Jerk', hipFlexorWeight: 0.01, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Barbell Snatch', hipFlexorWeight: 0.01, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Dumbbell Snatch', hipFlexorWeight: 0.01, musclestoReduce: ['Quads', 'Glutes'] },
  
  // Farmer carries and loaded carries - 0.01 hip flexor (stability)
  { name: 'Farmer Carries', hipFlexorWeight: 0.01, musclestoReduce: ['Traps', 'Forearms'] },
  { name: 'Sled Push', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Sled Pull', hipFlexorWeight: 0.02, musclestoReduce: ['Hamstrings', 'Glutes'] },
];

let updatedCount = 0;
let notFoundCount = 0;

exercises.forEach((exercise, index) => {
  const updateConfig = exercisesToUpdate.find(u => u.name === exercise.name);
  
  if (updateConfig) {
    // Check if hip flexor already exists
    if (exercise.muscles['Hip Flexors']) {
      console.log(`⚠️  ${exercise.name} already has Hip Flexors (${exercise.muscles['Hip Flexors']}), skipping`);
      return;
    }
    
    // Add hip flexor weighting
    const hipFlexorWeight = updateConfig.hipFlexorWeight;
    exercise.muscles['Hip Flexors'] = hipFlexorWeight;
    
    // Proportionally reduce muscles to maintain sum of 1.000
    const musclesToReduce = updateConfig.musclestoReduce.filter(m => exercise.muscles[m]);
    if (musclesToReduce.length === 0) {
      console.log(`⚠️  ${exercise.name} - no muscles found to reduce: ${updateConfig.musclestoReduce.join(', ')}`);
      delete exercise.muscles['Hip Flexors'];
      return;
    }
    
    // Calculate total weight of muscles to reduce
    let totalToReduce = 0;
    musclesToReduce.forEach(muscle => {
      totalToReduce += exercise.muscles[muscle];
    });
    
    // Reduce each muscle proportionally
    const reductionFactor = (totalToReduce - hipFlexorWeight) / totalToReduce;
    musclesToReduce.forEach(muscle => {
      exercise.muscles[muscle] = parseFloat((exercise.muscles[muscle] * reductionFactor).toFixed(4));
    });
    
    updatedCount++;
    console.log(`✓ ${exercise.name} - added Hip Flexors: ${hipFlexorWeight}`);
  }
});

// Verify all exercises sum to 1.000
let sumErrors = 0;
exercises.forEach((exercise) => {
  const sum = Object.values(exercise.muscles).reduce((a, b) => a + b, 0);
  const roundedSum = parseFloat(sum.toFixed(4));
  
  if (roundedSum !== 1.0) {
    console.log(`❌ ${exercise.name}: sum = ${roundedSum} (error: ${(roundedSum - 1.0).toFixed(6)})`);
    sumErrors++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`✓ Updated: ${updatedCount} exercises`);
console.log(`⚠️  Not found: ${exercisesToUpdate.length - updatedCount} exercises`);
console.log(`❌ Sum errors: ${sumErrors} exercises`);

if (sumErrors === 0) {
  // Write back to file
  fs.writeFileSync(exercisesPath, JSON.stringify(exercises, null, 2));
  console.log(`\n✅ exercises.json updated successfully!`);
} else {
  console.log(`\n⚠️  Fix sum errors before writing to file`);
}
