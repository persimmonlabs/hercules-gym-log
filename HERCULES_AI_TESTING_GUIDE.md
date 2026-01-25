# Hercules AI Battle Testing Prompts

Comprehensive test suite to thoroughly evaluate the updated Hercules AI feature. Use these prompts to test functionality, edge cases, error handling, and push the boundaries of the system.

---

## 🏋️ **Basic Workout Creation**
1. "Create a push day workout for me"
2. "I want a leg day with 5 exercises"
3. "Make me a full body workout"
4. "Create an upper body workout focusing on back and biceps"
5. "Build a shoulder and triceps workout"

**Follow-ups:**
- "Add more exercises to this workout"
- "Replace the bench press with something else"
- "Make it harder"
- "Remove the last exercise"

---

## 📅 **Program & Schedule Creation**
1. "Create a 3-day push pull legs program"
2. "I want a 5-day bodybuilding split"
3. "Make me a 4-week strength program"
4. "Create a beginner full body program for 3 days a week"
5. "Build an upper/lower split that runs twice a week"

**Follow-ups:**
- "Schedule this program starting Monday"
- "Change the program to 4 days instead"
- "Add a rest day between workouts"
- "Make week 3 a deload week"

---

## 🎯 **Specific Muscle Group Focus**
1. "I want to focus on chest and triceps today"
2. "Create a workout targeting my weak points - rear delts and calves"
3. "Build a leg workout emphasizing quads over hamstrings"
4. "I need more back width, help me with a workout"
5. "Create an arm day with equal biceps and triceps volume"

**Follow-ups:**
- "Add one more exercise for lateral delts"
- "Replace all barbell movements with dumbbells"
- "I don't have access to cables, swap those exercises"

---

## 📊 **Volume & Intensity Adjustments**
1. "Create a high volume chest workout with 20+ sets"
2. "I want a low volume full body workout, just 1-2 exercises per muscle"
3. "Build a strength-focused workout with heavy compounds"
4. "Make me a hypertrophy workout with moderate weight and high reps"
5. "Create a workout with only 3 sets per exercise"

**Follow-ups:**
- "Increase the sets to 5 per exercise"
- "Change all rep ranges to 8-12"
- "Make this more strength-focused"

---

## ⏱️ **Time-Based Constraints**
1. "I only have 30 minutes, create a quick workout"
2. "Build a 90-minute leg day"
3. "I have 45 minutes for upper body, what should I do?"
4. "Create a 20-minute HIIT-style workout"

**Follow-ups:**
- "That's too long, cut it down"
- "Add 2 more exercises but keep it under 45 minutes"

---

## 🏠 **Equipment Constraints**
1. "Create a home workout with just dumbbells"
2. "I only have a barbell and bench, make me a workout"
3. "Build a bodyweight-only full body routine"
4. "I have access to a full gym, create an advanced chest workout"
5. "Make me a workout using only machines"

**Follow-ups:**
- "Replace all dumbbell exercises with barbell versions"
- "I actually don't have a bench, swap those exercises"
- "Add some cable work"

---

## 🔄 **Workout Modifications**
1. "I have a shoulder injury, create a push workout avoiding overhead pressing"
2. "My lower back is sore, give me a leg day that's easy on it"
3. "I want to train chest but my wrists hurt, what can I do?"
4. "Create a pull workout without deadlifts"

**Follow-ups:**
- "Actually, add deadlifts back in"
- "Replace all pressing with flies"
- "Make this more joint-friendly"

---

## 📈 **Progressive Overload & Periodization**
1. "Create a 4-week program with progressive overload built in"
2. "I want a program that increases volume each week"
3. "Build a strength program with wave loading"
4. "Create a program with a deload every 4th week"

**Follow-ups:**
- "Show me what week 3 looks like"
- "Change the progression scheme"
- "Add an extra deload week"

---

## 🎭 **Edge Cases & Boundary Testing**

### Ambiguous/Vague Requests
1. "Make me better"
2. "I want to get bigger"
3. "Help me with fitness"
4. "Create something"
5. "Workout"

### Conflicting Requirements
1. "Create a 10-minute workout with 15 exercises"
2. "I want high volume but only 3 exercises"
3. "Build a strength program with 20+ reps per set"
4. "Make a bodyweight workout using heavy barbells"

