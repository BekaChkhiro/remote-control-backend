import robot from 'robotjs';

console.log('Testing RobotJS...');

// Get screen size
const screenSize = robot.getScreenSize();
console.log('Screen size:', screenSize);

// Get current mouse position
const mousePos = robot.getMousePos();
console.log('Current mouse position:', mousePos);

// Move mouse to center
const centerX = screenSize.width / 2;
const centerY = screenSize.height / 2;
console.log(`Moving mouse to center (${centerX}, ${centerY})...`);
robot.moveMouse(centerX, centerY);

// Move in a square pattern
console.log('Moving mouse in square pattern...');
setTimeout(() => {
  robot.moveMouse(centerX + 100, centerY);
  setTimeout(() => {
    robot.moveMouse(centerX + 100, centerY + 100);
    setTimeout(() => {
      robot.moveMouse(centerX, centerY + 100);
      setTimeout(() => {
        robot.moveMouse(centerX, centerY);
        console.log('Test complete!');
      }, 500);
    }, 500);
  }, 500);
}, 1000);