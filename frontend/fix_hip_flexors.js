const fs = require('fs');
const path = require('path');

// Read exercises.json
const exercisesPath = path.join(__dirname, 'src/data/exercises.json');
const exercises = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'));

// Define exercises that should have hip flexor weightings added
const exercisesToUpdate = [
  { name: 'Leg Press', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes', 'Hamstrings'] },
  { name: 'V-Squat Machine', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Hack Squat Machine', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Leg Extensions', hipFlexorWeight: 0.03, musclestoReduce: ['Quads'] },
  { name: 'Seated Leg Curl', hipFlexorWeight: 0.01, musclestoReduce: ['Hamstrings'] },
  { name: 'Lying Leg Curl', hipFlexorWeight: 0.01, musclestoReduce: ['Hamstrings'] },
  { name: 'Barbell Squat', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Dumbbell Squat', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Goblet Squat', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Smith Machine Squat', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Dumbbell Step-ups', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Barbell Step-ups', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Box Jumps', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes', 'Calves'] },
  { name: 'Standing Calf Raise Machine', hipFlexorWeight: 0.01, musclestoReduce: ['Calves - Medial Head', 'Calves - Lateral Head'] },
  { name: 'Seated Calf Raises', hipFlexorWeight: 0.01, musclestoReduce: ['Soleus'] },
  { name: 'Dumbbell Calf Raises', hipFlexorWeight: 0.01, musclestoReduce: ['Calves - Medial Head', 'Calves - Lateral Head'] },
  { name: 'Barbell Hip Thrust', hipFlexorWeight: 0.02, musclestoReduce: ['Glutes', 'Hamstrings'] },
  { name: 'Dumbbell Hip Thrust', hipFlexorWeight: 0.02, musclestoReduce: ['Glutes', 'Hamstrings'] },
  { name: 'Barbell Glute Bridge', hipFlexorWeight: 0.02, musclestoReduce: ['Glutes', 'Hamstrings'] },
  { name: 'Plank', hipFlexorWeight: 0.02, musclestoReduce: ['Upper Abs', 'Lower Abs'] },
  { name: 'Side Plank', hipFlexorWeight: 0.02, musclestoReduce: ['Obliques'] },
  { name: 'Barbell Clean', hipFlexorWeight: 0.01, musclestoReduce: ['Quads', 'Glutes', 'Hamstrings'] },
  { name: 'Barbell Clean and Jerk', hipFlexorWeight: 0.01, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Barbell Snatch', hipFlexorWeight: 0.01, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Dumbbell Snatch', hipFlexorWeight: 0.01, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Farmer Carries', hipFlexorWeight: 0.01, musclestoReduce: ['Traps', 'Forearms'] },
  { name: 'Sled Push', hipFlexorWeight: 0.02, musclestoReduce: ['Quads', 'Glutes'] },
  { name: 'Sled Pull', hipFlexorWeight: 0.02, musclestoReduce: ['Hamstrings', 'Glutes'] },
];

let updatedCount = 0;

exercises.forEach((exercise) => {
  const updateConfig = exercisesToUpdate.find(u => u.name === exercise.name);
  
  if (updateConfig && !exercise.muscles['Hip Flexors']) {
    const hipFlexorWeight = updateConfig.hipFlexorWeight;
    exercise.muscles['Hip Flexors'] = hipFlexorWeight;
    
    // Proportionally reduce muscles
    const musclesToReduce = updateConfig.musclestoReduce.filter(m => exercise.muscles[m]);
    if (musclesToReduce.length > 0) {
      let totalToReduce = 0;
      musclesToReduce.forEach(muscle => {
        totalToReduce += exercise.muscles[muscle];
      });
      
      const reductionFactor = (totalToReduce - hipFlexorWeight) / totalToReduce;
      musclesToReduce.forEach(muscle => {
        exercise.muscles[muscle] = parseFloat((exercise.muscles[muscle] * reductionFactor).toFixed(4));
      });
      
      updatedCount++;
    }
  }
});

// Fix all sum errors by adjusting largest muscle in each exercise
exercises.forEach((exercise) => {
  const sum = Object.values(exercise.muscles).reduce((a, b) => a + b, 0);
  const roundedSum = parseFloat(sum.toFixed(4));
  
  if (roundedSum !== 1.0) {
    const error = 1.0 - roundedSum;
    
    // Find the largest muscle and adjust it
    let largestMuscle = null;
    let largestValue = 0;
    
    Object.entries(exercise.muscles).forEach(([muscle, value]) => {
      if (value > largestValue) {
        largestValue = value;
        largestMuscle = muscle;
      }
    });
    
    if (largestMuscle) {
      exercise.muscles[largestMuscle] = parseFloat((exercise.muscles[largestMuscle] + error).toFixed(4));
    }
  }
});

// Final verification
let sumErrors = 0;
exercises.forEach((exercise) => {
  const sum = Object.values(exercise.muscles).reduce((a, b) => a + b, 0);
  const roundedSum = parseFloat(sum.toFixed(4));
  
  if (roundedSum !== 1.0) {
    console.log(`❌ ${exercise.name}: sum = ${roundedSum}`);
    sumErrors++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`✓ Added Hip Flexors to: ${updatedCount} exercises`);
console.log(`✓ Fixed sum errors: ${exercises.length - sumErrors} exercises verified`);
console.log(`❌ Remaining sum errors: ${sumErrors}`);

if (sumErrors === 0) {
  fs.writeFileSync(exercisesPath, JSON.stringify(exercises, null, 2));
  console.log(`\n✅ exercises.json updated successfully!`);
} else {
  console.log(`\n⚠️  ${sumErrors} exercises still have sum errors`);
}
