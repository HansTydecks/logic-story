// Test the score system functionality
console.log("=== Testing Ship Damage Score System ===");

// Create a test instance (simplified)
class TestScoreSystem {
    constructor() {
        this.shipDamageScore = 100;
        this.consecutiveWrongAnswers = 0;
    }

    updateScoreOnWrongAnswer() {
        this.consecutiveWrongAnswers++;
        
        if (this.consecutiveWrongAnswers === 1) {
            this.shipDamageScore = Math.max(0, this.shipDamageScore - 1);
        } else {
            this.shipDamageScore = Math.max(0, this.shipDamageScore - 2);
        }
        console.log(`Wrong answer ${this.consecutiveWrongAnswers}: Score now ${this.shipDamageScore}`);
    }

    resetConsecutiveWrongAnswers() {
        this.consecutiveWrongAnswers = 0;
        console.log("Correct answer! Reset consecutive wrong answers.");
    }

    getScoreStatus() {
        if (this.shipDamageScore >= 80) return "Excellent";
        if (this.shipDamageScore >= 60) return "Good";  
        if (this.shipDamageScore >= 40) return "Warning";
        if (this.shipDamageScore >= 20) return "Danger";
        return "Critical";
    }
}

// Test the scoring system
const test = new TestScoreSystem();

console.log(`Initial score: ${test.shipDamageScore} - Status: ${test.getScoreStatus()}`);

// Simulate wrong answers
test.updateScoreOnWrongAnswer(); // First wrong: -1 (score: 99)
test.updateScoreOnWrongAnswer(); // Second wrong: -2 (score: 97) 
test.updateScoreOnWrongAnswer(); // Third wrong: -2 (score: 95)

console.log(`After 3 wrong answers: ${test.shipDamageScore} - Status: ${test.getScoreStatus()}`);

// Correct answer resets the penalty
test.resetConsecutiveWrongAnswers();

// Wrong answer starts over at -1
test.updateScoreOnWrongAnswer(); // Back to -1 penalty (score: 94)

console.log(`After correct then wrong: ${test.shipDamageScore} - Status: ${test.getScoreStatus()}`);

console.log("=== Score System Test Complete ===");