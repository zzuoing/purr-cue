import { createScenes } from './scenes.js';
import { Graphics } from './graphics.js';

export function walkingX(frame) {
  let x = -150;
  for (let i = 0; i < frame; i++) x = Math.fround(x + Math.fround(3.2));
  return x;
}

export function drawScene(canvas, scene, frame, width, height = 250) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, width, height);
  const g = new Graphics(c);
  const s = createScenes({ Width: width, Height: height });
  if (scene === 'Walking') {
    const animalX = walkingX(frame);
    s.DrawWalkingBackground(g, width, height, frame);
    s.DrawWalkingCat(g, animalX, 135, frame * 0.48);
    s.DrawWalkingMusicNotes(g, animalX, frame);
  } else if (scene === 'Window') s.DrawAnimatedWindowScene(g, frame);
  else if (scene === 'Water') s.DrawAnimatedWaterScene(g, frame);
  else if (scene === 'Eating') s.DrawEatingScene(g, frame);
  else if (scene === 'WorkStart' || scene === 'PackUp') s.DrawOfficeScene(g, frame, scene === 'WorkStart');
  else if (scene === 'Toilet') s.DrawToiletScene(g, frame);
  else {
    c.save(); c.translate(width / 2 - 82, 142); c.scale(1.15, 1.15);
    s.DrawCat(g, 0, 0, false, frame); c.restore();
  }
}