### Unrealistic Demands
1. "Create a workout with 50 sets for chest"
2. "I want to train 7 days a week with no rest"
3. "Build a program that targets every muscle in one workout"
4. "Give me a 3-hour workout"

### Invalid/Nonsensical
1. "Create a workout for my pet hamster"
2. "Make me a program using invisible weights"
3. "I want to train my eyebrows"
4. "Build a workout on Mars"

---

## 🔍 **Context & History Testing**
1. "Create a chest workout" → "Now create a back workout" → "Combine both into one workout"
2. "Make a push day" → "Actually, make it a pull day instead"
3. "Create a program" → "Add cardio to it" → "Remove all leg work" → "Actually, put the leg work back"
4. "Build a workout" → "Make it harder" → "No, make it easier" → "Go back to the hard version"

---

## 💬 **Conversational & Clarification**
1. "What exercises should I do for chest?"
2. "How many sets should I do per muscle group?"
3. "What's the difference between strength and hypertrophy training?"
4. "Should I train to failure?"
5. "How often should I train each muscle?"

**Follow-ups:**
- "Okay, create a workout based on that advice"
- "Apply that to a full program"

---

## 🚨 **Error Handling & Recovery**
1. Send incomplete message: "Create a workout for"
2. Send contradictory follow-up: "Create chest workout" → "Remove all chest exercises"
3. Rapid-fire requests: Send 5 different workout requests in a row
4. Cancel mid-action: Request workout, then immediately ask for something else
5. "Ignore my last request and create something different"

---

## 🎯 **Multi-Action Sequences**
1. "Create a push workout, a pull workout, and a leg workout, then combine them into a program"
2. "Build a 4-day program and schedule it starting next Monday"
3. "Create 3 different chest workouts and tell me which one is best for hypertrophy"
4. "Make a workout, then create a program based on it, then schedule that program"

---

## 🔄 **Session Management Testing**
1. "Log today's workout: bench press 225x8, 225x7, 225x6"
2. "I just finished my push workout, log it"
3. "Add a workout session for yesterday"
4. "Delete my last workout"
5. "Edit my workout from Monday - I actually did 4 sets instead of 3"

**Follow-ups:**
- "Show me my workout history"
- "What was my volume this week?"
- "Did I hit my chest twice this week?"

---

## 🧪 **Stress Testing**
1. Send extremely long prompt (500+ words describing exact workout needs)
2. Request workout with 20+ specific exercises by name
3. "Create a 12-week program with different workouts each week"
4. Rapid context switching: "Chest workout" → "No, legs" → "Actually arms" → "Back instead"
5. Request same workout 5 times in a row with slight variations

---

## ✅ **Expected Success Cases**
- Simple, clear requests should work smoothly
- Follow-up modifications should maintain context
- Equipment constraints should be respected
- Muscle group targeting should be accurate
- Volume/intensity adjustments should be logical

## ❌ **Expected Graceful Failures**
- Nonsensical requests should get clarification prompts
- Conflicting requirements should trigger AI to ask for priority
- Unrealistic demands should get reasonable alternatives
- Invalid inputs should be caught with helpful error messages

---

## 📋 **Testing Strategy**

1. **Start with basic prompts** to confirm core functionality
2. **Progress to complex multi-step requests** to test context retention
3. **Test edge cases and boundaries** to find breaking points
4. **Try to break it** with conflicting/impossible requests
5. **Evaluate context retention** across conversation threads
6. **Check action approval/rejection flow** for all action types
7. **Verify store hydration** after actions execute (check if data appears in UI)
8. **Test error recovery** - does the AI handle failures gracefully?
9. **Validate data persistence** - do created workouts/programs/schedules persist after app restart?
10. **Check premium gating** - ensure free users see appropriate limits/prompts

---

## 🐛 **Bug Tracking Template**

When you find issues, document them using this format:

```
**Issue:** [Brief description]
**Prompt:** [Exact prompt that caused the issue]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Severity:** [Critical/High/Medium/Low]
**Reproducible:** [Yes/No]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]
```

---

## 📊 **Success Metrics to Track**

- **Response time:** How long does the AI take to respond?
- **Action success rate:** What % of actions execute successfully?
- **Context retention:** Does the AI remember previous messages?
- **Error handling:** Are errors communicated clearly?
- **Data accuracy:** Are created workouts/programs correct?
- **User experience:** Is the flow intuitive and smooth?

---

**Last Updated:** January 21, 2026
